import * as Sentry from '@sentry/nextjs';
import { getSentryInitConfig } from '@/lib/sentry';

Sentry.init(getSentryInitConfig('client'));

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
