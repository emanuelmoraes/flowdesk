import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { getAppUrl, getStripe, getStripePriceIdForPlan } from '@/lib/billing';
import { SubscriptionPlanId } from '@/types';

type CheckoutBody = {
  planId: Extract<SubscriptionPlanId, 'pro' | 'team'>;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const parseCheckoutBody = (value: unknown): CheckoutBody | null => {
  if (!isRecord(value)) {
    return null;
  }

  const planId = value.planId;
  if (planId !== 'pro' && planId !== 'team') {
    return null;
  }

  return { planId };
};

function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring('Bearer '.length);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const rawBody: unknown = await request.json();
    const body = parseCheckoutBody(rawBody);

    if (!body) {
      return NextResponse.json({ error: 'Plano inválido para checkout' }, { status: 400 });
    }

    const { planId } = body;

    const stripe = getStripe();
    const userRef = adminDb.collection('users').doc(decoded.uid);
    const userSnapshot = await userRef.get();
    const userData = userSnapshot.exists ? userSnapshot.data() : undefined;
    const safeUserData = isRecord(userData) ? userData : undefined;

    const customerEmail = decoded.email || (typeof safeUserData?.email === 'string' ? safeUserData.email : undefined);
    let stripeCustomerId =
      typeof safeUserData?.stripeCustomerId === 'string' ? safeUserData.stripeCustomerId : undefined;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: customerEmail,
        metadata: {
          uid: decoded.uid,
        },
      });
      stripeCustomerId = customer.id;
      await userRef.set({ stripeCustomerId }, { merge: true });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [
        {
          price: getStripePriceIdForPlan(planId),
          quantity: 1,
        },
      ],
      success_url: `${getAppUrl()}/planos?checkout=success`,
      cancel_url: `${getAppUrl()}/planos?checkout=canceled`,
      allow_promotion_codes: true,
      client_reference_id: decoded.uid,
      metadata: {
        uid: decoded.uid,
        planId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao iniciar checkout' },
      { status: 500 }
    );
  }
}