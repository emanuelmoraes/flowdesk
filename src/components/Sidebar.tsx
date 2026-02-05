'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaHouse, FaFolderOpen, FaCreditCard, FaChevronLeft, FaChevronRight } from 'react-icons/fa6';

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: (collapsed: boolean) => void;
}

const menuItems = [
  {
    label: 'Para você',
    href: '/para-voce',
    icon: FaHouse,
  },
  {
    label: 'Projetos',
    href: '/projetos',
    icon: FaFolderOpen,
  },
  {
    label: 'Planos',
    href: '/planos',
    icon: FaCreditCard,
  },
];

export default function Sidebar({ collapsed: controlledCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  
  // Usa estado controlado se fornecido, senão usa interno
  const collapsed = controlledCollapsed ?? internalCollapsed;
  
  // Carrega preferência do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) {
      const value = saved === 'true';
      setInternalCollapsed(value);
      onToggle?.(value);
    }
  }, [onToggle]);

  const handleToggle = () => {
    const newValue = !collapsed;
    setInternalCollapsed(newValue);
    onToggle?.(newValue);
    localStorage.setItem('sidebar-collapsed', String(newValue));
  };

  const isActive = (href: string) => {
    if (href === '/projetos') {
      return pathname === '/projetos' || pathname.startsWith('/projetos/');
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <aside 
      className={`
        fixed left-0 top-0 h-full bg-white border-r border-gray-200 
        flex flex-col transition-all duration-300 z-40
        ${collapsed ? 'w-16' : 'w-56'}
      `}
    >
      {/* Logo */}
      <div className={`p-4 border-b border-gray-200 ${collapsed ? 'px-3' : ''}`}>
        <Link href="/projetos" className="flex items-center gap-2">
          {collapsed ? (
            <span className="text-xl font-bold text-blue-600 w-full text-center">F</span>
          ) : (
            <span className="text-xl font-bold text-gray-900">
              Flow<span className="text-blue-600">Desk</span>
            </span>
          )}
        </Link>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                    ${active 
                      ? 'bg-blue-50 text-blue-600 font-medium' 
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }
                    ${collapsed ? 'justify-center' : ''}
                  `}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-blue-600' : 'text-gray-500'}`} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Toggle Button */}
      <div className="p-3 border-t border-gray-200">
        <button
          onClick={handleToggle}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? (
            <FaChevronRight className="w-4 h-4" />
          ) : (
            <>
              <FaChevronLeft className="w-4 h-4" />
              <span className="text-sm">Recolher</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
