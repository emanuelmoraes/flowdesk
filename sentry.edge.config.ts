import * as Sentry from '@sentry/nextjs';
import { getSentryInitConfig } from '@/lib/sentry';

Sentry.init(getSentryInitConfig('edge'));
