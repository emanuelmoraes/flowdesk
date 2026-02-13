import { logger } from '@/lib/logger';

type AuditPayload = {
  actorId: string;
  action: string;
  resourceType: 'project' | 'member' | 'invite' | 'billing' | 'user' | 'support_ticket';
  resourceId: string;
  projectId?: string;
  targetUserId?: string;
  metadata?: Record<string, unknown>;
  page?: string;
};

export async function recordAuditTrail(payload: AuditPayload): Promise<void> {
  try {
    await logger.info(`AUDIT: ${payload.action}`, {
      userId: payload.actorId,
      action: `audit.${payload.action}`,
      page: payload.page,
      metadata: {
        resourceType: payload.resourceType,
        resourceId: payload.resourceId,
        projectId: payload.projectId,
        targetUserId: payload.targetUserId,
        ...(payload.metadata || {}),
      },
    });
  } catch {
    // trilha de auditoria é best-effort para não interromper fluxo principal
  }
}
