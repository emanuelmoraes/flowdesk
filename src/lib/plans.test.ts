import { describe, expect, it } from 'vitest';
import {
  PLAN_CATALOG,
  PLAN_LIST,
  canAddMember,
  canCreateProject,
  canCreateTicket,
  formatPlanPriceBRL,
  getPlan,
} from './plans';

describe('plans', () => {
  it('mantém catálogo com planos Free, Pro e Team', () => {
    expect(PLAN_LIST.map((plan) => plan.id)).toEqual(['free', 'pro', 'team']);
    expect(PLAN_CATALOG.team.name).toBe('Team');
  });

  it('faz fallback para Free quando plano é inválido', () => {
    expect(getPlan('invalid-plan').id).toBe('free');
  });

  it('formata preço em BRL corretamente', () => {
    expect(formatPlanPriceBRL(0)).toBe('R$ 0');
    expect(formatPlanPriceBRL(2900)).toContain('29');
  });

  it('aplica limites de criação no plano Free', () => {
    expect(canCreateProject('free', 2)).toBe(true);
    expect(canCreateProject('free', 3)).toBe(false);

    expect(canCreateTicket('free', 49)).toBe(true);
    expect(canCreateTicket('free', 50)).toBe(false);

    expect(canAddMember('free', 0)).toBe(true);
    expect(canAddMember('free', 1)).toBe(false);
  });

  it('permite limites ilimitados conforme plano', () => {
    expect(canCreateProject('pro', 999)).toBe(true);
    expect(canCreateTicket('pro', 9999)).toBe(true);
    expect(canAddMember('team', 999)).toBe(true);
    expect(canAddMember('pro', 5)).toBe(false);
  });
});