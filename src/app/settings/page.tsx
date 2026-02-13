'use client';

import { useEffect, useState } from 'react';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useNotification } from '@/hooks/useNotification';
import { getErrorCode, getUserFacingErrorMessage } from '@/lib/errorHandling';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { FaUser, FaLock, FaEnvelopeOpenText } from 'react-icons/fa6';

type PendingInvite = {
  id: string;
  projectId: string;
  projectName: string;
  email: string;
  invitedBy: string;
};

type PendingInvitesApiResponse = {
  invites?: PendingInvite[];
  error?: string;
};

type RespondInviteApiResponse = {
  ok?: boolean;
  error?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const parsePendingInvitesResponse = (value: unknown): PendingInvitesApiResponse => {
  if (!isRecord(value)) {
    return {};
  }

  const invitesRaw = value.invites;
  const invites = Array.isArray(invitesRaw)
    ? invitesRaw.filter((invite): invite is PendingInvite => {
        if (!isRecord(invite)) {
          return false;
        }

        return (
          typeof invite.id === 'string' &&
          typeof invite.projectId === 'string' &&
          typeof invite.projectName === 'string' &&
          typeof invite.email === 'string' &&
          typeof invite.invitedBy === 'string'
        );
      })
    : undefined;

  return {
    invites,
    error: typeof value.error === 'string' ? value.error : undefined,
  };
};

const parseRespondInviteResponse = (value: unknown): RespondInviteApiResponse => {
  if (!isRecord(value)) {
    return {};
  }

  return {
    ok: typeof value.ok === 'boolean' ? value.ok : undefined,
    error: typeof value.error === 'string' ? value.error : undefined,
  };
};

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}

