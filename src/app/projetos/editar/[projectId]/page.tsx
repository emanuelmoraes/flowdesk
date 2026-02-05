'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
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
    const membersData = await getUsersByIds(memberIds);
    setMembers(membersData);
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
        updatedAt: new Date(),
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando projeto...</p>
        </div>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Erro</h1>
          <p className="text-xl text-gray-600 mb-8">{error}</p>
          <button
            onClick={() => router.push('/projetos')}
            className="text-blue-600 hover:underline"
          >
            Voltar para projetos
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppLayout title="Editar Projeto" subtitle={project?.name}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">

            <form onSubmit={handleSave} className="space-y-6">
              {/* Nome do Projeto */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Projeto *
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Nome do projeto"
                  required
                />
              </div>

              {/* URL do Projeto (não editável) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL do Projeto
                </label>
                <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                  <span className="text-gray-500 text-sm mr-2">flowdesk.com/</span>
                  <span className="font-mono text-sm text-gray-700">{project?.slug}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  A URL não pode ser alterada após a criação
                </p>
              </div>

              {/* Descrição */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
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
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => router.push('/projetos')}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>

            {/* Ações Rápidas */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Ações Rápidas</h2>
              <p className="text-gray-600 text-sm mb-4">
                Acesse outras funcionalidades do projeto.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => router.push(`/${project?.slug}`)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Ver Kanban
                </button>
                <button
                  onClick={() => router.push(`/projetos/editar/${projectId}/tickets`)}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                >
                  Gerenciar Tickets
                </button>
              </div>
            </div>

            {/* Gerenciar Membros */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Membros do Projeto</h2>
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
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={addingMember || !newMemberEmail.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <FaUserPlus className="w-4 h-4" />
                  {addingMember ? 'Adicionando...' : 'Adicionar'}
                </button>
              </form>

              {/* Lista de membros */}
              <div className="space-y-2">
                {members.length === 0 ? (
                  <p className="text-gray-500 text-sm py-2">Nenhum membro encontrado.</p>
                ) : (
                  members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-sm">
                            {member.displayName?.charAt(0).toUpperCase() || member.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 flex items-center gap-2">
                            {member.displayName}
                            {member.id === project?.ownerId && (
                              <span className="text-yellow-600" title="Dono do projeto">
                                <FaCrown className="w-4 h-4" />
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-500">{member.email}</p>
                        </div>
                      </div>
                      
                      {/* Botão remover (não aparece para o dono) */}
                      {member.id !== project?.ownerId && (
                        <button
                          onClick={() => handleRemoveMember(member.id, member.displayName)}
                          disabled={removingMemberId === member.id}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
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

            {/* Zona de Perigo */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Zona de Perigo</h2>
              <p className="text-gray-600 text-sm mb-4">
                Ações irreversíveis que afetam permanentemente este projeto.
              </p>
              
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
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
