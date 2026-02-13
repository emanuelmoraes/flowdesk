import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebaseAdmin';

type BusinessEventName =
  | 'conversion_subscription_checkout_started'
  | 'conversion_subscription_checkout_completed';

type BusinessEventCategory = 'activation' | 'retention' | 'conversion';

type ServerBusinessEventPayload = {
  eventName: BusinessEventName;
  category: BusinessEventCategory;
  userId?: string;
  projectId?: string;
  workspaceId?: string;
  metadata?: Record<string, unknown>;
};

export async function trackServerBusinessEvent(payload: ServerBusinessEventPayload): Promise<void> {
  try {
    await adminDb.collection('businessEvents').add({
      eventName: payload.eventName,
      category: payload.category,
      userId: payload.userId || null,
      projectId: payload.projectId || null,
      workspaceId: payload.workspaceId || null,
      metadata: payload.metadata || {},
      occurredAt: FieldValue.serverTimestamp(),
      source: 'server',
    });
  } catch {
    // best-effort: não interromper fluxo principal
  }
}
