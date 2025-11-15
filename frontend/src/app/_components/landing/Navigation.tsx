'use client';

import { motion } from 'framer-motion';
import { ArrowRight, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Button } from '@/components/ui/button';
import { PactwiseLogoPremium } from '@/components/ui/PactwiseLogo';
import { useAuth } from '@/contexts/AuthContext';

import { NAV_LINKS } from './constants';

interface NavigationProps {
  className?: string;
}

export const Navigation = React.memo<NavigationProps>(({ className = '' }) => {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  // Debug logging
  React.useEffect(() => {
    console.log('[Navigation] Auth state:', { isAuthenticated, isLoading });
  }, [isAuthenticated, isLoading]);

  return (
    <nav className={`fixed top-0 w-full z-50 bg-[#f0eff4]/95 backdrop-blur-md border-b border-[#9e829c]/30 ${className}`}>
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <PactwiseLogoPremium size="lg" />
          </motion.div>

          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link, index) => (
              <Link
                key={index}
                href={link.href}
                className="text-[#3a3e3b] hover:text-[#291528] transition-all duration-200 relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[#291528] group-hover:w-full transition-all duration-300" />
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {isLoading ? (
              // Show loading skeleton while auth is initializing
              <div className="flex items-center gap-4">
                <div className="hidden md:block w-20 h-10 bg-[#9e829c]/20 animate-pulse rounded"></div>
                <div className="w-28 h-10 bg-[#291528]/20 animate-pulse rounded"></div>
              </div>
            ) : isAuthenticated ? (
              <Button
                className="bg-[#291528] hover:bg-[#000000] text-[#f0eff4] border-0"
                onClick={() => router.push('/dashboard')}
              >
                <LayoutDashboard className="mr-2 w-4 h-4" />
                Dashboard
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  className="text-[#3a3e3b] hover:text-[#f0eff4] hidden md:inline-flex border border-[#9e829c] hover:border-[#291528] hover:bg-[#291528]"
                  onClick={() => router.push('/auth/sign-in')}
                  disabled={isLoading}
                >
                  Sign In
                </Button>
                <Button
                  className="bg-[#291528] hover:bg-[#000000] text-[#f0eff4] border-0"
                  onClick={() => router.push('/auth/sign-up')}
                  disabled={isLoading}
                >
                  Get Started
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
});

Navigation.displayName = 'Navigation';