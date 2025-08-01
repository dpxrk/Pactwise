import { useAuth } from '@clerk/nextjs';
import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

// Session timeout configuration
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_TIME = 5 * 60 * 1000; // 5 minutes before timeout
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

interface SessionManager {
  lastActivity: number;
  timeoutId: NodeJS.Timeout | null;
  warningId: NodeJS.Timeout | null;
  isWarningShown: boolean;
}

// Global session manager
const sessionManager: SessionManager = {
  lastActivity: Date.now(),
  timeoutId: null,
  warningId: null,
  isWarningShown: false,
};

// Session timeout hook
export const useSessionTimeout = () => {
  const { signOut, isSignedIn } = useAuth();
  const router = useRouter();
  const sessionManagerRef = useRef(sessionManager);

  const resetSession = useCallback(() => {
    sessionManagerRef.current.lastActivity = Date.now();
    sessionManagerRef.current.isWarningShown = false;
    
    // Clear existing timeouts
    if (sessionManagerRef.current.timeoutId) {
      clearTimeout(sessionManagerRef.current.timeoutId);
    }
    if (sessionManagerRef.current.warningId) {
      clearTimeout(sessionManagerRef.current.warningId);
    }

    // Set warning timeout
    sessionManagerRef.current.warningId = setTimeout(() => {
      if (!sessionManagerRef.current.isWarningShown) {
        sessionManagerRef.current.isWarningShown = true;
        // Show warning modal/toast
        const shouldExtend = window.confirm(
          'Your session will expire in 5 minutes due to inactivity. Would you like to extend your session?'
        );
        
        if (shouldExtend) {
          resetSession();
        }
      }
    }, SESSION_TIMEOUT - WARNING_TIME);

    // Set logout timeout
    sessionManagerRef.current.timeoutId = setTimeout(async () => {
      await signOut();
      router.push('/auth/sign-in?reason=session_expired');
    }, SESSION_TIMEOUT);
  }, [signOut, router]);

  const handleActivity = useCallback(() => {
    if (isSignedIn) {
      resetSession();
    }
  }, [isSignedIn, resetSession]);

  useEffect(() => {
    if (!isSignedIn) return;

    // Initialize session
    resetSession();

    // Add activity listeners
    ACTIVITY_EVENTS.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Cleanup
    return () => {
      ACTIVITY_EVENTS.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      
      if (sessionManagerRef.current.timeoutId) {
        clearTimeout(sessionManagerRef.current.timeoutId);
      }
      if (sessionManagerRef.current.warningId) {
        clearTimeout(sessionManagerRef.current.warningId);
      }
    };
  }, [isSignedIn, handleActivity, resetSession]);

  return {
    extendSession: resetSession,
    timeUntilTimeout: () => {
      const elapsed = Date.now() - sessionManagerRef.current.lastActivity;
      return Math.max(0, SESSION_TIMEOUT - elapsed);
    },
  };
};

// IP-based rate limiting utility
export const createIPRateLimit = () => {
  const attempts = new Map<string, { count: number; resetTime: number }>();
  const maxAttempts = 5;
  const windowMs = 15 * 60 * 1000; // 15 minutes

  return {
    isRateLimited: (ip: string): boolean => {
      const now = Date.now();
      const record = attempts.get(ip);

      if (!record || now > record.resetTime) {
        attempts.set(ip, { count: 1, resetTime: now + windowMs });
        return false;
      }

      if (record.count >= maxAttempts) {
        return true;
      }

      record.count++;
      return false;
    },

    getRemainingAttempts: (ip: string): number => {
      const record = attempts.get(ip);
      if (!record || Date.now() > record.resetTime) {
        return maxAttempts;
      }
      return Math.max(0, maxAttempts - record.count);
    },

    reset: (ip: string): void => {
      attempts.delete(ip);
    },
  };
};

// Enhanced permission checking
export const checkEnhancedPermissions = (
  userRole: string,
  requiredLevel: number,
  resourceOwner?: string,
  userId?: string,
  department?: string,
  resourceDepartment?: string
): boolean => {
  // Role hierarchy levels
  const roleLevels: Record<string, number> = {
    viewer: 1,
    user: 2,
    manager: 3,
    admin: 4,
    owner: 5,
  };

  const userLevel = roleLevels[userRole] || 0;

  // Basic role check
  if (userLevel >= requiredLevel) {
    return true;
  }

  // Resource ownership check
  if (resourceOwner && userId && resourceOwner === userId) {
    return userLevel >= 2; // Users can manage their own resources
  }

  // Department-level access for managers
  if (userRole === 'manager' && department && resourceDepartment) {
    return department === resourceDepartment;
  }

  return false;
};

// Audit logging utility
export const logSecurityEvent = (
  event: string,
  userId?: string,
  details?: Record<string, any>
) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    userId,
    details,
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
    ip: typeof window !== 'undefined' ? 
      // This would need to be passed from server-side
      details?.ip || 'unknown' : 'server',
  };

  // In production, send to logging service
  console.log('Security Event:', logEntry);
  
  // Store in local storage for client-side events (development only)
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const events = JSON.parse(localStorage.getItem('security_events') || '[]');
    events.push(logEntry);
    // Keep only last 100 events
    if (events.length > 100) {
      events.splice(0, events.length - 100);
    }
    localStorage.setItem('security_events', JSON.stringify(events));
  }
};