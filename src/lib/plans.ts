import { PlanDefinition, SubscriptionPlanId } from '@/types';

export const DEFAULT_SUBSCRIPTION_PLAN: SubscriptionPlanId = 'free';

export const PLAN_CATALOG: Record<SubscriptionPlanId, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    monthlyPriceInCents: 0,
    description: 'Para uso individual e primeiros projetos.',
    features: ['3 projetos', '50 tickets por projeto', '1 membro por projeto'],
    limits: {
      projects: 3,
      ticketsPerProject: 50,
      membersPerProject: 1,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    monthlyPriceInCents: 2900,
    highlighted: true,
    description: 'Para profissionais que precisam escalar com agilidade.',
    features: ['Projetos ilimitados', 'Tickets ilimitados', '5 membros por projeto', 'Suporte prioritário'],
    limits: {
      projects: 'unlimited',
      ticketsPerProject: 'unlimited',
      membersPerProject: 5,
    },
  },
  team: {
    id: 'team',
    name: 'Team',
    monthlyPriceInCents: 7900,
    description: 'Para times com colaboração avançada e maior escala.',
    features: ['Tudo do Pro', 'Membros ilimitados', 'Relatórios avançados', 'API de integração'],
    limits: {
      projects: 'unlimited',
      ticketsPerProject: 'unlimited',
      membersPerProject: 'unlimited',
    },
  },
};

export const PLAN_LIST: PlanDefinition[] = [
  PLAN_CATALOG.free,
  PLAN_CATALOG.pro,
  PLAN_CATALOG.team,
];

export function getPlan(planId?: string): PlanDefinition {
  if (planId === 'free' || planId === 'pro' || planId === 'team') {
    return PLAN_CATALOG[planId];
  }

  return PLAN_CATALOG[DEFAULT_SUBSCRIPTION_PLAN];
}

export function formatPlanPriceBRL(monthlyPriceInCents: number): string {
  if (monthlyPriceInCents === 0) {
    return 'R$ 0';
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(monthlyPriceInCents / 100);
}

function isWithinLimit(limit: number | 'unlimited', currentCount: number): boolean {
  if (limit === 'unlimited') {
    return true;
  }

  return currentCount < limit;
}

export function canCreateProject(planId: string | undefined, currentProjectsCount: number): boolean {
  const plan = getPlan(planId);
  return isWithinLimit(plan.limits.projects, currentProjectsCount);
}

export function canCreateTicket(planId: string | undefined, currentTicketsInProjectCount: number): boolean {
  const plan = getPlan(planId);
  return isWithinLimit(plan.limits.ticketsPerProject, currentTicketsInProjectCount);
}

export function canAddMember(planId: string | undefined, currentMembersCount: number): boolean {
  const plan = getPlan(planId);
  return isWithinLimit(plan.limits.membersPerProject, currentMembersCount);
}