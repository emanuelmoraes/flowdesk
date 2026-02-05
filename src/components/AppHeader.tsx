'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import NotificationBell from '@/components/NotificationBell';
import { FaGear, FaArrowRightFromBracket } from 'react-icons/fa6';

interface AppHeaderProps {
  /** Título adicional exibido após o separador */
  title?: string;
  /** Subtítulo exibido abaixo do título */
  subtitle?: string;
  /** Elementos adicionais no lado direito do header */
  rightContent?: React.ReactNode;
  /** Mostra botão "Novo Projeto" (padrão: true na página /projetos) */
  showNewProject?: boolean;
}

export default function AppHeader({ 
  title, 
  subtitle,
  rightContent,
  showNewProject = false,
}: AppHeaderProps) {
  const router = useRouter();
  const { signOut, userProfile } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Lado esquerdo - Logo e título */}
          <div className="flex items-center gap-4">
            <Link href="/projetos" className="text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
              Flow<span className="text-blue-600">Desk</span>
            </Link>
            
            {title && (
              <>
                <div className="h-6 w-px bg-gray-300"></div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
                  {subtitle && (
                    <p className="text-sm text-gray-500">{subtitle}</p>
                  )}
                </div>
              </>
            )}
            
            {!title && (
              <p className="text-gray-600 text-sm">Gerenciamento de Projetos</p>
            )}
          </div>
          
          {/* Lado direito - Ações */}
          <div className="flex items-center gap-3">
            {userProfile && (
              <span className="text-sm text-gray-600 hidden sm:block">
                Olá, <span className="font-medium">{userProfile.displayName || userProfile.email}</span>
              </span>
            )}
            
            <NotificationBell />
            
            <button
              onClick={() => router.push('/settings')}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Configurações"
            >
              <FaGear className="w-5 h-5" />
            </button>
            
            {showNewProject && (
              <button
                onClick={() => router.push('/criar-projeto')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md hover:shadow-lg"
              >
                + Novo Projeto
              </button>
            )}
            
            {rightContent}
            
            <button
              onClick={handleLogout}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Sair"
            >
              <FaArrowRightFromBracket className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
