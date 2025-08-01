'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Conditional import to handle missing Clerk
let useAuth: any;
try {
  const clerkModule = require('@clerk/nextjs');
  useAuth = clerkModule.useAuth;
} catch (error) {
  // Mock useAuth if Clerk is not available
  useAuth = () => ({ isSignedIn: false, isLoaded: true });
}

const AuthRedirectHandler = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect once auth is loaded and user is signed in
    if (isLoaded && isSignedIn) {
      console.log('User is authenticated, redirecting to dashboard...');
      router.push('/dashboard');
    }
  }, [isLoaded, isSignedIn, router]);

  // This component doesn't render anything
  return null;
};

export default AuthRedirectHandler;