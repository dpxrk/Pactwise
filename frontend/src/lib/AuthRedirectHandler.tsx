'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/contexts/AuthContext';

const AuthRedirectHandler = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect once auth is loaded and user is authenticated
    if (!isLoading && isAuthenticated) {
      console.log('User is authenticated, redirecting to dashboard...');
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  // This component doesn't render anything
  return null;
};

export default AuthRedirectHandler;