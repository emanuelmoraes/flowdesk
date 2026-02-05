'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { logger, LogLevel } from '@/lib/logger';

interface NotificationContextType {
  showToast: (type: ToastType, message: string, options?: ToastOptions) => void;
  showSuccess: (message: string, options?: ToastOptions) => void;
  showError: (message: string, options?: ToastOptions) => void;
  showWarning: (message: string, options?: ToastOptions) => void;
  showInfo: (message: string, options?: ToastOptions) => void;
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
}

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  duration?: number;
  action?: string;
  metadata?: Record<string, unknown>;
  page?: string;
  userId?: string;
  skipLog?: boolean;
}

interface ConfirmOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    message: string;
    options?: ConfirmOptions;
    resolve?: (value: boolean) => void;
  }>({ isOpen: false, message: '' });

  const showToast = useCallback((
    type: ToastType,
    message: string,
    options: ToastOptions = {}
  ) => {
    const duration = options.duration ?? 4000;

    // Exibe o toast usando react-hot-toast
    switch (type) {
      case 'success':
        toast.success(message, { duration });
        break;
      case 'error':
        toast.error(message, { duration });
        break;
      case 'warning':
        toast(message, { 
          duration,
          icon: '⚠️',
          style: {
            background: '#FEF3C7',
            color: '#92400E',
            border: '1px solid #F59E0B',
          },
        });
        break;
      case 'info':
        toast(message, { 
          duration,
          icon: 'ℹ️',
          style: {
            background: '#DBEAFE',
            color: '#1E40AF',
            border: '1px solid #3B82F6',
          },
        });
        break;
    }

    // Salva log no Firestore (se não for skipLog)
    if (!options.skipLog) {
      const logLevel: LogLevel = type === 'success' ? 'success' 
        : type === 'error' ? 'error' 
        : type === 'warning' ? 'warn' 
        : 'info';
      
      logger[logLevel === 'warn' ? 'warn' : logLevel](message, {
        action: options.action,
        metadata: options.metadata,
        page: options.page,
        userId: options.userId,
      });
    }
  }, []);

  const showSuccess = useCallback((message: string, options?: ToastOptions) => {
    showToast('success', message, options);
  }, [showToast]);

  const showError = useCallback((message: string, options?: ToastOptions) => {
    showToast('error', message, options);
  }, [showToast]);

  const showWarning = useCallback((message: string, options?: ToastOptions) => {
    showToast('warning', message, options);
  }, [showToast]);

  const showInfo = useCallback((message: string, options?: ToastOptions) => {
    showToast('info', message, options);
  }, [showToast]);

  const confirm = useCallback((message: string, options?: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        message,
        options,
        resolve,
      });
    });
  }, []);

  const handleConfirmClose = (result: boolean) => {
    confirmState.resolve?.(result);
    setConfirmState({ isOpen: false, message: '' });
  };

  return (
    <NotificationContext.Provider
      value={{
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        confirm,
      }}
    >
      {children}

      {/* React Hot Toast Container */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '14px',
          },
          success: {
            style: {
              background: '#ECFDF5',
              color: '#065F46',
              border: '1px solid #10B981',
            },
          },
          error: {
            style: {
              background: '#FEF2F2',
              color: '#991B1B',
              border: '1px solid #EF4444',
            },
          },
        }}
      />

      {/* Confirm Modal */}
      {confirmState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {confirmState.options?.title || 'Confirmação'}
            </h3>
            <p className="text-gray-600 mb-6">{confirmState.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => handleConfirmClose(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {confirmState.options?.cancelText || 'Cancelar'}
              </button>
              <button
                onClick={() => handleConfirmClose(true)}
                className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                {confirmState.options?.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

// Hook para usar notificações
export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification deve ser usado dentro de NotificationProvider');
  }
  return context;
}
