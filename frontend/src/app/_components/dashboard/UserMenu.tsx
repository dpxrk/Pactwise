'use client';

import { User, Settings, LogOut, ChevronDown } from 'lucide-react';
import React from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const UserMenu = () => {
  // TODO: Replace with actual user data from auth context
  const userName = 'User';
  const userEmail = 'user@example.com';
  const userInitials = userName.substring(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 rounded-none hover:bg-ghost-200 transition-all duration-150 px-2"
        >
          <Avatar className="h-6 w-6 mr-2">
            <AvatarFallback
              className="text-xs font-semibold"
              style={{ backgroundColor: 'rgba(41, 21, 40, 0.1)', color: '#291528' }}
            >
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium hidden md:inline" style={{ color: '#3a3e3b' }}>
            {userName}
          </span>
          <ChevronDown className="ml-2 h-3 w-3" style={{ color: '#9e829c' }} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium" style={{ color: '#291528' }}>
            {userName}
          </p>
          <p className="text-xs" style={{ color: '#80808c' }}>
            {userEmail}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" style={{ color: '#9e829c' }} />
          <span className="text-sm">Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" style={{ color: '#9e829c' }} />
          <span className="text-sm">Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <LogOut className="mr-2 h-4 w-4" style={{ color: '#9e829c' }} />
          <span className="text-sm">Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};