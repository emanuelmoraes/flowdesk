import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { getPlanFromStripePriceId, getStripe } from '@/lib/billing';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring('Bearer '.length);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const userRef = adminDb.collection('users').doc(decoded.uid);
    const userSnapshot = await userRef.get();
    const userData = userSnapshot.exists ? userSnapshot.data() : undefined;
    const safeUserData = isRecord(userData) ? userData : undefined;
    const stripeCustomerId =
      typeof safeUserData?.stripeCustomerId === 'string' ? safeUserData.stripeCustomerId : undefined;

    if (!stripeCustomerId) {
      return NextResponse.json({
        subscription: null,
        invoices: [],
      });
    }

    const stripe = getStripe();
    const [subscriptionsResponse, invoicesResponse] = await Promise.all([
      stripe.subscriptions.list({ customer: stripeCustomerId, status: 'all', limit: 1 }),
      stripe.invoices.list({ customer: stripeCustomerId, limit: 20 }),
    ]);

    const subscription = subscriptionsResponse.data[0] || null;
    const firstSubscriptionItem = subscription?.items.data[0];
    const priceId = firstSubscriptionItem?.price?.id;
    const mappedPlan = priceId ? getPlanFromStripePriceId(priceId) : null;

    return NextResponse.json({
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            currentPeriodEnd: firstSubscriptionItem?.current_period_end || null,
            plan: mappedPlan,
          }
        : null,
      invoices: invoicesResponse.data.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        amountPaid: invoice.amount_paid,
        amountDue: invoice.amount_due,
        currency: invoice.currency,
        created: invoice.created,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao carregar histórico de cobrança' },
      { status: 500 }
    );
  }
}