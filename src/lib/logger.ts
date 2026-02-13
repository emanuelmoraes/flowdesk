import { collection, addDoc, serverTimestamp, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type LogLevel = 'info' | 'warn' | 'error' | 'success';

export interface LogEntry {
  id?: string;
  timestamp: Date;
  retentionUntil?: Date;
  level: LogLevel;
  message: string;
  userId?: string;
  action?: string;
  metadata?: Record<string, unknown>;
  page?: string;
}

type TimestampLike = {
  toDate: () => Date;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const hasToDate = (value: unknown): value is TimestampLike => {
  return isRecord(value) && typeof value.toDate === 'function';
};

const isLogLevel = (value: unknown): value is LogLevel => {
  return value === 'info' || value === 'warn' || value === 'error' || value === 'success';
};

interface CreateLogParams {
  level: LogLevel;
  message: string;
  userId?: string;
  action?: string;
  metadata?: Record<string, unknown>;
  page?: string;
}

const LOGS_COLLECTION = 'logs';
export const LOG_RETENTION_DAYS = 90;

function getLogRetentionUntil(): Timestamp {
  const retentionUntil = new Date();
  retentionUntil.setDate(retentionUntil.getDate() + LOG_RETENTION_DAYS);
  return Timestamp.fromDate(retentionUntil);
}

/**
 * Salva um log no Firestore
 */
export async function createLog(params: CreateLogParams): Promise<string | null> {
  try {
    const logData = {
      ...params,
      timestamp: serverTimestamp(),
      retentionUntil: getLogRetentionUntil(),
    };

    const docRef = await addDoc(collection(db, LOGS_COLLECTION), logData);
    return docRef.id;
  } catch {
    // Falha silenciosa - não expor erros no console por segurança
    return null;
  }
}

/**
 * Helpers para diferentes níveis de log
 */
export const logger = {
  info: (message: string, options?: Omit<CreateLogParams, 'level' | 'message'>) =>
    createLog({ level: 'info', message, ...options }),

  warn: (message: string, options?: Omit<CreateLogParams, 'level' | 'message'>) =>
    createLog({ level: 'warn', message, ...options }),

  error: (message: string, options?: Omit<CreateLogParams, 'level' | 'message'>) =>
    createLog({ level: 'error', message, ...options }),

  success: (message: string, options?: Omit<CreateLogParams, 'level' | 'message'>) =>
    createLog({ level: 'success', message, ...options }),
};

/**
 * Busca logs com filtros
 */
export interface LogFilters {
  level?: LogLevel;
  userId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export async function getLogs(filters: LogFilters = {}): Promise<LogEntry[]> {
  try {
    let q = query(collection(db, LOGS_COLLECTION), orderBy('timestamp', 'desc'));

    // Aplica filtros
    if (filters.level) {
      q = query(q, where('level', '==', filters.level));
    }
    if (filters.userId) {
      q = query(q, where('userId', '==', filters.userId));
    }
    if (filters.action) {
      q = query(q, where('action', '==', filters.action));
    }
    if (filters.startDate) {
      q = query(q, where('timestamp', '>=', Timestamp.fromDate(filters.startDate)));
    }
    if (filters.endDate) {
      q = query(q, where('timestamp', '<=', Timestamp.fromDate(filters.endDate)));
    }

    const snapshot = await getDocs(q);
    const logs: LogEntry[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const safeData = isRecord(data) ? data : {};
      const level = isLogLevel(safeData.level) ? safeData.level : 'info';
      const message = typeof safeData.message === 'string' ? safeData.message : '';
      const userId = typeof safeData.userId === 'string' ? safeData.userId : undefined;
      const action = typeof safeData.action === 'string' ? safeData.action : undefined;
      const page = typeof safeData.page === 'string' ? safeData.page : undefined;
      const metadata = isRecord(safeData.metadata) ? safeData.metadata : undefined;

      logs.push({
        id: doc.id,
        timestamp: hasToDate(safeData.timestamp) ? safeData.timestamp.toDate() : new Date(),
        retentionUntil: hasToDate(safeData.retentionUntil) ? safeData.retentionUntil.toDate() : undefined,
        level,
        message,
        userId,
        action,
        metadata,
        page,
      });
    });

    // Aplica limite manualmente se necessário
    if (filters.limit && logs.length > filters.limit) {
      return logs.slice(0, filters.limit);
    }

    return logs;
  } catch {
    // Falha silenciosa - não expor erros no console por segurança
    return [];
  }
}
