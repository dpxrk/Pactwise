'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, 
  FileText, 
  Building, 
  Users, 
  BarChart3,
  Settings,
  Menu,
  X,
  Search,
  Bell,
  Plus,
  ChevronRight,
  User,
  LogOut,
  Moon,
  Sun,
  Zap,
  Calendar,
  Archive,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  Grid,
  List
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useUser, useClerk } from '@clerk/nextjs';

// Navigation item interface
interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
  subItems?: NavItem[];
  isActive?: boolean;
}

// Main navigation items
const mainNavItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    href: '/dashboard'
  },
  {
    id: 'contracts',
    label: 'Contracts',
    icon: FileText,
    href: '/dashboard/contracts',
    badge: 12,
    subItems: [
      { id: 'active', label: 'Active', icon: CheckCircle, href: '/dashboard/contracts/active' },
      { id: 'drafts', label: 'Drafts', icon: Clock, href: '/dashboard/contracts/drafts' },
      { id: 'pending', label: 'Pending', icon: AlertCircle, href: '/dashboard/contracts/pending' },
      { id: 'expired', label: 'Expired', icon: Archive, href: '/dashboard/contracts/expired' },
    ]
  },
  {
    id: 'vendors',
    label: 'Vendors',
    icon: Building,
    href: '/dashboard/vendors',
    badge: 8,
    subItems: [
      { id: 'active-vendors', label: 'Active', icon: CheckCircle, href: '/dashboard/vendors/active' },
      { id: 'inactive-vendors', label: 'Inactive', icon: Archive, href: '/dashboard/vendors/inactive' },
    ]
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    href: '/dashboard/analytics'
  },
  {
    id: 'agents',
    label: 'AI Agents',
    icon: Zap,
    href: '/dashboard/agents',
    badge: 3
  }
];

// Quick actions
const quickActions = [
  {
    id: 'new-contract',
    label: 'New Contract',
    icon: FileText,
    href: '/dashboard/contracts/new',
    color: 'bg-blue-500'
  },
  {
    id: 'search',
    label: 'Search',
    icon: Search,
    href: '/dashboard/search',
    color: 'bg-green-500'
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: Calendar,
    href: '/dashboard/calendar',
    color: 'bg-purple-500'
  }
];

