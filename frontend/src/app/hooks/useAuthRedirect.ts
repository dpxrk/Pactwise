'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/contexts/AuthContext';

interface UseAuthRedirectOptions {
  redirectTo?: string;
  redirectOnSignIn?: boolean;
  redirectOnSignOut?: boolean;
}

export const useAuthRedirect = (options: UseAuthRedirectOptions = {}) => {
  const {
    redirectTo = '/dashboard',
    redirectOnSignIn = true,
    redirectOnSignOut = false,
  } = options;

  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (redirectOnSignIn && isAuthenticated) {
      router.push(redirectTo);
    }

    if (redirectOnSignOut && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, redirectTo, redirectOnSignIn, redirectOnSignOut, router]);

  return { isAuthenticated, isLoading };
};


export const useLandingPageRedirect = () => {
  return useAuthRedirect({
    redirectTo: '/dashboard',
    redirectOnSignIn: true,
    redirectOnSignOut: false,
  });
};