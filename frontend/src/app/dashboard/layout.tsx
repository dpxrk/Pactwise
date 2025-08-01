'use client'

import React, { useState, useEffect } from "react";
import { Header } from "@/app/_components/dashboard/Header";
import { SideNavigation } from "@/app/_components/dashboard/SideNavigation";
import { useAuth, RedirectToSignIn } from "@clerk/nextjs";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useEntranceAnimation } from "@/hooks/useAnimations";
import DataLoadingScreen from "@/app/_components/common/DataLoadingScreen";

interface DashboardLayoutProps {
  children?: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showDataLoading, setShowDataLoading] = useState(true);
  const { isSignedIn, isLoaded } = useAuth();
  const isVisible = useEntranceAnimation(100);
  
  useEffect(() => {
    // Only show data loading screen for authenticated users
    if (isLoaded && isSignedIn) {
      // Check if we've already shown the loading screen in this session
      const hasShownLoading = sessionStorage.getItem('hasShownDataLoading');
      if (hasShownLoading) {
        setShowDataLoading(false);
      }
    }
  }, [isLoaded, isSignedIn]);
  
  // Show loading state while checking auth
  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="absolute inset-0 bg-grid-pattern opacity-20" />
        <div className="text-center space-y-6 animate-fade-in relative z-10">
          <div className="glass-panel max-w-sm shadow-depth">
            <LoadingSpinner size="xl" className="mb-4" />
            <h3 className="text-lg font-semibold text-gray-200 mb-2">Loading Pactwise</h3>
            <p className="text-gray-500">Preparing your dashboard...</p>
          </div>
        </div>
        {/* Animated gradient orbs */}
        <div className="absolute top-40 right-40 w-80 h-80 bg-teal-500 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-float" />
        <div className="absolute bottom-40 left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-float animation-delay-2000" />
      </div>
    );
  }
  
  // Redirect to sign in if not authenticated
  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }
  
  // Show data loading screen for authenticated users on first load
  if (showDataLoading && isSignedIn) {
    return (
      <DataLoadingScreen 
        onComplete={() => {
          setShowDataLoading(false);
          sessionStorage.setItem('hasShownDataLoading', 'true');
        }}
        minimumDuration={2500}
      />
    );
  }

  return (
    <div className={`flex h-screen bg-background ${isVisible ? 'animate-fade-in' : 'opacity-0'}`}>
      {/* Background pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
      
      <SideNavigation className="hidden lg:flex w-72 relative z-20" />
      <div className="flex-1 flex flex-col relative">
        <Header
          isSearchOpen={isSearchOpen}
          onSearchOpen={() => setIsSearchOpen(true)}
          onSearchClose={() => setIsSearchOpen(false)}
        />
        <main className={`flex-1 overflow-auto relative ${isVisible ? 'animate-slide-in-bottom' : ''}`}>
          <div className="min-h-full">
            {children}
          </div>
        </main>
        
        {/* Premium background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-500 rounded-full mix-blend-screen filter blur-3xl opacity-5 animate-float" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-screen filter blur-3xl opacity-5 animate-float animation-delay-2000" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500 rounded-full mix-blend-screen filter blur-3xl opacity-3 animate-float animation-delay-4000" />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;