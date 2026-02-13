'use client';

import { useState, useEffect, useRef } from 'react';
import { FaBell } from 'react-icons/fa6';
import { getLogs, LogEntry } from '@/lib/logger';
import { useAuth } from '@/hooks/useAuth';

export default function NotificationBell() {
  const { userProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      const eventTarget = event.target;
      if (dropdownRef.current && eventTarget instanceof Node && !dropdownRef.current.contains(eventTarget)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Carrega notificações quando abre o dropdown
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Carrega contagem inicial de não lidas
  useEffect(() => {
    fetchUnreadCount();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const logs = await getLogs({ limit: 10 });
      setNotifications(logs);
      setUnreadCount(0); // Marca como lidas ao abrir
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const logs = await getLogs({ limit: 5 });
      // Simula contagem de não lidas (últimas 5 do dia)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const recentLogs = logs.filter(log => log.timestamp >= today);
      setUnreadCount(recentLogs.length);
    } catch {
      // Falha silenciosa
    }
  };

  const getNotificationIcon = (level: string) => {
    switch (level) {
      case 'success':
        return (
          <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
        );
      case 'error':
        return (
          <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
        );
      case 'warn':
        return (
          <span className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0" />
        );
      default:
        return (
          <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
        );
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
    }).format(date);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botão do sino */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
        title="Notificações"
      >
        <FaBell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown de notificações */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
          {/* Header do dropdown */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Notificações</h3>
          </div>

          {/* Lista de notificações */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm">Carregando...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <FaBell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma notificação</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className="px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {getNotificationIcon(notification.level)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 truncate">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {formatTime(notification.timestamp)}
                          </span>
                          {notification.action && (
                            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                              {notification.action}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer do dropdown */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
              <button
                onClick={() => {
                  setIsOpen(false);
                }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium w-full text-center"
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