function SettingsContent() {
  const { user, userProfile } = useAuth();
  const { showSuccess, showError } = useNotification();

  // Estado para edição de perfil
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Estado para troca de senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);

  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [respondingInviteId, setRespondingInviteId] = useState<string | null>(null);

  const getAuthToken = async (): Promise<string | null> => {
    if (!user) {
      showError('Você precisa estar autenticado.');
      return null;
    }

    return user.getIdToken();
  };

  const loadPendingInvites = async () => {
    setLoadingInvites(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        return;
      }

      const response = await fetch('/api/invitations/pending', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const responseBody: unknown = await response.json();
      const data = parsePendingInvitesResponse(responseBody);

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar convites');
      }

      setPendingInvites(data.invites || []);
    } catch (error) {
      showError(getUserFacingErrorMessage(error, 'Erro ao carregar convites pendentes.'));
    } finally {
      setLoadingInvites(false);
    }
  };

  const respondInvite = async (inviteId: string, action: 'accept' | 'decline') => {
    setRespondingInviteId(inviteId);
    try {
      const token = await getAuthToken();
      if (!token) {
        return;
      }

      const response = await fetch('/api/invitations/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ inviteId, action }),
      });

      const responseBody: unknown = await response.json();
      const data = parseRespondInviteResponse(responseBody);
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Erro ao responder convite');
      }

      setPendingInvites((prev) => prev.filter((invite) => invite.id !== inviteId));
      showSuccess(action === 'accept' ? 'Convite aceito com sucesso!' : 'Convite recusado.');
    } catch (error) {
      showError(getUserFacingErrorMessage(error, 'Erro ao responder convite.'));
    } finally {
      setRespondingInviteId(null);
    }
  };

  useEffect(() => {
    if (user) {
      loadPendingInvites();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    if (!displayName.trim()) {
      showError('O nome é obrigatório.');
      return;
    }

    setSavingProfile(true);
    try {
      // Atualiza no Firebase Auth
      await updateProfile(user, { displayName: displayName.trim() });

      // Atualiza no Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        displayName: displayName.trim(),
        updatedAt: serverTimestamp(),
      });

      showSuccess('Perfil atualizado com sucesso!');
    } catch {
      showError('Erro ao atualizar perfil. Tente novamente.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !user.email) return;

    if (!currentPassword) {
      showError('Digite sua senha atual.');
      return;
    }

    if (newPassword.length < 6) {
      showError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      showError('As senhas não coincidem.');
      return;
    }

    setSavingPassword(true);
    try {
      // Reautentica o usuário
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Atualiza a senha
      await updatePassword(user, newPassword);

      // Limpa os campos
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');

      showSuccess('Senha alterada com sucesso!');
    } catch (error: unknown) {
      const errorCode = getErrorCode(error);
      if (errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {
        showError('Senha atual incorreta.');
      } else {
        showError('Erro ao alterar senha. Tente novamente.');
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSendPasswordReset = async (): Promise<void> => {
    if (!user || !user.email) {
      showError('Não foi possível identificar o email da conta atual.');
      return;
    }

    setSendingPasswordReset(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      showSuccess('Link de redefinição enviado para seu email.');
    } catch (error: unknown) {
      showError(getUserFacingErrorMessage(error, 'Erro ao enviar email de redefinição.'));
    } finally {
      setSendingPasswordReset(false);
    }
  };

  return (
    <AppLayout title="Configurações">
      <div className="px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Seção: Dados do Perfil */}
          <section className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FaUser className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Dados do Perfil</h2>
                <p className="text-sm text-gray-500">Atualize suas informações pessoais</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={userProfile?.email || ''}
                  disabled
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-400">O email não pode ser alterado</p>
              </div>

              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingProfile ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </section>

          {/* Seção: Alterar Senha */}
          <section className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-orange-100 rounded-lg">
                <FaLock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Alterar Senha</h2>
                <p className="text-sm text-gray-500">Mantenha sua conta segura</p>
              </div>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Senha Atual
                </label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Nova Senha
                </label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-400">Mínimo de 6 caracteres</p>
              </div>

              <div>
                <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar Nova Senha
                </label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  id="confirmNewPassword"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showPasswords"
                  checked={showPasswords}
                  onChange={(e) => setShowPasswords(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="showPasswords" className="text-sm text-gray-600">
                  Mostrar senhas
                </label>
              </div>

              <div className="pt-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="submit"
                    disabled={savingPassword || !currentPassword || !newPassword || !confirmNewPassword}
                    className="px-5 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingPassword ? 'Alterando...' : 'Alterar Senha'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSendPasswordReset}
                    disabled={sendingPasswordReset}
                    className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingPasswordReset ? 'Enviando email...' : 'Enviar link de redefinição'}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  Se você esquecer a senha atual, use o link de redefinição para recuperar o acesso com segurança.
                </p>
              </div>
            </form>
          </section>
        </div>

        <section className="bg-white rounded-xl shadow-md p-6 mt-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <FaEnvelopeOpenText className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Convites pendentes</h2>
              <p className="text-sm text-gray-500">Aceite ou recuse convites de projetos</p>
            </div>
          </div>

          {loadingInvites ? (
            <p className="text-sm text-gray-500">Carregando convites...</p>
          ) : pendingInvites.length === 0 ? (
            <div className="text-sm text-gray-500 space-y-1">
              <p>Você não possui convites pendentes.</p>
              <p className="text-xs text-gray-400">
                Quando alguém convidar você para um projeto, o convite aparecerá aqui para aceite rápido.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingInvites.map((invite) => (
                <div key={invite.id} className="border border-gray-200 rounded-lg px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{invite.projectName}</p>
                    <p className="text-xs text-gray-500">Convite para: {invite.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => respondInvite(invite.id, 'decline')}
                      disabled={respondingInviteId === invite.id}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                      Recusar
                    </button>
                    <button
                      onClick={() => respondInvite(invite.id, 'accept')}
                      disabled={respondingInviteId === invite.id}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {respondingInviteId === invite.id ? 'Processando...' : 'Aceitar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
