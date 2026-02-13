import { describe, expect, it } from 'vitest';
import {
  DEFAULT_USER_ERROR_MESSAGE,
  getAuthErrorMessage,
  getUserFacingErrorMessage,
} from './errorHandling';

describe('errorHandling', () => {
  it('traduz código de erro de auth conhecido', () => {
    const message = getAuthErrorMessage({ code: 'auth/invalid-credential' });
    expect(message).toBe('Credenciais inválidas.');
  });

  it('retorna mensagem padrão para código de auth desconhecido', () => {
    const message = getAuthErrorMessage({ code: 'auth/unknown' });
    expect(message).toBe(DEFAULT_USER_ERROR_MESSAGE);
  });

  it('prioriza mensagem explícita de Error para o usuário', () => {
    const message = getUserFacingErrorMessage(new Error('Falha ao salvar projeto'), 'Fallback');
    expect(message).toBe('Falha ao salvar projeto');
  });

  it('usa fallback quando erro não possui mensagem válida', () => {
    const message = getUserFacingErrorMessage(null, 'Erro padrão');
    expect(message).toBe('Erro padrão');
  });
});