'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProject, validateSlug } from '@/lib/services';
import RichTextEditor from '@/components/RichTextEditor';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useNotification } from '@/hooks/useNotification';
import { useAuth } from '@/hooks/useAuth';

export default function CriarProjetoPage() {
  return (
    <ProtectedRoute>
      <CriarProjetoContent />
    </ProtectedRoute>
  );
}

function CriarProjetoContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { showError } = useNotification();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNameChange = (value: string) => {
    setName(value);
    // Auto-gera o slug baseado no nome
    const autoSlug = value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '-') // Substitui espaços por hífens
      .replace(/-+/g, '-') // Remove hífens duplicados
      .trim();
    setSlug(autoSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!name.trim() || !slug.trim()) {
      setError('Nome e slug são obrigatórios');
      return;
    }

    // Validação do slug usando função utilitária
    const validation = validateSlug(slug);
    if (!validation.valid) {
      setError(validation.error || 'Slug inválido');
      return;
    }

    setLoading(true);

    try {
      if (!user) {
        showError('Você precisa estar logado para criar um projeto.');
        return;
      }

      // Descrição agora é HTML do RichTextEditor
      await createProject(name, slug, description, user.uid);
      
      // Redireciona para o projeto criado
      router.push(`/${slug}`);
    } catch (error: unknown) {
      const err = error as Error;
      setError(err.message || 'Erro ao criar projeto. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Botão Voltar */}
        <button
          onClick={() => router.push('/projetos')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <span className="text-xl">←</span>
          <span className="font-medium">Voltar para projetos</span>
        </button>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Criar Novo Projeto
          </h1>
          <p className="text-gray-600">
            Configure seu projeto e comece a organizar suas tarefas
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Projeto *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Meu Projeto Incrível"
                required
              />
            </div>

            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
                URL do Projeto *
              </label>
              <div className="flex items-center">
                <span className="text-gray-500 text-sm mr-2">flowdesk.com/</span>
                <input
                  type="text"
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-sm"
                  placeholder="meu-projeto"
                  required
                  pattern="[a-z0-9-]+"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Apenas letras minúsculas, números e hífens
              </p>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Descrição (opcional)
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
                disabled={loading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Criando...' : 'Criar Projeto'}
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Após criar, você poderá acessar seu projeto em<br />
          <span className="font-mono text-blue-600">flowdesk.com/{slug || 'seu-projeto'}</span>
        </p>
      </div>
    </div>
  );
}
