import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { recordServerAuditTrail } from '@/lib/auditServer';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

type InviteStatus = 'pending' | 'accepted' | 'declined' | 'canceled';

type RespondBody = {
  inviteId: string;
  action: 'accept' | 'decline';
};

type InviteDoc = {
  projectId: string;
  email: string;
  status: InviteStatus;
};

type ProjectDoc = {
  members?: string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const isInviteStatus = (value: unknown): value is InviteStatus => {
  return value === 'pending' || value === 'accepted' || value === 'declined' || value === 'canceled';
};

const parseRespondBody = (value: unknown): RespondBody | null => {
  if (!isRecord(value)) {
    return null;
  }

  const inviteId = value.inviteId;
  const action = value.action;

  if (typeof inviteId !== 'string' || (action !== 'accept' && action !== 'decline')) {
    return null;
  }

  return { inviteId, action };
};

const parseInviteDoc = (value: unknown): InviteDoc | null => {
  if (!isRecord(value)) {
    return null;
  }

  const projectId = value.projectId;
  const email = value.email;
  const status = value.status;

  if (typeof projectId !== 'string' || typeof email !== 'string' || !isInviteStatus(status)) {
    return null;
  }

  return { projectId, email, status };
};

const parseProjectDoc = (value: unknown): ProjectDoc => {
  if (!isRecord(value)) {
    return {};
  }

  const members = Array.isArray(value.members)
    ? value.members.filter((member): member is string => typeof member === 'string')
    : undefined;

  return { members };
};

function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring('Bearer '.length);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const rawBody: unknown = await request.json();
    const body = parseRespondBody(rawBody);

    if (!body) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
    }

    const userRef = adminDb.collection('users').doc(decoded.uid);
    const userSnapshot = await userRef.get();
    const userData = userSnapshot.exists ? userSnapshot.data() : undefined;
    const userEmail = (decoded.email || userData?.email || '').toLowerCase().trim();

    const inviteRef = adminDb.collection('projectInvites').doc(body.inviteId);
    const inviteSnapshot = await inviteRef.get();

    if (!inviteSnapshot.exists) {
      return NextResponse.json({ error: 'Convite não encontrado' }, { status: 404 });
    }

    const inviteData = parseInviteDoc(inviteSnapshot.data());
    if (!inviteData) {
      return NextResponse.json({ error: 'Convite inválido' }, { status: 400 });
    }

    if (inviteData.status !== 'pending') {
      return NextResponse.json({ error: 'Convite não está pendente' }, { status: 400 });
    }

    if (inviteData.email.toLowerCase() !== userEmail) {
      return NextResponse.json({ error: 'Convite não pertence a este usuário' }, { status: 403 });
    }

    if (body.action === 'accept') {
      const projectRef = adminDb.collection('projects').doc(inviteData.projectId);
      const projectSnapshot = await projectRef.get();

      if (!projectSnapshot.exists) {
        return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 });
      }

      const projectData = parseProjectDoc(projectSnapshot.data());
      const members: string[] = projectData.members ? [...projectData.members] : [];

      if (!members.includes(decoded.uid)) {
        members.push(decoded.uid);
      }

      await projectRef.set(
        {
          members,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      await recordServerAuditTrail({
        actorId: decoded.uid,
        action: 'member.joined_by_invite',
        resourceType: 'member',
        resourceId: decoded.uid,
        projectId: inviteData.projectId,
        targetUserId: decoded.uid,
        metadata: {
          inviteId: body.inviteId,
          email: userEmail,
        },
        page: 'api_invitations_respond',
      });
    }

    await inviteRef.set(
      {
        status: body.action === 'accept' ? 'accepted' : 'declined',
        respondedBy: decoded.uid,
        respondedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await recordServerAuditTrail({
      actorId: decoded.uid,
      action: body.action === 'accept' ? 'invite.accepted' : 'invite.declined',
      resourceType: 'invite',
      resourceId: body.inviteId,
      projectId: inviteData.projectId,
      targetUserId: decoded.uid,
      metadata: {
        email: userEmail,
      },
      page: 'api_invitations_respond',
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao responder convite' },
      { status: 500 }
    );
  }
}
