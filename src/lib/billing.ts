import Stripe from 'stripe';
import { SubscriptionPlanId } from '@/types';

let stripeClient: Stripe | null = null;

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }

  return value;
}

export function getStripe(): Stripe {
  if (stripeClient) {
    return stripeClient;
  }

  stripeClient = new Stripe(getRequiredEnv('STRIPE_SECRET_KEY'));
  return stripeClient;
}

const BILLING_PRICE_BY_PLAN: Partial<Record<SubscriptionPlanId, string>> = {
  pro: process.env.STRIPE_PRICE_PRO_MONTHLY,
  team: process.env.STRIPE_PRICE_TEAM_MONTHLY,
};

export function getStripePriceIdForPlan(planId: SubscriptionPlanId): string {
  if (planId === 'free') {
    throw new Error('Plano Free não possui cobrança recorrente');
  }

  const priceId = BILLING_PRICE_BY_PLAN[planId];
  if (!priceId) {
    throw new Error(`Preço Stripe não configurado para plano ${planId}`);
  }

  return priceId;
}

export function getPlanFromStripePriceId(priceId: string): SubscriptionPlanId | null {
  if (priceId === BILLING_PRICE_BY_PLAN.pro) {
    return 'pro';
  }

  if (priceId === BILLING_PRICE_BY_PLAN.team) {
    return 'team';
  }

  return null;
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}