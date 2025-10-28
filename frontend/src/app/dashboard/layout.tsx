'use client'

import dynamic from 'next/dynamic';
import React, { useState, useEffect, Suspense } from "react";

import { useEntranceAnimation } from "@/hooks/useAnimations";

// Dynamic imports for dashboard components
const DataLoadingScreen = dynamic(() => import("@/app/_components/common/DataLoadingScreen"), {
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-ghost-100">
      <div className="inline-block animate-spin h-12 w-12 border-2 border-purple-900 border-t-transparent"></div>
    </div>
  ),
  ssr: false
});

const Header = dynamic(() => import("@/app/_components/dashboard/Header").then(mod => ({ default: mod.Header })), {
  loading: () => <div className="h-16 bg-white border-b border-ghost-300 animate-pulse"></div>,
  ssr: false
});

const SideNavigation = dynamic(() => import("@/app/_components/dashboard/SideNavigation").then(mod => ({ default: mod.SideNavigation })), {
  loading: () => <div className="w-72 bg-white border-r border-ghost-300 animate-pulse"></div>,
  ssr: false
});

interface DashboardLayoutProps {
  children?: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showDataLoading, setShowDataLoading] = useState(() => {
    // Temporarily disable loading screen to debug dashboard issue
    // TODO: Re-enable after fixing dashboard
    return false;

    // Only show loading screen if it hasn't been shown in this session
    // if (typeof window === 'undefined') return false;
    // return !sessionStorage.getItem('dashboardLoaded');
  });
  // Temporarily disable entrance animation to debug dashboard
  const isVisible = true; // useEntranceAnimation(100);

  // TODO: Replace with Supabase auth checks
  const isLoaded = true; // Temporary: assume always loaded
  const isSignedIn = true; // Temporary: assume always signed in

  // Mark as loaded when component mounts
  useEffect(() => {
    if (showDataLoading) {
      sessionStorage.setItem('dashboardLoaded', 'true');
    }
  }, [showDataLoading]);

  // Show data loading screen for authenticated users on first load
  if (showDataLoading && isSignedIn) {
    return (
      <DataLoadingScreen
        onComplete={() => {
          console.log('DataLoadingScreen completed, hiding loading screen');
          setShowDataLoading(false);
        }}
        minimumDuration={1500}
      />
    );
  }

  return (
    <div className={`flex h-screen ${isVisible ? 'animate-fade-in' : 'opacity-0'}`} style={{ backgroundColor: '#f0eff4' }}>
      <Suspense fallback={<div className="w-72 bg-white border-r border-ghost-300 animate-pulse"></div>}>
        <SideNavigation className="hidden lg:flex w-72 relative z-20" />
      </Suspense>
      <div className="flex-1 flex flex-col relative">
        <Suspense fallback={<div className="h-16 bg-white border-b border-ghost-300 animate-pulse"></div>}>
          <Header
            isSearchOpen={isSearchOpen}
            onSearchOpen={() => setIsSearchOpen(true)}
            onSearchClose={() => setIsSearchOpen(false)}
          />
        </Suspense>
        <main className={`flex-1 overflow-auto relative ${isVisible ? 'animate-slide-in-bottom' : ''}`}>
          <div className="min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;