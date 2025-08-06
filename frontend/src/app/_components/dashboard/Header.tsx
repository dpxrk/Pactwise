'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Bell } from 'lucide-react';
import { GlobalSearch } from '@/app/_components/search/GlobalSearch';
import { UserMenu } from '@/app/_components/dashboard/UserMenu';
import { Logo } from '@/app/_components/common/Logo';
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
    <header className="relative h-16 border-b border-white/5 glass px-4 md:px-6 flex items-center justify-between sticky top-0 z-40 animate-fade-in">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-teal-500/5 to-transparent opacity-50" />
      <div className="glow-line-bottom" />
      {/* Mobile Navigation Trigger - Only show on mobile when left nav is hidden */}
      <div className="flex items-center gap-4 relative z-10">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden hover:bg-white/5 hover:scale-105 transition-all duration-200 ease-out group">
              <Menu className="h-5 w-5 text-gray-400 group-hover:text-teal-400 transition-colors" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 border-r border-white/10 bg-background/95 backdrop-blur-xl">
            <div className="h-full bg-gradient-to-b from-background to-background/80">
              <div className="p-4 border-b border-white/10">
                <Logo size="sm" />
              </div>
              <SideNavigation className="h-[calc(100vh-5rem)]" />
            </div>
          </SheetContent>
        </Sheet>

        {/* Breadcrumb or Page Title - Only show on larger screens */}
        <div className="hidden lg:block">
          <div className="flex items-center gap-2 text-sm">
            
            <span className="text-gray-400">Dashboard</span>
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
          className="h-9 w-9 hover:bg-white/5 hover:scale-105 transition-all duration-200 ease-out relative group"
        >
          <Bell className="h-4 w-4 text-gray-400 group-hover:text-teal-400 transition-colors" />
          {/* Notification dot - can be conditionally shown */}
          <div className="absolute -top-1 -right-1 h-2 w-2 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full animate-pulse shadow-glow-sm"></div>
        </Button>

        {/* User Menu */}
        <UserMenu />
      </div>
    </header>
  );
};