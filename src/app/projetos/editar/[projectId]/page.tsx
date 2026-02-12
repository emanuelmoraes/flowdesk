'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Project } from '@/types';
import RichTextEditor from '@/components/RichTextEditor';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { useNotification } from '@/hooks/useNotification';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';
import { getUserByEmail, getUsersByIds, addProjectMember, removeProjectMember } from '@/lib/services';
import { FaUserPlus, FaTrash, FaCrown } from 'react-icons/fa6';

export default function EditarProjetoPage() {
  return (
    <ProtectedRoute>
      <EditarProjetoContent />
    </ProtectedRoute>
  );
}

function EditarProjetoContent() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [project, setProject] = useState<Project | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');

  // Estados para gerenciamento de membros
  const [members, setMembers] = useState<Array<{ id: string; email: string; displayName: string }>>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const isOwner = !!user && !!project && project.ownerId === user.uid;

  useEffect(() => {
    fetchProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Carrega membros quando o projeto muda
  useEffect(() => {
    if (project?.members) {
      fetchMembers(project.members);
    }
  }, [project?.members]);

  const fetchMembers = async (memberIds: string[]) => {
    try {
      const membersData = await getUsersByIds(memberIds);
      setMembers(membersData);
    } catch (err) {
      logger.error('Erro ao carregar membros do projeto', {
        action: 'load_project_members',
        metadata: { projectId, memberIds, error: String(err) },
        page: 'editar_projeto',
      });
      setMembers([]);
      showError('Não foi possível carregar os membros do projeto.');
    }
  };

  const fetchProject = async () => {
    try {
      setLoading(true);
      const projectDoc = await getDoc(doc(db, 'projects', projectId));
      
      if (projectDoc.exists()) {
        const projectData = {
          id: projectDoc.id,
          ...projectDoc.data(),
          createdAt: projectDoc.data().createdAt?.toDate(),
          updatedAt: projectDoc.data().updatedAt?.toDate(),
        } as Project;
        
        setProject(projectData);
        setName(projectData.name);
        setDescription(projectData.description || '');
      } else {
        setError('Projeto não encontrado');
      }
    } catch (err) {
      logger.error('Erro ao carregar projeto', {
        action: 'load_project',
        metadata: { projectId, error: String(err) },
        page: 'editar_projeto',
      });
      setError('Erro ao carregar projeto');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!project || !user || project.ownerId !== user.uid) {
      showError('Apenas o dono do projeto pode editar estas configurações.');
      return;
    }
    
    if (!name.trim()) {
      setError('Nome do projeto é obrigatório');
      return;
    }

    setSaving(true);

    try {
      const projectRef = doc(db, 'projects', projectId);
      await updateDoc(projectRef, {
        name: name.trim(),
        description: description, // Agora é HTML, não precisa trim
        updatedAt: serverTimestamp(),
      });

      router.push('/projetos');
    } catch (err) {
      logger.error('Erro ao atualizar projeto', {
        action: 'update_project',
        metadata: { projectId, error: String(err) },
        page: 'editar_projeto',
      });
      setError('Erro ao atualizar projeto. Tente novamente.');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!project || !user || project.ownerId !== user.uid) {
      showError('Apenas o dono do projeto pode excluir este projeto.');
      return;
    }

    try {
      // TODO: Deletar todos os tickets do projeto antes
      await deleteDoc(doc(db, 'projects', projectId));
      logger.success('Projeto deletado', {
        action: 'delete_project',
        metadata: { projectId },
        page: 'editar_projeto',
      });
      router.push('/projetos');
    } catch (err) {
      logger.error('Erro ao deletar projeto', {
        action: 'delete_project',
        metadata: { projectId, error: String(err) },
        page: 'editar_projeto',
      });
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!project || !user || project.ownerId !== user.uid) {
      showError('Apenas o dono do projeto pode adicionar membros.');
      return;
    }
    
    if (!newMemberEmail.trim()) return;
    
    setAddingMember(true);
    try {
      // Busca o usuário pelo email
      const foundUser = await getUserByEmail(newMemberEmail);
      
      if (!foundUser) {
        showError('Usuário não encontrado. Verifique o email.');
        return;
      }
      
      if (foundUser.id === user?.uid) {
        showError('Você já é membro deste projeto.');
        return;
      }
      
      // Adiciona o membro
      await addProjectMember(projectId, foundUser.id);
      
      // Atualiza a lista local de membros
      setMembers(prev => [...prev, foundUser]);
      setProject(prev => prev ? { 
        ...prev, 
        members: [...(prev.members || []), foundUser.id] 
      } : null);
      
      setNewMemberEmail('');
      showSuccess(`${foundUser.displayName} foi adicionado ao projeto!`);
    } catch (err) {
      const error = err as Error;
      showError(error.message || 'Erro ao adicionar membro.');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!project) return;

    if (!user || project.ownerId !== user.uid) {
      showError('Apenas o dono do projeto pode remover membros.');
      return;
    }
    
    setRemovingMemberId(memberId);
    try {
      await removeProjectMember(projectId, memberId, project.ownerId);
      
      // Atualiza a lista local de membros
      setMembers(prev => prev.filter(m => m.id !== memberId));
      setProject(prev => prev ? { 
        ...prev, 
        members: (prev.members || []).filter(id => id !== memberId) 
      } : null);
      
      showSuccess(`${memberName} foi removido do projeto.`);
    } catch (err) {
      const error = err as Error;
      showError(error.message || 'Erro ao remover membro.');
    } finally {
      setRemovingMemberId(null);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Editar Projeto">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
            <p className="text-gray-600 text-sm">Carregando projeto...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error && !project) {
    return (
      <AppLayout title="Erro">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Projeto não encontrado</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/projetos')}
              className="text-blue-600 hover:underline text-sm"
            >
              Voltar para projetos
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Editar Projeto" subtitle={project?.name}>
      <div className="px-6 py-6">
        {!isOwner && project && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Você é membro deste projeto, mas somente o dono pode alterar configurações e membros.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Principal - Formulário */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Informações do Projeto</h2>
              
              <form onSubmit={handleSave} className="space-y-5">
                {/* Nome e URL lado a lado */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nome do Projeto */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Nome do Projeto *
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Nome do projeto"
                      required
                    />
                  </div>

                  {/* URL do Projeto (não editável) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      URL do Projeto
                    </label>
                    <div className="bg-gray-50 px-4 py-2.5 rounded-lg border border-gray-200">
                      <span className="text-gray-500 text-sm mr-1">flowdesk.com/</span>
                      <span className="font-mono text-sm text-gray-700">{project?.slug}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Não pode ser alterada após criação
                    </p>
                  </div>
                </div>

                {/* Descrição */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Descrição
                  </label>
                  <RichTextEditor
                    content={description}
                    onChange={setDescription}
                    placeholder="Descreva o objetivo deste projeto... Cole links que serão automaticamente detectados!"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use a barra de ferramentas para formatar o texto. Links colados automaticamente se tornam clicáveis.
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {/* Botões de Ação */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => router.push('/projetos')}
                    className="px-5 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !isOwner}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            </div>

            {/* Card de Membros do Projeto */}
            <div className="bg-white rounded-xl shadow-md p-6 mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Membros do Projeto</h2>
              <p className="text-gray-600 text-sm mb-4">
                Adicione pessoas para colaborar neste projeto.
              </p>
              
              {/* Formulário para adicionar membro */}
              <form onSubmit={handleAddMember} className="flex gap-2 mb-4">
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="Digite o email do usuário"
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={addingMember || !newMemberEmail.trim() || !isOwner}
                  className="px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <FaUserPlus className="w-4 h-4" />
                  {addingMember ? 'Adicionando...' : 'Adicionar'}
                </button>
              </form>

              {/* Lista de membros */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {members.length === 0 ? (
                  <p className="text-gray-500 text-sm py-2">Nenhum membro encontrado.</p>
                ) : (
                  members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 font-semibold text-sm">
                            {member.displayName?.charAt(0).toUpperCase() || member.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 flex items-center gap-2 text-sm">
                            <span className="truncate">{member.displayName}</span>
                            {member.id === project?.ownerId && (
                              <span className="text-yellow-600 flex-shrink-0" title="Dono do projeto">
                                <FaCrown className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{member.email}</p>
                        </div>
                      </div>
                      
                      {/* Botão remover (não aparece para o dono) */}
                      {member.id !== project?.ownerId && (
                        <button
                          onClick={() => handleRemoveMember(member.id, member.displayName)}
                          disabled={removingMemberId === member.id || !isOwner}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                          title="Remover membro"
                        >
                          {removingMemberId === member.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <FaTrash className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Coluna Lateral */}
          <div className="space-y-6">
            {/* Ações Rápidas */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Ações Rápidas</h2>
              <p className="text-gray-600 text-sm mb-4">
                Acesse outras funcionalidades.
              </p>
              
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => router.push(`/${project?.slug}`)}
                  className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
                >
                  Ver Kanban
                </button>
                <button
                  onClick={() => router.push(`/projetos/editar/${projectId}/tickets`)}
                  className="w-full px-4 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors text-sm"
                >
                  Gerenciar Tickets
                </button>
              </div>
            </div>

            {/* Zona de Perigo */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-red-100">
              <h2 className="text-lg font-semibold text-red-700 mb-1">Zona de Perigo</h2>
              <p className="text-gray-600 text-sm mb-4">
                Ações irreversíveis para este projeto.
              </p>
              
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors text-sm"
              >
                Deletar Projeto
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Confirmar Exclusão</h2>
            <p className="text-gray-600 mb-2">
              Tem certeza que deseja deletar o projeto <strong>{project?.name}</strong>?
            </p>
            <p className="text-gray-600 mb-6">
              Esta ação não pode ser desfeita e todos os tickets serão perdidos permanentemente.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Sim, Deletar
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
