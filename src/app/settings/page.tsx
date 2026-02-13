'use client';

import { useEffect, useMemo, useState } from 'react';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { createSupportTicket } from '@/lib/services';
import { useAuth } from '@/hooks/useAuth';
import { useOperationalHealth } from '@/hooks/useOperationalHealth';
import { useNotification } from '@/hooks/useNotification';
import { getErrorCode, getUserFacingErrorMessage } from '@/lib/errorHandling';
import { emitCriticalOperationalAlerts, getCriticalOperationalAlerts } from '@/lib/operationalAlerts';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { FaUser, FaLock, FaEnvelopeOpenText } from 'react-icons/fa6';
import { MdMonitorHeart, MdErrorOutline, MdSpeed, MdCheckCircleOutline, MdHelpOutline } from 'react-icons/md';

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

type SupportCategory = 'billing' | 'technical' | 'account' | 'other';
type SupportPriority = 'low' | 'medium' | 'high';

const supportCategories: Array<{ id: SupportCategory; label: string }> = [
  { id: 'technical', label: 'Problema técnico' },
  { id: 'billing', label: 'Cobrança e assinatura' },
  { id: 'account', label: 'Conta e acesso' },
  { id: 'other', label: 'Outro assunto' },
];

const supportPriorities: Array<{ id: SupportPriority; label: string }> = [
  { id: 'low', label: 'Baixa' },
  { id: 'medium', label: 'Média' },
  { id: 'high', label: 'Alta' },
];

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
  const { metrics: operationalMetrics, loading: loadingOperationalMetrics, error: operationalMetricsError, refresh: refreshOperationalMetrics } = useOperationalHealth(Boolean(user));
  const { showSuccess, showError, showWarning } = useNotification();

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
  const [supportCategory, setSupportCategory] = useState<SupportCategory>('technical');
  const [supportPriority, setSupportPriority] = useState<SupportPriority>('medium');
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [sendingSupportTicket, setSendingSupportTicket] = useState(false);

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

  const handleCreateSupportTicket = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!user || !userProfile?.email) {
      showError('Você precisa estar autenticado para abrir um chamado.');
      return;
    }

    if (!supportSubject.trim()) {
      showError('Informe o assunto do chamado.');
      return;
    }

    if (!supportMessage.trim()) {
      showError('Descreva o problema para abrir o chamado.');
      return;
    }

    setSendingSupportTicket(true);
    try {
      await createSupportTicket(
        user.uid,
        userProfile.email,
        userProfile.displayName || 'Usuário',
        supportSubject,
        supportMessage,
        supportCategory,
        supportPriority,
      );

      setSupportSubject('');
      setSupportMessage('');
      setSupportCategory('technical');
      setSupportPriority('medium');
      showSuccess('Chamado aberto com sucesso! Nossa equipe irá responder conforme o SLA do seu plano.');
    } catch (error) {
      showError(getUserFacingErrorMessage(error, 'Não foi possível abrir o chamado. Tente novamente.'));
    } finally {
      setSendingSupportTicket(false);
    }
  };

  const criticalOperationalAlerts = useMemo(
    () => (operationalMetrics ? getCriticalOperationalAlerts(operationalMetrics) : []),
    [operationalMetrics],
  );

  useEffect(() => {
    if (!user || !operationalMetrics || criticalOperationalAlerts.length === 0) {
      return;
    }

    emitCriticalOperationalAlerts({
      userId: user.uid,
      alerts: criticalOperationalAlerts,
      showWarning,
      metrics: operationalMetrics,
    });
  }, [user, operationalMetrics, criticalOperationalAlerts, showWarning]);

  const formatPercentage = (value: number | null): string => {
    if (value === null) {
      return '—';
    }

    return `${value.toFixed(1)}%`;
  };

  const formatLatency = (value: number | null): string => {
    if (value === null) {
      return '—';
    }

    return `${value.toFixed(1)} ms`;
  };

  const formatDateTime = (value: Date | null): string => {
    if (!value) {
      return '—';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(value);
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

        <section className="bg-white rounded-xl shadow-md p-6 mt-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-violet-100 rounded-lg">
              <MdHelpOutline className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Central de ajuda</h2>
              <p className="text-sm text-gray-500">Respostas rápidas e abertura de chamado</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Perguntas frequentes</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="border border-gray-200 rounded-lg p-3">
                  <p className="font-medium text-gray-800">Como alterar meu plano?</p>
                  <p className="mt-1 text-xs text-gray-600">Acesse a página de planos e use “Gerenciar assinatura” para upgrade, downgrade ou cancelamento.</p>
                </li>
                <li className="border border-gray-200 rounded-lg p-3">
                  <p className="font-medium text-gray-800">Esqueci minha senha, e agora?</p>
                  <p className="mt-1 text-xs text-gray-600">Use o botão “Enviar link de redefinição” nesta página para recuperar o acesso.</p>
                </li>
                <li className="border border-gray-200 rounded-lg p-3">
                  <p className="font-medium text-gray-800">Onde vejo incidentes da plataforma?</p>
                  <p className="mt-1 text-xs text-gray-600">No card de Saúde operacional desta página, com alertas críticos e métricas das últimas 24h.</p>
                </li>
                <li className="border border-gray-200 rounded-lg p-3">
                  <p className="font-medium text-gray-800">Como o FlowDesk responde a incidentes?</p>
                  <p className="mt-1 text-xs text-gray-600">Seguimos runbook com etapas de detecção, triagem, contenção, correção, validação e pós-mortem.</p>
                </li>
                <li className="border border-gray-200 rounded-lg p-3">
                  <p className="font-medium text-gray-800">Como vocês comunicam indisponibilidade?</p>
                  <p className="mt-1 text-xs text-gray-600">Publicamos aviso inicial rápido, enviamos atualizações recorrentes por severidade e comunicamos a normalização.</p>
                </li>
              </ul>

              <div className="mt-3 border border-violet-200 bg-violet-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-violet-700">Runbook resumido</p>
                <ol className="mt-2 space-y-1 text-xs text-violet-700 list-decimal list-inside">
                  <li>Classificar severidade (SEV-1, SEV-2, SEV-3).</li>
                  <li>Conter impacto com mitigação rápida.</li>
                  <li>Aplicar correção segura e validar fluxos críticos.</li>
                  <li>Registrar causa raiz e ações preventivas.</li>
                </ol>
              </div>

              <div className="mt-3 border border-amber-200 bg-amber-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-amber-700">Comunicação de indisponibilidade</p>
                <ol className="mt-2 space-y-1 text-xs text-amber-700 list-decimal list-inside">
                  <li>Primeiro aviso em até 15 minutos após confirmação.</li>
                  <li>Atualizações: SEV-1 a cada 30 min, SEV-2 a cada 60 min.</li>
                  <li>Comunicado de resolução com horário de normalização.</li>
                </ol>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Abrir chamado</h3>
              <form onSubmit={handleCreateSupportTicket} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="supportCategory" className="block text-xs font-medium text-gray-700 mb-1">Categoria</label>
                    <select
                      id="supportCategory"
                      value={supportCategory}
                      onChange={(e) => setSupportCategory(e.target.value as SupportCategory)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      {supportCategories.map((category) => (
                        <option key={category.id} value={category.id}>{category.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="supportPriority" className="block text-xs font-medium text-gray-700 mb-1">Prioridade</label>
                    <select
                      id="supportPriority"
                      value={supportPriority}
                      onChange={(e) => setSupportPriority(e.target.value as SupportPriority)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      {supportPriorities.map((priority) => (
                        <option key={priority.id} value={priority.id}>{priority.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="supportSubject" className="block text-xs font-medium text-gray-700 mb-1">Assunto</label>
                  <input
                    id="supportSubject"
                    type="text"
                    value={supportSubject}
                    onChange={(e) => setSupportSubject(e.target.value)}
                    maxLength={120}
                    placeholder="Resumo curto do problema"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="supportMessage" className="block text-xs font-medium text-gray-700 mb-1">Descrição</label>
                  <textarea
                    id="supportMessage"
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    maxLength={4000}
                    rows={5}
                    placeholder="Descreva o que aconteceu, quando começou e o impacto no seu fluxo"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">Atendimento conforme SLA do seu plano.</p>
                  <button
                    type="submit"
                    disabled={sendingSupportTicket || !supportSubject.trim() || !supportMessage.trim()}
                    className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingSupportTicket ? 'Enviando...' : 'Abrir chamado'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-md p-6 mt-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <MdMonitorHeart className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Saúde operacional</h2>
                <p className="text-sm text-gray-500">Falhas, latência e disponibilidade nas últimas 24h</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void refreshOperationalMetrics()}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Atualizar
            </button>
          </div>

          {loadingOperationalMetrics ? (
            <p className="text-sm text-gray-500">Carregando métricas operacionais...</p>
          ) : operationalMetricsError ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {operationalMetricsError}
            </div>
          ) : !operationalMetrics ? (
            <p className="text-sm text-gray-500">Sem dados operacionais no momento.</p>
          ) : (
            <>
              {criticalOperationalAlerts.length > 0 && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm font-semibold text-red-700">Incidentes críticos detectados</p>
                  <ul className="mt-2 space-y-1">
                    {criticalOperationalAlerts.map((alert) => (
                      <li key={alert.id} className="text-xs text-red-700">
                        {alert.title}: {alert.currentValueLabel} (limite: {alert.thresholdLabel})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <MdErrorOutline className="w-4 h-4" />
                    <span className="text-sm font-medium">Falhas</span>
                  </div>
                  <p className="text-2xl font-semibold text-gray-900">{operationalMetrics.errorCount}</p>
                  <p className="text-xs text-gray-500 mt-1">Taxa de erro: {formatPercentage(operationalMetrics.errorRate)}</p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <MdSpeed className="w-4 h-4" />
                    <span className="text-sm font-medium">Latência</span>
                  </div>
                  <p className="text-2xl font-semibold text-gray-900">{formatLatency(operationalMetrics.avgLatencyMs)}</p>
                  <p className="text-xs text-gray-500 mt-1">P95: {formatLatency(operationalMetrics.p95LatencyMs)}</p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <MdCheckCircleOutline className="w-4 h-4" />
                    <span className="text-sm font-medium">Disponibilidade</span>
                  </div>
                  <p className="text-2xl font-semibold text-gray-900">{formatPercentage(operationalMetrics.estimatedAvailability)}</p>
                  <p className="text-xs text-gray-500 mt-1">Base: {operationalMetrics.totalEntries} eventos</p>
                </div>
              </div>

              <div className="mt-4 text-xs text-gray-500 space-y-1">
                <p>Última falha registrada: {formatDateTime(operationalMetrics.lastErrorAt)}</p>
                <p>Atualizado em: {formatDateTime(operationalMetrics.updatedAt)}</p>
              </div>
            </>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
