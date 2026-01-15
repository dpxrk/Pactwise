'use client';

import React, { useEffect } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useSessionTimeout, logSecurityEvent } from '@/lib/auth-session';

interface SessionWrapperProps {
  children: React.ReactNode;
}

export const SessionWrapper: React.FC<SessionWrapperProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const { extendSession } = useSessionTimeout();

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      // Log session start
      logSecurityEvent('session_started', user.id, {
        timestamp: new Date().toISOString(),
      });

      // Set up page visibility change handler
      const handleVisibilityChange = () => {
        if (!document.hidden && isAuthenticated) {
          // User came back to tab, extend session
          extendSession();
          logSecurityEvent('session_resumed', user.id, {
            timestamp: new Date().toISOString(),
          });
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
    return undefined;
  }, [isAuthenticated, user?.id, extendSession]);

  return children;
};