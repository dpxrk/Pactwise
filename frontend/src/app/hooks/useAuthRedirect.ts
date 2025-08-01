'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

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

  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    if (redirectOnSignIn && isSignedIn) {
      console.log('User signed in, redirecting to:', redirectTo);
      router.push(redirectTo);
    }

    if (redirectOnSignOut && !isSignedIn) {
      console.log('User signed out, redirecting to home');
      router.push('/');
    }
  }, [isSignedIn, isLoaded, redirectTo, redirectOnSignIn, redirectOnSignOut, router]);

  return { isSignedIn, isLoaded };
};


export const useLandingPageRedirect = () => {
  return useAuthRedirect({
    redirectTo: '/dashboard',
    redirectOnSignIn: true,
    redirectOnSignOut: false,
  });
};