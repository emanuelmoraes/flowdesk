import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { getAppUrl, getStripe } from '@/lib/billing';
import { captureApiException } from '@/lib/sentry';

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

export async function POST(request: NextRequest): Promise<NextResponse> {
  let userId: string | undefined;

  try {
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    userId = decoded.uid;
    const userRef = adminDb.collection('users').doc(decoded.uid);
    const userSnapshot = await userRef.get();
    const userData = userSnapshot.exists ? userSnapshot.data() : undefined;
    const safeUserData = isRecord(userData) ? userData : undefined;

    const stripeCustomerId =
      typeof safeUserData?.stripeCustomerId === 'string' ? safeUserData.stripeCustomerId : undefined;
    if (!stripeCustomerId) {
      return NextResponse.json({ error: 'Nenhuma assinatura encontrada para este usuário' }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${getAppUrl()}/planos`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    captureApiException(error, {
      route: '/api/billing/portal',
      method: 'POST',
      userId,
      fingerprint: ['api', 'billing', 'portal', 'post'],
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao abrir portal de cobrança' },
      { status: 500 }
    );
  }
}