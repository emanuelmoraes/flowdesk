import * as Sentry from '@sentry/nextjs';

const SENSITIVE_KEY_PATTERN = /(authorization|token|password|secret|cookie|signature)/i;

type SentryRuntime = 'client' | 'server' | 'edge';

type SentryApiContext = {
  route: string;
  method: string;
  userId?: string;
  projectId?: string;
  requestId?: string;
  tags?: Record<string, string | undefined>;
  fingerprint?: string[];
  metadata?: Record<string, unknown>;
};

type SentryLoggerContext = {
  message: string;
  userId?: string;
  action?: string;
  page?: string;
  metadata?: Record<string, unknown>;
};

type PlainObject = Record<string, unknown>;
type OwnershipArea = 'billing' | 'invitations' | 'projects' | 'auth' | 'platform';

const OWNER_TEAM_BY_AREA: Record<OwnershipArea, string> = {
  billing: 'growth',
  invitations: 'core-collaboration',
  projects: 'core-workspace',
  auth: 'core-auth',
  platform: 'platform',
};

const isRecord = (value: unknown): value is PlainObject => {
  return typeof value === 'object' && value !== null;
};

const getSentryEnvironment = (): string => {
  return process.env.SENTRY_ENVIRONMENT || process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';
};

const parseSampleRate = (rawValue: string | undefined, fallback: number): number => {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    return fallback;
  }

  return parsed;
};

const getDefaultSampleRate = (): number => {
  const environment = getSentryEnvironment();
  return environment === 'production' ? 0.1 : 0;
};

const getSentryDsn = (runtime: SentryRuntime): string | undefined => {
  if (runtime === 'client') {
    return process.env.NEXT_PUBLIC_SENTRY_DSN;
  }

  return process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
};

const inferOwnershipFromRoute = (route: string): OwnershipArea => {
  if (route.includes('/billing/')) {
    return 'billing';
  }

  if (route.includes('/invitations/')) {
    return 'invitations';
  }

  if (route.includes('/projects/') || route.includes('/projetos/')) {
    return 'projects';
  }

  if (route.includes('/auth/') || route.includes('/login/')) {
    return 'auth';
  }

  return 'platform';
};

const inferOwnershipFromLoggerContext = (action?: string, page?: string): OwnershipArea => {
  const normalizedAction = (action || '').toLowerCase();
  const normalizedPage = (page || '').toLowerCase();
  const combined = `${normalizedAction} ${normalizedPage}`;

  if (combined.includes('billing') || combined.includes('subscription') || combined.includes('checkout')) {
    return 'billing';
  }

  if (combined.includes('invite') || combined.includes('convite')) {
    return 'invitations';
  }

  if (combined.includes('project') || combined.includes('projeto') || combined.includes('ticket')) {
    return 'projects';
  }

  if (combined.includes('auth') || combined.includes('login') || combined.includes('senha')) {
    return 'auth';
  }

  return 'platform';
};

const setOwnershipTags = (scope: Sentry.Scope, area: OwnershipArea): void => {
  scope.setTag('owner_area', area);
  scope.setTag('owner_team', OWNER_TEAM_BY_AREA[area]);
};

const sanitizeValue = (value: unknown, depth = 0): unknown => {
  if (depth > 2) {
    return '[truncated]';
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue(item, depth + 1));
  }

  if (isRecord(value)) {
    const sanitized: PlainObject = {};
    const entries = Object.entries(value).slice(0, 30);

    for (const [key, entryValue] of entries) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        sanitized[key] = '[redacted]';
        continue;
      }

      sanitized[key] = sanitizeValue(entryValue, depth + 1);
    }

    return sanitized;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
    };
  }

  return value;
};

const toError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return new Error(error);
  }

  return new Error('Erro desconhecido');
};

const extractNestedError = (metadata: Record<string, unknown> | undefined): Error | undefined => {
  if (!metadata) {
    return undefined;
  }

  const nested = metadata.error;
  if (nested instanceof Error) {
    return nested;
  }

  return undefined;
};

export const getSentryInitConfig = (runtime: SentryRuntime): Sentry.BrowserOptions | Sentry.NodeOptions => {
  const dsn = getSentryDsn(runtime);
  const defaultSampleRate = getDefaultSampleRate();

  return {
    dsn,
    enabled: Boolean(dsn),
    release: process.env.SENTRY_RELEASE,
    environment: getSentryEnvironment(),
    tracesSampleRate: parseSampleRate(
      process.env.SENTRY_TRACES_SAMPLE_RATE || process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
      defaultSampleRate
    ),
    replaysOnErrorSampleRate: parseSampleRate(process.env.SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE, 0),
    replaysSessionSampleRate: parseSampleRate(process.env.SENTRY_REPLAYS_SESSION_SAMPLE_RATE, 0),
  };
};

export const captureApiException = (error: unknown, context: SentryApiContext): void => {
  const ownershipArea = inferOwnershipFromRoute(context.route);

  Sentry.withScope((scope) => {
    scope.setLevel('error');
    scope.setTag('flowdesk_area', 'api');
    scope.setTag('route', context.route);
    scope.setTag('method', context.method);
    setOwnershipTags(scope, ownershipArea);

    if (context.projectId) {
      scope.setTag('project_id', context.projectId);
    }

    if (context.requestId) {
      scope.setTag('request_id', context.requestId);
    }

    if (context.tags) {
      for (const [key, value] of Object.entries(context.tags)) {
        if (typeof value === 'string' && value.length > 0) {
          scope.setTag(key, value);
        }
      }
    }

    if (context.userId) {
      scope.setUser({ id: context.userId });
    }

    if (context.fingerprint && context.fingerprint.length > 0) {
      scope.setFingerprint(context.fingerprint);
    }

    scope.setContext('api', {
      route: context.route,
      method: context.method,
      projectId: context.projectId,
      requestId: context.requestId,
      metadata: sanitizeValue(context.metadata || {}),
    });

    Sentry.captureException(toError(error));
  });
};

export const captureLoggerError = (context: SentryLoggerContext): void => {
  const nestedError = extractNestedError(context.metadata);
  const errorToCapture = nestedError || new Error(context.message);
  const ownershipArea = inferOwnershipFromLoggerContext(context.action, context.page);

  Sentry.withScope((scope) => {
    scope.setLevel('error');
    scope.setTag('flowdesk_area', 'logger');
    setOwnershipTags(scope, ownershipArea);

    if (context.action) {
      scope.setTag('action', context.action);
    }

    if (context.page) {
      scope.setTag('page', context.page);
    }

    if (context.userId) {
      scope.setUser({ id: context.userId });
    }

    scope.setContext('logger', {
      message: context.message,
      action: context.action,
      page: context.page,
      metadata: sanitizeValue(context.metadata || {}),
    });

    Sentry.captureException(errorToCapture);
  });
};
