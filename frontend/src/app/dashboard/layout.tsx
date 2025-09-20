'use client'

import React, { useState, useEffect } from "react";

import DataLoadingScreen from "@/app/_components/common/DataLoadingScreen";
import { Header } from "@/app/_components/dashboard/Header";
import { SideNavigation } from "@/app/_components/dashboard/SideNavigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useEntranceAnimation } from "@/hooks/useAnimations";

interface DashboardLayoutProps {
  children?: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showDataLoading, setShowDataLoading] = useState(true);
  const isVisible = useEntranceAnimation(100);
  
  // TODO: Replace with Supabase auth checks
  const isLoaded = true; // Temporary: assume always loaded
  const isSignedIn = true; // Temporary: assume always signed in
  
  // Show loading screen only on initial mount
  useEffect(() => {
    // Check if we've already shown the loading screen
    const hasShownLoading = sessionStorage.getItem('dashboardLoaded');
    
    if (!hasShownLoading && isLoaded && isSignedIn) {
      setShowDataLoading(true);
      sessionStorage.setItem('dashboardLoaded', 'true');
    } else {
      setShowDataLoading(false);
    }
  }, [isLoaded, isSignedIn]);
  
  // Show data loading screen for authenticated users on first load
  if (showDataLoading && isSignedIn) {
    return (
      <DataLoadingScreen 
        onComplete={() => {
          setShowDataLoading(false);
        }}
        minimumDuration={2000}
      />
    );
  }

  return (
    <div className={`flex h-screen ${isVisible ? 'animate-fade-in' : 'opacity-0'}`} style={{ backgroundColor: '#f0eff4' }}>
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
        
        {/* Premium background decoration - using brand colors */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-3xl opacity-5 animate-float" style={{ background: '#291528' }} />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-3xl opacity-5 animate-float animation-delay-2000" style={{ background: '#9e829c' }} />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;