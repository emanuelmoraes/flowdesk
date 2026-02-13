type ErrorWithCode = {
  code?: string;
  message?: string;
};

const isErrorWithCode = (value: unknown): value is ErrorWithCode => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const code = Reflect.get(value, 'code');
  const message = Reflect.get(value, 'message');
  const hasCode = code === undefined || typeof code === 'string';
  const hasMessage = message === undefined || typeof message === 'string';

  return hasCode && hasMessage;
};

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'Email inválido.',
  'auth/user-disabled': 'Esta conta foi desativada.',
  'auth/user-not-found': 'Usuário não encontrado.',
  'auth/wrong-password': 'Senha incorreta.',
  'auth/invalid-credential': 'Credenciais inválidas.',
  'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
  'auth/email-already-in-use': 'Este email já está em uso.',
  'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
  'auth/operation-not-allowed': 'Operação não permitida. Contate o administrador.',
};

export const DEFAULT_USER_ERROR_MESSAGE = 'Erro ao processar. Tente novamente.';

export function getAuthErrorMessage(error: unknown): string {
  if (isErrorWithCode(error) && error.code && AUTH_ERROR_MESSAGES[error.code]) {
    return AUTH_ERROR_MESSAGES[error.code];
  }

  return DEFAULT_USER_ERROR_MESSAGE;
}

export function getUserFacingErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (error == null) {
    return fallback;
  }

  if (isErrorWithCode(error) && error.message && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export function getErrorCode(error: unknown): string | undefined {
  if (!isErrorWithCode(error)) {
    return undefined;
  }

  return error.code;
}