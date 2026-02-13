import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type LogLevel = 'info' | 'warn' | 'error' | 'success';

type TimestampLike = {
  toDate: () => Date;
};

type ParsedLog = {
  timestamp: Date;
  level: LogLevel;
  metadata?: Record<string, unknown>;
};

export type OperationalHealthMetrics = {
  windowHours: number;
  totalEntries: number;
  errorCount: number;
  errorRate: number | null;
  estimatedAvailability: number | null;
  avgLatencyMs: number | null;
  p95LatencyMs: number | null;
  lastErrorAt: Date | null;
  updatedAt: Date;
};

const WINDOW_HOURS = 24;
const MAX_ENTRIES = 500;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const hasToDate = (value: unknown): value is TimestampLike => {
  return isRecord(value) && typeof value.toDate === 'function';
};

const isLogLevel = (value: unknown): value is LogLevel => {
  return value === 'info' || value === 'warn' || value === 'error' || value === 'success';
};

const parseDurationMs = (metadata: Record<string, unknown> | undefined): number | null => {
  if (!metadata) {
    return null;
  }

  const durationRaw = metadata.durationMs;
  if (typeof durationRaw !== 'number' || !Number.isFinite(durationRaw) || durationRaw < 0) {
    return null;
  }

  return durationRaw;
};

const round = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const calculateP95 = (latencies: number[]): number | null => {
  if (latencies.length === 0) {
    return null;
  }

  const sorted = [...latencies].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
  return round(sorted[index], 1);
};

const parseLogs = (snapshotDocs: Array<{ data: () => unknown }>): ParsedLog[] => {
  const parsedLogs: ParsedLog[] = [];

  for (const snapshotDoc of snapshotDocs) {
    const data = snapshotDoc.data();
    if (!isRecord(data)) {
      continue;
    }

    const timestampRaw = data.timestamp;
    const levelRaw = data.level;

    if (!hasToDate(timestampRaw) || !isLogLevel(levelRaw)) {
      continue;
    }

    parsedLogs.push({
      timestamp: timestampRaw.toDate(),
      level: levelRaw,
      metadata: isRecord(data.metadata) ? data.metadata : undefined,
    });
  }

  return parsedLogs;
};

const buildMetrics = (logs: ParsedLog[]): OperationalHealthMetrics => {
  const errorLogs = logs.filter((entry) => entry.level === 'error');
  const latencies = logs
    .map((entry) => parseDurationMs(entry.metadata))
    .filter((value): value is number => value !== null);

  const totalEntries = logs.length;
  const errorCount = errorLogs.length;
  const errorRate = totalEntries > 0 ? round((errorCount / totalEntries) * 100, 1) : null;
  const estimatedAvailability =
    totalEntries > 0 ? round(Math.max(0, ((totalEntries - errorCount) / totalEntries) * 100), 2) : null;
  const avgLatencyMs =
    latencies.length > 0 ? round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length, 1) : null;

  return {
    windowHours: WINDOW_HOURS,
    totalEntries,
    errorCount,
    errorRate,
    estimatedAvailability,
    avgLatencyMs,
    p95LatencyMs: calculateP95(latencies),
    lastErrorAt: errorLogs.length > 0 ? errorLogs[0].timestamp : null,
    updatedAt: new Date(),
  };
};

export function useOperationalHealth(enabled: boolean) {
  const [metrics, setMetrics] = useState<OperationalHealthMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setMetrics(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - WINDOW_HOURS * 60 * 60 * 1000);
      const logsQuery = query(
        collection(db, 'logs'),
        where('timestamp', '>=', Timestamp.fromDate(windowStart)),
        orderBy('timestamp', 'desc'),
        limit(MAX_ENTRIES),
      );

      const snapshot = await getDocs(logsQuery);
      const logs = parseLogs(snapshot.docs);
      setMetrics(buildMetrics(logs));
    } catch {
      setError('Não foi possível carregar as métricas de saúde operacional.');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    metrics,
    loading,
    error,
    refresh,
  };
}
