import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { recordServerAuditTrail } from '@/lib/auditServer';
import { trackServerBusinessEvent } from '@/lib/businessEventsServer';
import { adminDb } from '@/lib/firebaseAdmin';
import { getPlanFromStripePriceId, getStripe } from '@/lib/billing';

async function resolveUserIdByCustomerId(customerId: string): Promise<string | null> {
  const userSnapshot = await adminDb
    .collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();

  if (userSnapshot.empty) {
    return null;
  }

  return userSnapshot.docs[0].id;
}

async function handleCheckoutCompleted(event: Stripe.CheckoutSessionCompletedEvent): Promise<void> {
  const session = event.data.object;
  const customerId = typeof session.customer === 'string' ? session.customer : null;
  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null;
  const uid = session.metadata?.uid || session.client_reference_id || null;
  const planId = session.metadata?.planId;

  if (!uid || !customerId) {
    return;
  }

  await adminDb.collection('users').doc(uid).set(
    {
      stripeCustomerId: customerId,
      subscriptionId,
      plan: planId === 'pro' || planId === 'team' ? planId : 'free',
      subscriptionStatus: 'active',
      updatedAt: new Date(),
    },
    { merge: true }
  );

  await recordServerAuditTrail({
    actorId: uid,
    action: 'billing.checkout.completed',
    resourceType: 'billing',
    resourceId: subscriptionId || customerId,
    targetUserId: uid,
    metadata: {
      customerId,
      subscriptionId,
      planId,
    },
    page: 'api_billing_webhook',
  });

  await trackServerBusinessEvent({
    eventName: 'conversion_subscription_checkout_completed',
    category: 'conversion',
    userId: uid,
    workspaceId: uid,
    metadata: {
      customerId,
      subscriptionId,
      planId,
    },
  });
}

async function handleSubscriptionUpdated(
  event: Stripe.CustomerSubscriptionUpdatedEvent | Stripe.CustomerSubscriptionDeletedEvent
): Promise<void> {
  const subscription = event.data.object;
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : null;
  if (!customerId) {
    return;
  }

  const uid = await resolveUserIdByCustomerId(customerId);
  if (!uid) {
    return;
  }

  const firstItem = subscription.items.data[0];
  const priceId = firstItem?.price?.id;
  const mappedPlan = priceId ? getPlanFromStripePriceId(priceId) : null;
  const periodEndUnix = firstItem?.current_period_end;

  await adminDb.collection('users').doc(uid).set(
    {
      plan: mappedPlan || 'free',
      subscriptionStatus: subscription.status,
      subscriptionId: subscription.id,
      subscriptionCurrentPeriodEnd: periodEndUnix ? new Date(periodEndUnix * 1000) : null,
      updatedAt: new Date(),
    },
    { merge: true }
  );

  await recordServerAuditTrail({
    actorId: uid,
    action:
      event.type === 'customer.subscription.deleted'
        ? 'billing.subscription.deleted'
        : 'billing.subscription.updated',
    resourceType: 'billing',
    resourceId: subscription.id,
    targetUserId: uid,
    metadata: {
      customerId,
      status: subscription.status,
      mappedPlan,
      priceId,
      periodEndUnix,
    },
    page: 'api_billing_webhook',
  });
}

const isCheckoutCompletedEvent = (event: Stripe.Event): event is Stripe.CheckoutSessionCompletedEvent => {
  return event.type === 'checkout.session.completed';
};

const isSubscriptionUpdatedEvent = (event: Stripe.Event): event is Stripe.CustomerSubscriptionUpdatedEvent => {
  return event.type === 'customer.subscription.updated';
};

const isSubscriptionDeletedEvent = (event: Stripe.Event): event is Stripe.CustomerSubscriptionDeletedEvent => {
  return event.type === 'customer.subscription.deleted';
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Assinatura do webhook ausente' }, { status: 400 });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json({ error: 'Webhook secret não configurado' }, { status: 500 });
    }

    const payload = await request.text();
    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    if (isCheckoutCompletedEvent(event)) {
      await handleCheckoutCompleted(event);
    } else if (isSubscriptionUpdatedEvent(event) || isSubscriptionDeletedEvent(event)) {
      await handleSubscriptionUpdated(event);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao processar webhook' },
      { status: 400 }
    );
  }
}