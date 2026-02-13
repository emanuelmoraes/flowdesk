import { describe, expect, it } from 'vitest';
import { DEFAULT_USER_ROLE, getRolePermissions, isValidRole } from './index';

describe('roles e permissões', () => {
  it('deve manter user como role padrão', () => {
    expect(DEFAULT_USER_ROLE).toBe('user');
  });

  it('deve validar roles permitidos', () => {
    expect(isValidRole('user')).toBe(true);
    expect(isValidRole('manager')).toBe(true);
    expect(isValidRole('admin')).toBe(true);
    expect(isValidRole('guest')).toBe(false);
  });

  it('deve aplicar fallback para permissões de user quando role for inválido', () => {
    const permissions = getRolePermissions('invalid-role');
    expect(permissions.canManageUsers).toBe(false);
    expect(permissions.canManageAllProjects).toBe(false);
    expect(permissions.canDeleteProjects).toBe(false);
  });

  it('deve retornar permissões elevadas para admin', () => {
    const permissions = getRolePermissions('admin');
    expect(permissions.canManageUsers).toBe(true);
    expect(permissions.canManageAllProjects).toBe(true);
    expect(permissions.canDeleteProjects).toBe(true);
  });
});