// Mobile navigation props
export interface MobileNavigationProps {
  className?: string;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({ className }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();
  
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(5);

  // Check if item is active
  const isActiveItem = (item: NavItem): boolean => {
    if (pathname === item.href) return true;
    if (item.subItems) {
      return item.subItems.some(subItem => pathname === subItem.href);
    }
    return pathname.startsWith(item.href) && item.href !== '/dashboard';
  };

  // Toggle expanded items
  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Handle navigation
  const handleNavigation = (href: string) => {
    router.push(href);
    setIsOpen(false);
  };

  // Handle sign out
  const handleSignOut = () => {
    signOut();
    setIsOpen(false);
  };

  // Bottom tab bar for main navigation
  const BottomTabBar: React.FC = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t md:hidden z-50">
      <div className="flex items-center justify-around py-2">
        {mainNavItems.slice(0, 4).map(item => {
          const IconComponent = item.icon;
          const isActive = isActiveItem(item);
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.href)}
              className={cn(
                'flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors relative',
                isActive 
                  ? 'text-primary bg-primary/10' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className="relative">
                <IconComponent className="h-5 w-5" />
                {item.badge && item.badge > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </Badge>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
        
        {/* More button */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors relative text-muted-foreground hover:text-foreground">
              <div className="relative">
                <Menu className="h-5 w-5" />
                {notifications > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs flex items-center justify-center bg-red-500">
                    {notifications > 99 ? '99+' : notifications}
                  </Badge>
                )}
              </div>
              <span className="text-xs font-medium">More</span>
            </button>
          </SheetTrigger>
        </Sheet>
      </div>
    </div>
  );

  // Navigation item component
  const NavItemComponent: React.FC<{ item: NavItem; level?: number }> = ({ item, level = 0 }) => {
    const IconComponent = item.icon;
    const isActive = isActiveItem(item);
    const isExpanded = expandedItems.has(item.id);
    const hasSubItems = item.subItems && item.subItems.length > 0;

    return (
      <div>
        <button
          onClick={() => {
            if (hasSubItems) {
              toggleExpanded(item.id);
            } else {
              handleNavigation(item.href);
            }
          }}
          className={cn(
            'w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left',
            level > 0 && 'ml-4 pl-8',
            isActive 
              ? 'bg-primary text-primary-foreground' 
              : 'hover:bg-muted'
          )}
        >
          <div className="flex items-center gap-3">
            <IconComponent className="h-5 w-5" />
            <span className="font-medium">{item.label}</span>
            {item.badge && item.badge > 0 && (
              <Badge variant={isActive ? 'secondary' : 'default'} className="text-xs">
                {item.badge > 99 ? '99+' : item.badge}
              </Badge>
            )}
          </div>
          
          {hasSubItems && (
            <ChevronRight className={cn(
              'h-4 w-4 transition-transform',
              isExpanded && 'rotate-90'
            )} />
          )}
        </button>
        
        {hasSubItems && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.subItems!.map(subItem => (
              <NavItemComponent key={subItem.id} item={subItem} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Full screen navigation sheet
  const NavigationSheet: React.FC = () => (
    <SheetContent side="right" className="w-full sm:w-80 p-0">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Menu</h2>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* User info */}
          {user && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Avatar>
                <AvatarImage src={user.imageUrl} />
                <AvatarFallback>
                  {user.firstName?.charAt(0) || user.emailAddresses[0]?.emailAddress.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {user.primaryEmailAddress?.emailAddress}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavigation('/dashboard/profile')}
              >
                <User className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        
        {/* Quick actions */}
        <div className="p-4 border-b">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Actions</h3>
          <div className="grid grid-cols-3 gap-2">
            {quickActions.map(action => {
              const IconComponent = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => handleNavigation(action.href)}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', action.color)}>
                    <IconComponent className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs font-medium">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Navigation */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Navigation</h3>
            {mainNavItems.map(item => (
              <NavItemComponent key={item.id} item={item} />
            ))}
          </div>
        </ScrollArea>
        
        {/* Footer */}
        <div className="p-4 border-t space-y-3">
          {/* Theme toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              <span className="text-sm font-medium">Dark mode</span>
            </div>
            <Switch
              checked={isDarkMode}
              onCheckedChange={setIsDarkMode}
            />
          </div>
          
          <Separator />
          
          {/* Settings and logout */}
          <div className="space-y-1">
            <button
              onClick={() => handleNavigation('/dashboard/settings')}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </button>
            
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left text-red-600"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </SheetContent>
  );

  return (
    <>
      {/* Bottom tab bar for mobile */}
      <BottomTabBar />
      
      {/* Navigation sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <NavigationSheet />
      </Sheet>
      
      {/* Spacer for bottom navigation */}
      <div className="h-16 md:h-0" />
    </>
  );
};

// Top mobile header component
export interface MobileHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  showBack,
  onBack,
  actions,
  className
}) => {
  const router = useRouter();
  const [notifications] = useState(5);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <div className={cn('sticky top-0 z-40 bg-background border-b md:hidden', className)}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          {showBack && (
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ChevronRight className="h-4 w-4 rotate-180" />
            </Button>
          )}
          {title && (
            <h1 className="text-lg font-semibold truncate">{title}</h1>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {actions}
          
          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-4 w-4" />
            {notifications > 0 && (
              <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center bg-red-500">
                {notifications > 99 ? '99+' : notifications}
              </Badge>
            )}
          </Button>
          
          {/* Search */}
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/search')}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// Floating action button
export interface FloatingActionButtonProps {
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  href?: string;
  className?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  icon: IconComponent = Plus,
  onClick,
  href,
  className
}) => {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      router.push(href);
    }
  };

  return (
    <Button
      onClick={handleClick}
      className={cn(
        'fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg md:hidden z-40',
        className
      )}
    >
      <IconComponent className="h-6 w-6" />
    </Button>
  );
};

export default MobileNavigation;