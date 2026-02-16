import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { captureApiException } from '@/lib/sentry';

type ProjectInviteStatus = 'pending' | 'accepted' | 'declined' | 'canceled';

type ProjectInviteDoc = {
  projectId: string;
  email: string;
  invitedBy: string;
  status: ProjectInviteStatus;
  createdAt?: unknown;
};

type PendingInviteResponse = {
  id: string;
  projectId: string;
  projectName: string;
  email: string;
  invitedBy: string;
  createdAt: unknown | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const isInviteStatus = (value: unknown): value is ProjectInviteStatus => {
  return (
    value === 'pending' ||
    value === 'accepted' ||
    value === 'declined' ||
    value === 'canceled'
  );
};

const parseInviteDoc = (id: string, raw: unknown): (ProjectInviteDoc & { id: string }) | null => {
  if (!isRecord(raw)) {
    return null;
  }

  const projectId = raw.projectId;
  const email = raw.email;
  const invitedBy = raw.invitedBy;
  const status = raw.status;

  if (
    typeof projectId !== 'string' ||
    typeof email !== 'string' ||
    typeof invitedBy !== 'string' ||
    !isInviteStatus(status)
  ) {
    return null;
  }

  return {
    id,
    projectId,
    email,
    invitedBy,
    status,
    createdAt: raw.createdAt,
  };
};

function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring('Bearer '.length);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  let userId: string | undefined;

  try {
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    userId = decoded.uid;
    const userRef = adminDb.collection('users').doc(decoded.uid);
    const userSnapshot = await userRef.get();
    const userData = userSnapshot.exists ? userSnapshot.data() : undefined;

    const email = (decoded.email || userData?.email || '').toLowerCase().trim();
    if (!email) {
      return NextResponse.json({ invites: [] });
    }

    const invitesSnapshot = await adminDb
      .collection('projectInvites')
      .where('email', '==', email)
      .get();

    const pendingInvites = invitesSnapshot.docs
      .map((inviteDoc) => parseInviteDoc(inviteDoc.id, inviteDoc.data()))
      .filter((invite): invite is ProjectInviteDoc & { id: string } => invite !== null)
      .filter((invite) => invite.status === 'pending');

    const projectMap = new Map<string, string>();
    for (const invite of pendingInvites) {
      const projectId = invite.projectId;
      if (!projectMap.has(projectId)) {
        const projectDoc = await adminDb.collection('projects').doc(projectId).get();
        const projectData = projectDoc.data();
        const projectName =
          projectDoc.exists && isRecord(projectData) && typeof projectData.name === 'string'
            ? projectData.name
            : 'Projeto';

        projectMap.set(projectId, projectName);
      }
    }

    const responseInvites: PendingInviteResponse[] = pendingInvites.map((invite) => ({
      id: invite.id,
      projectId: invite.projectId,
      projectName: projectMap.get(invite.projectId) || 'Projeto',
      email: invite.email,
      invitedBy: invite.invitedBy,
      createdAt: invite.createdAt || null,
    }));

    return NextResponse.json({
      invites: responseInvites,
    });
  } catch (error) {
    captureApiException(error, {
      route: '/api/invitations/pending',
      method: 'GET',
      userId,
      fingerprint: ['api', 'invitations', 'pending', 'get'],
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar convites pendentes' },
      { status: 500 }
    );
  }
}
