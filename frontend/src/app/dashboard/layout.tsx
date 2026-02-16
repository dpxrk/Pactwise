'use client'

import dynamic from 'next/dynamic';
import React, { useState, useEffect, Suspense } from "react";
import { useRouter, usePathname } from 'next/navigation';

import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";

// Dynamic imports for dashboard components
const DataLoadingScreen = dynamic(() => import("@/app/_components/common/DataLoadingScreen"), {
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-terminal-bg">
      <div role="status" aria-label="Loading">
        <div className="inline-block animate-spin h-12 w-12 border-2 border-purple-500 border-t-transparent" aria-hidden="true"></div>
        <span className="sr-only">Loading...</span>
      </div>
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
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showDataLoading, setShowDataLoading] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !sessionStorage.getItem('dashboardLoaded');
  });
  const isVisible = true;

  // Redirect unauthenticated users to sign-in page
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const redirectUrl = encodeURIComponent(pathname);
      router.replace(`/auth/sign-in?redirect=${redirectUrl}`);
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  useEffect(() => {
    if (showDataLoading) {
      sessionStorage.setItem('dashboardLoaded', 'true');
    }
  }, [showDataLoading]);

  // Show loading state while auth is being determined
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-terminal-bg">
        <div role="status" aria-label="Loading">
          <div className="inline-block animate-spin h-12 w-12 border-2 border-purple-500 border-t-transparent" aria-hidden="true"></div>
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  // Don't render dashboard content for unauthenticated users (redirect is in progress)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-terminal-bg">
        <div role="status" aria-label="Loading">
          <div className="inline-block animate-spin h-12 w-12 border-2 border-purple-500 border-t-transparent" aria-hidden="true"></div>
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  if (showDataLoading && isAuthenticated) {
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
        <main
          id="main-content"
          aria-label="Dashboard content"
          className={`flex-1 overflow-auto relative ${isVisible ? 'animate-slide-in-bottom' : ''}`}
        >
          <div className="min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
