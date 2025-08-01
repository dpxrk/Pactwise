'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PermissionGate } from '@/app/_components/auth/PermissionGate';

// Icons
import {
  Settings,
  Users,
  Building,
  Shield,
  Bell,
  CreditCard,
  Database,
  Key,
  Webhook,
  Activity
} from 'lucide-react';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

const SettingsLayout = ({ children }: SettingsLayoutProps) => {
  const pathname = usePathname();

  const navigationItems = [
    {
      label: 'General',
      href: '/dashboard/settings',
      icon: Settings,
      description: 'Basic enterprise settings',
      permissions: ['user', 'manager', 'admin', 'owner']
    },
    {
      label: 'Users',
      href: '/dashboard/settings/users',
      icon: Users,
      description: 'User management and permissions',
      permissions: ['admin', 'owner']
    },
    {
      label: 'Enterprise',
      href: '/dashboard/settings/enterprise',
      icon: Building,
      description: 'Enterprise configuration',
      permissions: ['admin', 'owner']
    },
    {
      label: 'Security',
      href: '/dashboard/settings/security',
      icon: Shield,
      description: 'Security and authentication',
      permissions: ['admin', 'owner'],
      badge: 'Pro'
    },
    {
      label: 'Notifications',
      href: '/dashboard/settings/notifications',
      icon: Bell,
      description: 'Notification preferences',
      permissions: ['user', 'manager', 'admin', 'owner']
    },
    {
      label: 'Billing',
      href: '/dashboard/settings/billing',
      icon: CreditCard,
      description: 'Subscription and billing',
      permissions: ['admin', 'owner'],
      badge: 'Coming Soon'
    },
    {
      label: 'Data & Privacy',
      href: '/dashboard/settings/data',
      icon: Database,
      description: 'Data export and privacy',
      permissions: ['admin', 'owner'],
      badge: 'Pro'
    },
    {
      label: 'API Keys',
      href: '/dashboard/settings/api',
      icon: Key,
      description: 'API keys and integrations',
      permissions: ['admin', 'owner'],
      badge: 'Pro'
    },
    {
      label: 'Webhooks',
      href: '/dashboard/settings/webhooks',
      icon: Webhook,
      description: 'Webhook endpoints',
      permissions: ['admin', 'owner'],
      badge: 'Pro'
    },
    {
      label: 'Audit Logs',
      href: '/dashboard/settings/audit',
      icon: Activity,
      description: 'System activity logs',
      permissions: ['admin', 'owner']
    }
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your enterprise configuration and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-4">
              <nav className="space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  const isDisabled = item.badge && item.badge !== 'Pro';

                  return (
                    <PermissionGate key={item.href} minimumRole="user">
                      <Link
                        href={isDisabled ? '#' : item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-200 ease-in-out",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50 hover:shadow-sm hover:scale-[1.02] hover:border-accent-foreground/10 border border-transparent",
                          isDisabled && "opacity-50 cursor-not-allowed hover:scale-100 hover:bg-transparent hover:shadow-none"
                        )}
                        {...(isDisabled && { onClick: (e: React.MouseEvent) => e.preventDefault() })}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.label}</span>
                            {item.badge && (
                              <Badge 
                                variant={item.badge === 'Pro' ? 'default' : 'secondary'} 
                                className={cn(
                                  "text-xs px-1.5 py-0.5",
                                  item.badge === 'Pro' && "bg-gradient-to-r from-purple-500 to-blue-500 text-white"
                                )}
                              >
                                {item.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                        </div>
                      </Link>
                    </PermissionGate>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          {children}
        </div>
      </div>
    </div>
  );
};

export default SettingsLayout;