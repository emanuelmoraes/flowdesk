import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type BusinessEventName =
  | 'user_signup_completed'
  | 'user_login_completed'
  | 'project_created'
  | 'activation_first_project_created'
  | 'ticket_created'
  | 'activation_first_ticket_created'
  | 'conversion_subscription_checkout_started'
  | 'conversion_subscription_checkout_completed';

export type BusinessEventCategory = 'activation' | 'retention' | 'conversion';

type BusinessEventPayload = {
  eventName: BusinessEventName;
  category: BusinessEventCategory;
  userId?: string;
  projectId?: string;
  workspaceId?: string;
  metadata?: Record<string, unknown>;
};

export async function trackBusinessEvent(payload: BusinessEventPayload): Promise<void> {
  try {
    await addDoc(collection(db, 'businessEvents'), {
      eventName: payload.eventName,
      category: payload.category,
      userId: payload.userId || null,
      projectId: payload.projectId || null,
      workspaceId: payload.workspaceId || null,
      metadata: payload.metadata || {},
      occurredAt: serverTimestamp(),
      source: 'client',
    });
  } catch {
    // best-effort: não interromper fluxo principal
  }
}
