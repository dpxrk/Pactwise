'use client'

import dynamic from 'next/dynamic';
import React, { useEffect } from "react";

import { PremiumLoader } from '@/components/premium/PremiumLoader';
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { DashboardErrorBoundary } from '@/components/error-boundary';
import { useAuth } from '@/contexts/AuthContext';
import { useEntranceAnimation } from "@/hooks/useAnimations";

const LazyDashboardContent = dynamic(
  () => import("@/app/_components/dashboard/LazyDashboardContent"),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <PremiumLoader />
      </div>
    ),
    ssr: false
  }
);

interface HomeDashboardProps {
  params?: Promise<{ [key: string]: string | string[] | undefined }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

const HomeDashboard: React.FC<HomeDashboardProps> = () => {
  const { userProfile, isLoading, isAuthenticated, user, refreshProfile, profileError } = useAuth();
  const _isVisible = useEntranceAnimation(200);
  const [hasTriedRefresh, setHasTriedRefresh] = React.useState(false);
  const [isManuallyRetrying, setIsManuallyRetrying] = React.useState(false);

  // Redirect to onboarding if user needs setup
  useEffect(() => {
    if (!isLoading && isAuthenticated && userProfile && !userProfile.enterprise_id) {
      // User exists but needs to complete onboarding
      window.location.href = '/onboarding';
    }
  }, [isLoading, isAuthenticated, userProfile]);

  // Try to refresh profile if user is authenticated but no profile exists
  useEffect(() => {
    if (!isLoading && isAuthenticated && !userProfile && !hasTriedRefresh && refreshProfile) {
      const timer = setTimeout(() => {
        refreshProfile();
        setHasTriedRefresh(true);
      }, 2000); // Wait 2 seconds then try to refresh once

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isLoading, isAuthenticated, userProfile, hasTriedRefresh, refreshProfile]);

  // Handle loading state - wait for auth to load
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen relative bg-ghost-100">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
        <div className="text-center space-y-6 animate-fade-in relative z-10">
          <div className="bg-white p-8 max-w-sm border border-ghost-300">
            <LoadingSpinner size="xl" className="mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-ghost-600">Loading Dashboard</h3>
            <p className="text-ghost-400">Setting up your workspace...</p>
          </div>
        </div>
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-3xl opacity-5 animate-float bg-ghost-600" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-3xl opacity-5 animate-float animation-delay-2000 bg-ghost-400" />
      </div>
    );
  }

  // Handle unauthenticated state - ONLY after loading is complete
  if (!isLoading && !isAuthenticated) {
    // Redirect to sign in
    window.location.href = '/auth/sign-in';
    return (
      <div className="flex items-center justify-center min-h-screen relative bg-ghost-100">
        <div className="text-center" role="status" aria-label="Loading">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ghost-600 mx-auto mb-4" aria-hidden="true"></div>
          <p className="text-ghost-400">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  // If authenticated but no profile yet, show setup screen
  if (!userProfile) {
    const handleManualRetry = async () => {
      setIsManuallyRetrying(true);
      await refreshProfile();
      setIsManuallyRetrying(false);
      setHasTriedRefresh(true);
    };

    return (
      <div className="flex items-center justify-center min-h-screen relative bg-ghost-100">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
        <div className="text-center space-y-6 animate-fade-in relative z-10">
          <div className="bg-white p-8 max-w-md border border-ghost-300">
            {profileError ? (
              <>
                <div className="text-red-500 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-red-600">Profile Setup Failed</h3>
                <p className="text-sm mb-4 text-ghost-400">
                  We couldn&apos;t create your profile automatically. This might be a temporary issue.
                </p>
                <p className="text-xs mb-4 font-mono text-gray-500">
                  User ID: {user?.id.slice(0, 8)}...
                </p>
                <div className="space-y-2">
                  <button
                    onClick={handleManualRetry}
                    disabled={isManuallyRetrying}
                    className="w-full px-4 py-2 bg-purple-900 text-white rounded hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isManuallyRetrying ? 'Retrying...' : 'Retry Profile Creation'}
                  </button>
                  <button
                    onClick={() => window.location.href = '/auth/sign-out'}
                    className="w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-ghost-600"
                  >
                    Sign Out and Try Again
                  </button>
                </div>
                <p className="text-xs mt-4 text-ghost-400">
                  Check the browser console (F12) for error details
                </p>
              </>
            ) : (
              <>
                <LoadingSpinner size="xl" className="mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-ghost-600">Setting Up Account</h3>
                <p className="text-ghost-400">Creating your profile...</p>
                <p className="text-xs mt-2 font-mono text-gray-500">
                  User: {user?.email}
                </p>
                <button
                  onClick={handleManualRetry}
                  disabled={isManuallyRetrying}
                  className="mt-4 text-sm underline hover:no-underline disabled:opacity-50 text-ghost-400"
                >
                  {isManuallyRetrying ? 'Retrying...' : 'Click here if this takes too long'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Handle case where user doesn't have an enterprise - redirect to onboarding
  if (!userProfile.enterprise_id) {
    window.location.href = '/onboarding';
    return (
      <div className="flex items-center justify-center min-h-screen relative bg-ghost-100">
        <div className="text-center" role="status" aria-label="Loading">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ghost-600 mx-auto mb-4" aria-hidden="true"></div>
          <p className="text-ghost-400">Redirecting to onboarding...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardErrorBoundary fallbackTitle="Dashboard" showDetails={true}>
      <LazyDashboardContent enterpriseId={userProfile.enterprise_id} />
    </DashboardErrorBoundary>
  );
};

export default HomeDashboard;
