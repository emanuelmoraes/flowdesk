'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import AppHeader from '@/components/AppHeader';

interface AppLayoutProps {
  children: React.ReactNode;
  /** Título adicional exibido no header */
  title?: string;
  /** Subtítulo exibido no header */
  subtitle?: string;
  /** Elementos adicionais no lado direito do header */
  headerRightContent?: React.ReactNode;
  /** Mostra botão "Novo Projeto" no header */
  showNewProject?: boolean;
}

export default function AppLayout({ 
  children, 
  title,
  subtitle,
  headerRightContent,
  showNewProject = false,
}: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Sincroniza com localStorage no mount
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) {
      setSidebarCollapsed(saved === 'true');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader 
        title={title}
        subtitle={subtitle}
        rightContent={headerRightContent}
        showNewProject={showNewProject}
      />
      
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={setSidebarCollapsed} 
      />
      
      <main 
        className={`
          pt-14 transition-all duration-300
          ${sidebarCollapsed ? 'ml-16' : 'ml-56'}
        `}
      >
        {children}
      </main>
    </div>
  );
}
