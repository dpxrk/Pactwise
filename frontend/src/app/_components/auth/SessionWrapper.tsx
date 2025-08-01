'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useSessionTimeout, logSecurityEvent } from '@/lib/auth-session';

interface SessionWrapperProps {
  children: React.ReactNode;
}

export const SessionWrapper: React.FC<SessionWrapperProps> = ({ children }) => {
  const { isSignedIn, userId } = useAuth();
  const { extendSession } = useSessionTimeout();

  useEffect(() => {
    if (isSignedIn && userId) {
      // Log session start
      logSecurityEvent('session_started', userId, {
        timestamp: new Date().toISOString(),
      });

      // Set up page visibility change handler
      const handleVisibilityChange = () => {
        if (!document.hidden && isSignedIn) {
          // User came back to tab, extend session
          extendSession();
          logSecurityEvent('session_resumed', userId, {
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
  }, [isSignedIn, userId, extendSession]);

  return <>{children}</>;
};