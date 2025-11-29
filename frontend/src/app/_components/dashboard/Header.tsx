'use client';

import { Menu, Bell, Sun, Moon, Terminal } from 'lucide-react';
import React from 'react';
import Link from 'next/link';

import { UserMenu } from '@/app/_components/dashboard/UserMenu';
import { GlobalSearch } from '@/app/_components/dashboard/GlobalSearch';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useTheme } from '@/contexts/ThemeContext';

import { SideNavigation } from './SideNavigation';


interface HeaderProps {
  isSearchOpen: boolean;
  onSearchOpen: () => void;
  onSearchClose: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isSearchOpen,
  onSearchOpen,
  onSearchClose,
}) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header
      className={`relative h-14 border-b px-4 md:px-6 flex items-center justify-between sticky top-0 z-40 animate-fade-in transition-colors duration-300`}
      style={{
        backgroundColor: isDark ? '#131316' : '#ffffff',
        borderColor: isDark ? '#2a2a2e' : '#d2d1de'
      }}
    >
      {/* Mobile Navigation Trigger */}
      <div className="flex items-center gap-4 relative z-10">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`lg:hidden transition-all duration-200 ease-out rounded-none ${
                isDark ? 'hover:bg-terminal-hover' : 'hover:bg-ghost-200'
              }`}
            >
              <Menu
                className="h-4 w-4"
                style={{ color: isDark ? '#e0e0e0' : '#291528' }}
              />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-64 p-0"
            style={{
              backgroundColor: isDark ? '#131316' : '#ffffff',
              borderColor: isDark ? '#2a2a2e' : '#d2d1de'
            }}
          >
            <div className="h-full">
              <div
                className="p-4 border-b flex items-center gap-3"
                style={{ borderColor: isDark ? '#2a2a2e' : '#d2d1de' }}
              >
                <div className="w-7 h-7 bg-purple-600 flex items-center justify-center">
                  <Terminal className="w-3.5 h-3.5 text-white" />
                </div>
                <span
                  className="text-lg font-semibold tracking-tight"
                  style={{ color: isDark ? '#e0e0e0' : '#291528' }}
                >
                  Pactwise
                </span>
              </div>
              <SideNavigation className="h-[calc(100vh-5rem)]" />
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo for desktop */}
        <Link href="/dashboard" className="hidden lg:flex items-center gap-2">
          <div className="w-6 h-6 bg-purple-600 flex items-center justify-center">
            <Terminal className="w-3 h-3 text-white" />
          </div>
          <span
            className="text-sm font-semibold tracking-tight"
            style={{ color: isDark ? '#e0e0e0' : '#291528' }}
          >
            Pactwise
          </span>
        </Link>

        {/* Page indicator */}
        <div className="hidden lg:flex items-center gap-2">
          <span
            className="text-xs font-mono tracking-wider"
            style={{ color: isDark ? '#6b6b70' : '#9e829c' }}
          >
            /
          </span>
          <span
            className="text-xs font-mono uppercase tracking-wider"
            style={{ color: isDark ? '#9e829c' : '#9e829c' }}
          >
            DASHBOARD
          </span>
        </div>
      </div>

      {/* Global Search */}
      <div className="flex-1 max-w-xl mx-4 relative z-10">
        <GlobalSearch
          isOpen={isSearchOpen}
          onOpen={onSearchOpen}
          onClose={onSearchClose}
        />
      </div>

      {/* Right Section: Theme Toggle, Notifications & User Menu */}
      <div className="flex items-center gap-1 relative z-10">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className={`h-8 w-8 transition-all duration-200 ease-out rounded-none ${
            isDark ? 'hover:bg-terminal-hover' : 'hover:bg-ghost-200'
          }`}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? (
            <Sun className="h-4 w-4 text-warning-400" />
          ) : (
            <Moon className="h-4 w-4" style={{ color: '#291528' }} />
          )}
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 transition-all duration-200 ease-out relative rounded-none ${
            isDark ? 'hover:bg-terminal-hover' : 'hover:bg-ghost-200'
          }`}
        >
          <Bell
            className="h-4 w-4"
            style={{ color: isDark ? '#e0e0e0' : '#291528' }}
          />
          <div
            className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: isDark ? '#a855f7' : '#291528' }}
          ></div>
        </Button>

        {/* User Menu */}
        <UserMenu />
      </div>
    </header>
  );
};
