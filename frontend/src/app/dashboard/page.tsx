'use client'

import React, { useEffect } from "react";
import dynamic from 'next/dynamic';
import { PremiumLoader } from '@/components/premium/PremiumLoader';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useEntranceAnimation } from "@/hooks/useAnimations";

const LazyDashboardContent = dynamic(
  () => import("@/app/_components/dashboard/LazyDashboardContent"),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <PremiumLoader size="lg" text="Loading dashboard..." />
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
  const { userProfile, isLoading, isAuthenticated } = useAuth();
  const isVisible = useEntranceAnimation(200);
  
  // Redirect to onboarding if user not found in database
  useEffect(() => {
    if (!isLoading && isAuthenticated && !userProfile) {
      // User is authenticated but doesn't have a profile in our database
      // Redirect to onboarding to create their account
      window.location.href = '/onboarding';
    }
  }, [isLoading, isAuthenticated, userProfile]);
  
  // Handle loading state - wait for auth to load
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background relative">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
        <div className="text-center space-y-6 animate-fade-in relative z-10">
          <div className="glass-panel max-w-sm shadow-depth">
            <LoadingSpinner size="xl" className="mb-4" />
            <h3 className="text-lg font-semibold text-gray-200 mb-2">Loading Dashboard</h3>
            <p className="text-gray-500">Setting up your workspace...</p>
          </div>
        </div>
        {/* Animated gradient orbs */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-500 rounded-full mix-blend-screen filter blur-3xl opacity-5 animate-float" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-screen filter blur-3xl opacity-5 animate-float animation-delay-2000" />
      </div>
    );
  }

  // Handle unauthenticated state or redirect in progress
  if (!isAuthenticated || !userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background relative">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
        <div className="text-center space-y-6 animate-fade-in relative z-10">
          <div className="glass-panel max-w-sm shadow-depth">
            <LoadingSpinner size="xl" className="mb-4" />
            <h3 className="text-lg font-semibold text-gray-200 mb-2">Setting Up Account</h3>
            <p className="text-gray-500">Redirecting to account setup...</p>
          </div>
        </div>
      </div>
    );
  }

  // Handle case where user doesn't have an enterprise - redirect to onboarding
  if (!userProfile.enterprise_id) {
    // Redirect to onboarding flow
    window.location.href = '/onboarding';
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400 mx-auto mb-4"></div>
          <p className="text-gray-500">Redirecting to setup...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <LazyDashboardContent enterpriseId={userProfile.enterprise_id} />
    </>    
  );
};

export default HomeDashboard;