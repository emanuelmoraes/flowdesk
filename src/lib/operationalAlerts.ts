import { logger } from '@/lib/logger';
import type { OperationalHealthMetrics } from '@/hooks/useOperationalHealth';

type CriticalAlertType = 'error_rate_spike' | 'availability_drop' | 'latency_spike';

export type CriticalOperationalAlert = {
  id: CriticalAlertType;
  title: string;
  message: string;
  thresholdLabel: string;
  currentValueLabel: string;
};

type EmitAlertParams = {
  userId: string;
  alerts: CriticalOperationalAlert[];
  showWarning: (message: string, options?: { duration?: number; skipLog?: boolean; page?: string; action?: string; userId?: string; metadata?: Record<string, unknown> }) => void;
  metrics: OperationalHealthMetrics;
};

const ALERT_COOLDOWN_MINUTES = 30;

const ERROR_RATE_CRITICAL_THRESHOLD = 10;
const AVAILABILITY_CRITICAL_THRESHOLD = 99;
const P95_LATENCY_CRITICAL_THRESHOLD_MS = 2000;

const buildStorageKey = (userId: string, alertId: CriticalAlertType): string => {
  return `operational-alert:${userId}:${alertId}`;
};

const nowMs = (): number => Date.now();

const shouldEmitAlert = (userId: string, alertId: CriticalAlertType): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const key = buildStorageKey(userId, alertId);
  const lastTriggeredRaw = window.localStorage.getItem(key);

  if (!lastTriggeredRaw) {
    return true;
  }

  const lastTriggeredMs = Number(lastTriggeredRaw);
  if (!Number.isFinite(lastTriggeredMs)) {
    return true;
  }

  const cooldownMs = ALERT_COOLDOWN_MINUTES * 60 * 1000;
  return nowMs() - lastTriggeredMs >= cooldownMs;
};

const markAlertEmitted = (userId: string, alertId: CriticalAlertType): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(buildStorageKey(userId, alertId), String(nowMs()));
};

const formatPercentage = (value: number): string => `${value.toFixed(1)}%`;
const formatLatency = (value: number): string => `${value.toFixed(0)}ms`;

export const getCriticalOperationalAlerts = (metrics: OperationalHealthMetrics): CriticalOperationalAlert[] => {
  const alerts: CriticalOperationalAlert[] = [];

  if (metrics.errorRate !== null && metrics.errorRate >= ERROR_RATE_CRITICAL_THRESHOLD) {
    alerts.push({
      id: 'error_rate_spike',
      title: 'Taxa de falhas crítica',
      message: `A taxa de falhas chegou em ${formatPercentage(metrics.errorRate)} nas últimas ${metrics.windowHours}h.`,
      thresholdLabel: `>= ${ERROR_RATE_CRITICAL_THRESHOLD}%`,
      currentValueLabel: formatPercentage(metrics.errorRate),
    });
  }

  if (metrics.estimatedAvailability !== null && metrics.estimatedAvailability < AVAILABILITY_CRITICAL_THRESHOLD) {
    alerts.push({
      id: 'availability_drop',
      title: 'Disponibilidade abaixo do esperado',
      message: `A disponibilidade estimada caiu para ${formatPercentage(metrics.estimatedAvailability)} nas últimas ${metrics.windowHours}h.`,
      thresholdLabel: `< ${AVAILABILITY_CRITICAL_THRESHOLD}%`,
      currentValueLabel: formatPercentage(metrics.estimatedAvailability),
    });
  }

  if (metrics.p95LatencyMs !== null && metrics.p95LatencyMs >= P95_LATENCY_CRITICAL_THRESHOLD_MS) {
    alerts.push({
      id: 'latency_spike',
      title: 'Latência crítica (P95)',
      message: `A latência P95 atingiu ${formatLatency(metrics.p95LatencyMs)} nas últimas ${metrics.windowHours}h.`,
      thresholdLabel: `>= ${P95_LATENCY_CRITICAL_THRESHOLD_MS}ms`,
      currentValueLabel: formatLatency(metrics.p95LatencyMs),
    });
  }

  return alerts;
};

export const emitCriticalOperationalAlerts = ({ userId, alerts, showWarning, metrics }: EmitAlertParams): number => {
  let emittedCount = 0;

  for (const alert of alerts) {
    if (!shouldEmitAlert(userId, alert.id)) {
      continue;
    }

    showWarning(`${alert.title}: ${alert.message}`, {
      duration: 7000,
      skipLog: true,
      page: 'settings',
      action: `incident_critical_${alert.id}`,
      userId,
    });

    void logger.warn(`[INCIDENTE CRÍTICO] ${alert.title}`, {
      action: `incident_critical_${alert.id}`,
      page: 'settings_operational_health',
      userId,
      metadata: {
        message: alert.message,
        threshold: alert.thresholdLabel,
        currentValue: alert.currentValueLabel,
        windowHours: metrics.windowHours,
        totalEntries: metrics.totalEntries,
        errorCount: metrics.errorCount,
        errorRate: metrics.errorRate,
        estimatedAvailability: metrics.estimatedAvailability,
        avgLatencyMs: metrics.avgLatencyMs,
        p95LatencyMs: metrics.p95LatencyMs,
      },
    });

    markAlertEmitted(userId, alert.id);
    emittedCount += 1;
  }

  return emittedCount;
};
