'use client';

import {
  Settings,
  CreditCard
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

import { PermissionGate } from '@/app/_components/auth/PermissionGate';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from '@/lib/utils';

// Icons

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
      label: 'Billing',
      href: '/dashboard/settings/billing',
      icon: CreditCard,
      description: 'Subscription and billing',
      permissions: ['admin', 'owner'],
      badge: 'Coming Soon'
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

                  const LinkContent = (
                    <>
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.label}</span>
                          {item.badge && (
                            <Badge 
                              variant={item.badge === 'Pro' ? 'default' : 'secondary'} 
                              className={cn(
                                "text-xs px-1.5 py-0.5",
                                item.badge === 'Pro' && "bg-gradient-to-r from-purple-500 to-purple-400 text-white"
                              )}
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                      </div>
                    </>
                  );

                  return (
                    <PermissionGate key={item.href} minimumRole="user">
                      {isDisabled ? (
                        <div
                          className={cn(
                            "flex items-center gap-3 px-3 py-2  text-sm transition-all duration-200 ease-in-out",
                            "opacity-50 cursor-not-allowed text-muted-foreground border border-transparent"
                          )}
                        >
                          {LinkContent}
                        </div>
                      ) : (
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2  text-sm transition-all duration-200 ease-in-out",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent/50 hover:shadow-sm hover:scale-[1.02] hover:border-accent-foreground/10 border border-transparent"
                          )}
                        >
                          {LinkContent}
                        </Link>
                      )}
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