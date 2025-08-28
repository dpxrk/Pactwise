'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PactwiseLogoPremium } from '@/components/ui/PactwiseLogo';
import { NAV_LINKS } from './constants';

interface NavigationProps {
  className?: string;
}

export const Navigation = React.memo<NavigationProps>(({ className = '' }) => {
  return (
    <nav className={`fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 ${className}`}>
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
                key={`nav-${index}-${link.href}`}
                href={link.href}
                className="text-gray-600 hover:text-gray-900 transition-all duration-200 relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-gray-900 group-hover:w-full transition-all duration-300" />
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              className="text-gray-600 hover:text-gray-900 hidden md:inline-flex border border-gray-300 hover:border-gray-900"
              onClick={() => (window.location.href = '/auth/sign-in')}
            >
              Sign In
            </Button>
            <Button
              className="bg-gray-900 hover:bg-gray-800 text-white border-0"
              onClick={() => (window.location.href = '/auth/sign-up')}
            >
              Get Started
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
});

Navigation.displayName = 'Navigation';