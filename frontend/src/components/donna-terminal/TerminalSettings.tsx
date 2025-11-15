'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Volume2, VolumeX, Bell, BellOff, Minimize, Type } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { TerminalSettings as TerminalSettingsType } from '@/hooks/useDonnaTerminal';

interface TerminalSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TerminalSettingsType;
  onUpdateSettings: (settings: Partial<TerminalSettingsType>) => void;
  className?: string;
}

export const TerminalSettings: React.FC<TerminalSettingsProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  className,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
          />

          {/* Settings Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'fixed z-50 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2',
              'w-full max-w-md',
              'bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900',
              'border-2 border-purple-500',
              'shadow-2xl',
              'font-mono',
              className
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b-2 border-purple-500 bg-purple-900/50">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-purple-300" />
                <h2 className="text-xs font-bold text-purple-100 uppercase tracking-wider">
                  TERMINAL SETTINGS
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-purple-500/20 rounded transition-colors group"
                aria-label="Close settings"
              >
                <X className="h-3.5 w-3.5 text-purple-300 group-hover:text-purple-100" />
              </button>
            </div>

            {/* Settings Content */}
            <div className="p-6 space-y-6">
              {/* Sound Settings */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {settings.soundEnabled ? (
                    <Volume2 className="h-4 w-4 text-purple-300" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-purple-300" />
                  )}
                  <span className="text-xs font-bold text-purple-100 uppercase tracking-wide">
                    SOUND EFFECTS
                  </span>
                </div>
                <button
                  onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
                  className={cn(
                    'w-full flex items-center justify-between p-3',
                    'border border-purple-500/50',
                    'hover:bg-purple-500/20',
                    'transition-all duration-200',
                    settings.soundEnabled && 'bg-purple-500/10'
                  )}
                >
                  <span className="text-xs text-purple-200">
                    {settings.soundEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <div
                    className={cn(
                      'w-10 h-5 border border-purple-500 relative transition-colors',
                      settings.soundEnabled && 'bg-purple-500'
                    )}
                  >
                    <div
                      className={cn(
                        'absolute top-0.5 w-4 h-3.5 bg-purple-100 transition-transform',
                        settings.soundEnabled ? 'right-0.5' : 'left-0.5'
                      )}
                    />
                  </div>
                </button>
              </div>

              {/* Toast Notifications */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {settings.toastNotifications ? (
                    <Bell className="h-4 w-4 text-purple-300" />
                  ) : (
                    <BellOff className="h-4 w-4 text-purple-300" />
                  )}
                  <span className="text-xs font-bold text-purple-100 uppercase tracking-wide">
                    TOAST NOTIFICATIONS
                  </span>
                </div>
                <button
                  onClick={() =>
                    onUpdateSettings({ toastNotifications: !settings.toastNotifications })
                  }
                  className={cn(
                    'w-full flex items-center justify-between p-3',
                    'border border-purple-500/50',
                    'hover:bg-purple-500/20',
                    'transition-all duration-200',
                    settings.toastNotifications && 'bg-purple-500/10'
                  )}
                >
                  <span className="text-xs text-purple-200">
                    {settings.toastNotifications ? 'Enabled' : 'Disabled'}
                  </span>
                  <div
                    className={cn(
                      'w-10 h-5 border border-purple-500 relative transition-colors',
                      settings.toastNotifications && 'bg-purple-500'
                    )}
                  >
                    <div
                      className={cn(
                        'absolute top-0.5 w-4 h-3.5 bg-purple-100 transition-transform',
                        settings.toastNotifications ? 'right-0.5' : 'left-0.5'
                      )}
                    />
                  </div>
                </button>
              </div>

              {/* Auto Minimize */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Minimize className="h-4 w-4 text-purple-300" />
                  <span className="text-xs font-bold text-purple-100 uppercase tracking-wide">
                    AUTO MINIMIZE
                  </span>
                </div>
                <button
                  onClick={() => onUpdateSettings({ autoMinimize: !settings.autoMinimize })}
                  className={cn(
                    'w-full flex items-center justify-between p-3',
                    'border border-purple-500/50',
                    'hover:bg-purple-500/20',
                    'transition-all duration-200',
                    settings.autoMinimize && 'bg-purple-500/10'
                  )}
                >
                  <span className="text-xs text-purple-200">
                    {settings.autoMinimize ? 'Enabled' : 'Disabled'}
                  </span>
                  <div
                    className={cn(
                      'w-10 h-5 border border-purple-500 relative transition-colors',
                      settings.autoMinimize && 'bg-purple-500'
                    )}
                  >
                    <div
                      className={cn(
                        'absolute top-0.5 w-4 h-3.5 bg-purple-100 transition-transform',
                        settings.autoMinimize ? 'right-0.5' : 'left-0.5'
                      )}
                    />
                  </div>
                </button>
              </div>

              {/* Font Size */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Type className="h-4 w-4 text-purple-300" />
                  <span className="text-xs font-bold text-purple-100 uppercase tracking-wide">
                    FONT SIZE
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => onUpdateSettings({ fontSize: size })}
                      className={cn(
                        'p-2 border border-purple-500/50',
                        'hover:bg-purple-500/20',
                        'transition-all duration-200',
                        'text-xs text-purple-200 uppercase',
                        settings.fontSize === size && 'bg-purple-500 text-white border-purple-400'
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-purple-100 uppercase tracking-wide">
                  THEME COLOR
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => onUpdateSettings({ theme: 'purple' })}
                    className={cn(
                      'p-3 border-2',
                      'bg-gradient-to-br from-purple-900 to-purple-800',
                      'transition-all duration-200',
                      settings.theme === 'purple' ? 'border-purple-300' : 'border-purple-500/30'
                    )}
                  >
                    <div className="text-[10px] text-purple-100 uppercase font-bold">Purple</div>
                  </button>
                  <button
                    onClick={() => onUpdateSettings({ theme: 'green' })}
                    className={cn(
                      'p-3 border-2',
                      'bg-gradient-to-br from-green-900 to-green-800',
                      'transition-all duration-200',
                      settings.theme === 'green' ? 'border-green-300' : 'border-green-500/30'
                    )}
                  >
                    <div className="text-[10px] text-green-100 uppercase font-bold">Green</div>
                  </button>
                  <button
                    onClick={() => onUpdateSettings({ theme: 'blue' })}
                    className={cn(
                      'p-3 border-2',
                      'bg-gradient-to-br from-blue-900 to-blue-800',
                      'transition-all duration-200',
                      settings.theme === 'blue' ? 'border-blue-300' : 'border-blue-500/30'
                    )}
                  >
                    <div className="text-[10px] text-blue-100 uppercase font-bold">Blue</div>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t-2 border-purple-500 bg-purple-900/50">
              <div className="text-[10px] text-purple-300 text-center space-y-1">
                <p>KEYBOARD SHORTCUTS:</p>
                <p className="text-purple-400">
                  <kbd className="px-1.5 py-0.5 bg-purple-800 border border-purple-600">Ctrl</kbd>
                  {' + '}
                  <kbd className="px-1.5 py-0.5 bg-purple-800 border border-purple-600">D</kbd>
                  {' = Toggle Terminal'}
                </p>
                <p className="text-purple-400">
                  <kbd className="px-1.5 py-0.5 bg-purple-800 border border-purple-600">Esc</kbd>
                  {' = Minimize'}
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default TerminalSettings;
