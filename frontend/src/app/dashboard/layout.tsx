'use client'

import dynamic from 'next/dynamic';
import React, { useState, useEffect, Suspense } from "react";

import { useTheme } from "@/contexts/ThemeContext";

// Dynamic imports for dashboard components
const DataLoadingScreen = dynamic(() => import("@/app/_components/common/DataLoadingScreen"), {
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-terminal-bg">
      <div className="inline-block animate-spin h-12 w-12 border-2 border-purple-500 border-t-transparent"></div>
    </div>
  ),
  ssr: false
});

const Header = dynamic(() => import("@/app/_components/dashboard/Header").then(mod => ({ default: mod.Header })), {
  loading: () => <div className="h-14 bg-terminal-surface border-b border-terminal-border animate-pulse"></div>,
  ssr: false
});

const SideNavigation = dynamic(() => import("@/app/_components/dashboard/SideNavigation").then(mod => ({ default: mod.SideNavigation })), {
  loading: () => <div className="w-64 bg-terminal-surface border-r border-terminal-border animate-pulse"></div>,
  ssr: false
});

interface DashboardLayoutProps {
  children?: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
}) => {
  const { isDark } = useTheme();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showDataLoading, setShowDataLoading] = useState(() => {
    // Temporarily disable loading screen to debug dashboard issue
    return false;
  });
  const isVisible = true;

  const _isLoaded = true;
  const isSignedIn = true;

  useEffect(() => {
    if (showDataLoading) {
      sessionStorage.setItem('dashboardLoaded', 'true');
    }
  }, [showDataLoading]);

  if (showDataLoading && isSignedIn) {
    return (
      <DataLoadingScreen
        onComplete={() => {
          setShowDataLoading(false);
        }}
        minimumDuration={1500}
      />
    );
  }

  return (
    <div
      className={`flex h-screen transition-colors duration-300 ${isVisible ? 'animate-fade-in' : 'opacity-0'}`}
      style={{
        backgroundColor: isDark ? '#0d0d0f' : '#f0eff4'
      }}
    >
      <Suspense fallback={<div className="w-64 bg-terminal-surface border-r border-terminal-border animate-pulse"></div>}>
        <SideNavigation className="hidden lg:flex w-64 relative z-20" />
      </Suspense>
      <div className="flex-1 flex flex-col relative">
        <Suspense fallback={<div className="h-14 bg-terminal-surface border-b border-terminal-border animate-pulse"></div>}>
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
