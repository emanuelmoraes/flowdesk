import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  signInWithEmailAndPasswordMock: vi.fn(),
  onAuthStateChangedMock: vi.fn(),
  getDocMock: vi.fn(),
  setDocMock: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  auth: {},
  db: {},
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: authMocks.signInWithEmailAndPasswordMock,
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: authMocks.onAuthStateChangedMock,
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  getDoc: authMocks.getDocMock,
  setDoc: authMocks.setDocMock,
  serverTimestamp: vi.fn(() => 'server-timestamp'),
}));

import { useAuth } from './useAuth';

describe('useAuth', () => {
  const firebaseUserMock = {
    uid: 'u-1',
    email: 'teste@flowdesk.com',
    displayName: 'Teste',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    authMocks.onAuthStateChangedMock.mockImplementation((_, callback) => {
      callback(null);
      return vi.fn();
    });

    authMocks.getDocMock.mockResolvedValue({
      exists: () => false,
      data: () => ({}),
    });

    authMocks.setDocMock.mockResolvedValue(undefined);
  });

  it('realiza login com sucesso', async () => {
    authMocks.signInWithEmailAndPasswordMock.mockResolvedValue({ user: { uid: 'u-1' } });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let ok = false;
    await act(async () => {
      ok = await result.current.signIn('teste@flowdesk.com', '123456');
    });

    expect(ok).toBe(true);
    expect(authMocks.signInWithEmailAndPasswordMock).toHaveBeenCalledWith({}, 'teste@flowdesk.com', '123456');
    expect(result.current.error).toBeNull();
  });

  it('retorna mensagem amigável em erro de credencial inválida', async () => {
    authMocks.signInWithEmailAndPasswordMock.mockRejectedValue({ code: 'auth/invalid-credential' });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let ok = true;
    await act(async () => {
      ok = await result.current.signIn('teste@flowdesk.com', 'senha-errada');
    });

    expect(ok).toBe(false);
    expect(result.current.error).toBe('Credenciais inválidas.');
  });

  it('aplica permissões de manager ao carregar perfil', async () => {
    authMocks.onAuthStateChangedMock.mockImplementation((_, callback) => {
      callback(firebaseUserMock);
      return vi.fn();
    });

    authMocks.getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({
        displayName: 'Gestor',
        role: 'manager',
        createdAt: { toDate: () => new Date('2026-01-01T00:00:00.000Z') },
        lastLogin: { toDate: () => new Date('2026-02-01T00:00:00.000Z') },
      }),
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.userProfile?.role).toBe('manager');
    });

    expect(result.current.isManager).toBe(true);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.hasPermission('canManageAllProjects')).toBe(true);
    expect(result.current.hasPermission('canManageUsers')).toBe(false);
  });

  it('faz fallback para permissões de user quando role é inválido no perfil', async () => {
    authMocks.onAuthStateChangedMock.mockImplementation((_, callback) => {
      callback(firebaseUserMock);
      return vi.fn();
    });

    authMocks.getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({
        displayName: 'Perfil Inválido',
        role: 'guest',
      }),
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.userProfile?.role).toBe('user');
    });

    expect(result.current.hasPermission('canManageAllProjects')).toBe(false);
    expect(result.current.hasPermission('canDeleteProjects')).toBe(false);
    expect(result.current.hasPermission('canManageUsers')).toBe(false);
  });
});