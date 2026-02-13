'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createProject, generateSlug, validateSlug } from '@/lib/services';
import { getUserFacingErrorMessage } from '@/lib/errorHandling';
import RichTextEditor from '@/components/RichTextEditor';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
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
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { showError } = useNotification();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const onboardingRequested = searchParams.get('onboarding') === '1';

  const handleNameChange = (value: string): void => {
    setName(value);
    const autoSlug = generateSlug(value);
    setSlug(autoSlug);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
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
      const projectId = await createProject(name, slug, description, user.uid);
      
      // Redireciona para o projeto criado
      const onboardingSuffix = onboardingRequested ? '?onboarding=1' : '';
      router.push(`/projetos/${projectId}${onboardingSuffix}`);
    } catch (error: unknown) {
      setError(getUserFacingErrorMessage(error, 'Erro ao criar projeto. Tente novamente.'));
      setLoading(false);
    }
  };

  return (
    <AppLayout title="Novo Projeto">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
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
                maxLength={120}
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
                  onChange={(e) => setSlug(generateSlug(e.target.value))}
                  maxLength={50}
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
        </div>
      </div>
    </AppLayout>
  );
}
