import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebaseAdmin';

type ServerAuditPayload = {
  actorId: string;
  action: string;
  resourceType: 'project' | 'member' | 'invite' | 'billing' | 'user';
  resourceId: string;
  projectId?: string;
  targetUserId?: string;
  metadata?: Record<string, unknown>;
  page?: string;
};

export async function recordServerAuditTrail(payload: ServerAuditPayload): Promise<void> {
  const retentionUntil = new Date();
  retentionUntil.setDate(retentionUntil.getDate() + 365);

  await adminDb.collection('logs').add({
    level: 'info',
    message: `AUDIT: ${payload.action}`,
    userId: payload.actorId,
    action: `audit.${payload.action}`,
    page: payload.page || 'api',
    metadata: {
      resourceType: payload.resourceType,
      resourceId: payload.resourceId,
      projectId: payload.projectId,
      targetUserId: payload.targetUserId,
      ...(payload.metadata || {}),
    },
    timestamp: FieldValue.serverTimestamp(),
    retentionUntil: Timestamp.fromDate(retentionUntil),
  });
}
