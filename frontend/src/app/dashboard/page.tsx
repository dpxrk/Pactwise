'use client'

import dynamic from 'next/dynamic';
import React, { useEffect } from "react";

import { PremiumLoader } from '@/components/premium/PremiumLoader';
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from '@/contexts/AuthContext';
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
  const { userProfile, isLoading, isAuthenticated, user, refreshProfile } = useAuth();
  const isVisible = useEntranceAnimation(200);
  
  // Redirect to onboarding if user needs setup
  useEffect(() => {
    if (!isLoading && isAuthenticated && userProfile && !userProfile.enterprise_id) {
      // User exists but needs to complete onboarding
      window.location.href = '/onboarding';
    }
  }, [isLoading, isAuthenticated, userProfile]);
  
  // Handle loading state - wait for auth to load
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen relative" style={{ backgroundColor: '#f0eff4' }}>
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
        <div className="text-center space-y-6 animate-fade-in relative z-10">
          <div className="bg-white rounded-lg p-8 max-w-sm border" style={{ borderColor: '#e5e7eb' }}>
            <LoadingSpinner size="xl" className="mb-4" />
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#291528' }}>Loading Dashboard</h3>
            <p style={{ color: '#9e829c' }}>Setting up your workspace...</p>
          </div>
        </div>
        {/* Animated gradient orbs */}
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-3xl opacity-5 animate-float" style={{ background: '#291528' }} />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-3xl opacity-5 animate-float animation-delay-2000" style={{ background: '#9e829c' }} />
      </div>
    );
  }

  // Handle unauthenticated state
  if (!isAuthenticated) {
    // Redirect to sign in
    window.location.href = '/auth/sign-in';
    return (
      <div className="flex items-center justify-center min-h-screen relative" style={{ backgroundColor: '#f0eff4' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#291528' }}></div>
          <p style={{ color: '#9e829c' }}>Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  // If authenticated but no profile yet, wait a moment for it to be created
  if (!userProfile) {
    // Try to refresh the profile after a short delay
    React.useEffect(() => {
      const timer = setTimeout(() => {
        if (refreshProfile) {
          console.log('Attempting to refresh profile...')
          refreshProfile()
        }
      }, 2000) // Wait 2 seconds then try to refresh
      
      return () => clearTimeout(timer)
    }, [refreshProfile])
    
    return (
      <div className="flex items-center justify-center min-h-screen relative" style={{ backgroundColor: '#f0eff4' }}>
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
        <div className="text-center space-y-6 animate-fade-in relative z-10">
          <div className="bg-white rounded-lg p-8 max-w-sm border" style={{ borderColor: '#e5e7eb' }}>
            <LoadingSpinner size="xl" className="mb-4" />
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#291528' }}>Setting Up Account</h3>
            <p style={{ color: '#9e829c' }}>Creating your profile...</p>
            <button 
              onClick={refreshProfile}
              className="mt-4 text-sm underline"
              style={{ color: '#9e829c' }}
            >
              Click here if this takes too long
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle case where user doesn't have an enterprise - use a demo enterprise
  if (!userProfile.enterprise_id) {
    // For development, use a demo enterprise ID
    const demoEnterpriseId = 'demo-enterprise-001';
    console.log('No enterprise found, using demo enterprise:', demoEnterpriseId);
    return (
      <LazyDashboardContent enterpriseId={demoEnterpriseId as any} />    
    );
  }

  return (
    <LazyDashboardContent enterpriseId={userProfile.enterprise_id} />    
  );
};

export default HomeDashboard;
