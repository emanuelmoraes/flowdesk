import { collection, addDoc, serverTimestamp, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type LogLevel = 'info' | 'warn' | 'error' | 'success';

export interface LogEntry {
  id?: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  userId?: string;
  action?: string;
  metadata?: Record<string, unknown>;
  page?: string;
}

interface CreateLogParams {
  level: LogLevel;
  message: string;
  userId?: string;
  action?: string;
  metadata?: Record<string, unknown>;
  page?: string;
}

const LOGS_COLLECTION = 'logs';

/**
 * Salva um log no Firestore
 */
export async function createLog(params: CreateLogParams): Promise<string | null> {
  try {
    const logData = {
      ...params,
      timestamp: serverTimestamp(),
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
      logs.push({
        id: doc.id,
        timestamp: data.timestamp?.toDate() || new Date(),
        level: data.level,
        message: data.message,
        userId: data.userId,
        action: data.action,
        metadata: data.metadata,
        page: data.page,
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
