"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, Info, AlertCircle, X, Sparkles } from 'lucide-react';
import { useGlitch } from '@/hooks/usePremiumEffects';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toast: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

const ToastItem: React.FC<Toast & { onDismiss: () => void }> = ({
  type,
  title,
  description,
  action,
  onDismiss,
}) => {
  const { isGlitching, triggerGlitch } = useGlitch();

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
  };

  const colors = {
    success: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
    error: 'from-red-500/20 to-rose-500/20 border-red-500/30',
    info: 'from-blue-500/20 to-sky-500/20 border-blue-500/30',
    warning: 'from-amber-500/20 to-orange-500/20 border-amber-500/30',
  };

  const iconColors = {
    success: 'text-green-400',
    error: 'text-red-400',
    info: 'text-blue-400',
    warning: 'text-amber-400',
  };

  return (
    <div
      className={cn(
        'glass-card max-w-sm w-full pointer-events-auto',
        'bg-gradient-to-r border',
        colors[type],
        'animate-slide-in-right',
        isGlitching && 'glitch'
      )}
      onMouseEnter={() => type === 'error' && triggerGlitch(200)}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn('mt-0.5', iconColors[type])}>
            {icons[type]}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white flex items-center gap-2">
              {title}
              {type === 'success' && (
                <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
              )}
            </h3>
            {description && (
              <p className="mt-1 text-sm text-gray-400">{description}</p>
            )}
            {action && (
              <button
                onClick={action.onClick}
                className="mt-2 text-sm font-medium text-teal-400 hover:text-teal-300 transition-colors"
              >
                {action.label}
              </button>
            )}
          </div>
          <button
            onClick={onDismiss}
            className="text-gray-500 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="h-1 bg-white/10 overflow-hidden">
        <div
          className={cn(
            'h-full bg-gradient-to-r from-teal-400 to-cyan-400',
            'animate-[shrink_3s_linear_forwards]'
          )}
          style={{
            animationDuration: `${3000}ms`,
          }}
        />
      </div>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((newToast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString();
    const duration = newToast.duration || 3000;
    
    setToasts(prev => [...prev, { ...newToast, id }]);
    
    // Add particle effect for success toasts
    if (newToast.type === 'success') {
      // Trigger confetti or particle explosion
    }
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div className="fixed bottom-0 right-0 z-50 p-4 space-y-4 pointer-events-none">
        {toasts.map(toast => (
          <ToastItem
            key={toast.id}
            {...toast}
            onDismiss={() => dismiss(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// CSS for shrink animation - inject only on client side
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shrink {
      from { width: 100%; }
      to { width: 0%; }
    }
  `;
  document.head.appendChild(style);
}