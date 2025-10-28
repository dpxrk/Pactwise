'use client';

import { Menu, Bell } from 'lucide-react';
import React from 'react';

import { Logo } from '@/app/_components/common/Logo';
import { UserMenu } from '@/app/_components/dashboard/UserMenu';
import { GlobalSearch } from '@/app/_components/search/GlobalSearch';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

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
  

  return (
    <header className="relative h-14 border-b px-4 md:px-6 flex items-center justify-between sticky top-0 z-40 animate-fade-in" style={{ backgroundColor: '#ffffff', borderColor: '#d2d1de' }}>
      {/* Mobile Navigation Trigger */}
      <div className="flex items-center gap-4 relative z-10">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden transition-all duration-200 ease-out rounded-none hover:bg-ghost-200">
              <Menu className="h-4 w-4" style={{ color: '#291528' }} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <div className="h-full" style={{ backgroundColor: '#ffffff' }}>
              <div className="p-4 border-b" style={{ borderColor: '#d2d1de' }}>
                <Logo size="sm" />
              </div>
              <SideNavigation className="h-[calc(100vh-5rem)]" />
            </div>
          </SheetContent>
        </Sheet>

        {/* Page Title */}
        <div className="hidden lg:block">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9e829c', letterSpacing: '0.1em' }}>DASHBOARD</span>
          </div>
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

      {/* Right Section: Notifications & User Menu */}
      <div className="flex items-center gap-2 relative z-10">
        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 transition-all duration-200 ease-out relative rounded-none hover:bg-ghost-200"
        >
          <Bell className="h-4 w-4" style={{ color: '#291528' }} />
          <div className="absolute top-1 right-1 h-1.5 w-1.5" style={{ backgroundColor: '#291528' }}></div>
        </Button>

        {/* User Menu */}
        <UserMenu />
      </div>
    </header>
  );
};