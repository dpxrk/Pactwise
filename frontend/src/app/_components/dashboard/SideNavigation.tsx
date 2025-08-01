'use client'

import React, { useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useNavItemAnimation } from "@/hooks/useAnimations";
import {
  Home,
  Files,
  Building2,
  BarChart3,
  Settings,
  FileText,
  FileSignature,
  Clock,
  ChevronDown,
  Users,
  Bot,
  User,
  Shield,
  Bell,
  CreditCard,
  Database,
  Code,
  Webhook,
  ClipboardList,
  CheckCircle,
  DollarSign,
  Activity,
  Archive,
  AlertCircle,
  FileEdit,
} from "lucide-react";
import { useDashboardStore } from "@/stores/dashboard-store"
import type { NavSection } from "@/types/homedashboard.types"

const NavItem = React.memo(
  ({
    item,
    isActive,
    isExpanded,
    onExpand,
    onClick,
    pathname,
  }: {
    item: NavSection["items"][0];
    isActive: boolean;
    isExpanded: boolean;
    onExpand: () => void;
    onClick: (href: string, label: string) => void;
    pathname: string;
  }) => {
    const { setSelectedType } = useDashboardStore();
    const { hoverProps, className: navItemClassName } = useNavItemAnimation(isActive);

    const handleClick = useCallback(() => {
      if (item.subItems) {
        onExpand();
      } else {
        setSelectedType(item.label);
        onClick(item.href, item.label);
      }
    }, [item, onExpand, onClick, setSelectedType]);

    return (
      <div className="space-y-1">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start group relative overflow-hidden cursor-pointer",
            "hover:bg-white/5 transition-all duration-200 ease-out",
            isActive && "bg-gradient-to-r from-teal-500/10 to-cyan-500/5 border-l-2 border-teal-400",
            navItemClassName
          )}
          onClick={handleClick}
          {...hoverProps}
        >
          <item.icon className={cn(
            "mr-3 h-4 w-4 transition-all duration-200 ease-out",
            isActive ? "text-teal-400" : "text-gray-500",
            "group-hover:text-teal-400"
          )} />
          <span className={cn(
            "flex-1 text-left font-medium transition-colors",
            isActive ? "text-teal-400" : "text-gray-300",
            "group-hover:text-white"
          )}>{item.label}</span>
          {item.subItems && (
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-all duration-300 ease-out",
                isExpanded && "rotate-180",
                "group-hover:text-primary"
              )}
            />
          )}
          {/* Hover indicator */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-r from-teal-500/5 via-transparent to-transparent",
            "opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-out",
            "-z-10"
          )} />
          {/* Glow effect on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-teal-400/50 to-transparent" />
          </div>
        </Button>

        {/* Animated sub-items */}
        <div className={cn(
          "transition-all duration-300 ease-out",
          isExpanded ? "max-h-[800px] opacity-100 overflow-visible" : "max-h-0 opacity-0 overflow-hidden"
        )}>
          <div className="ml-6 space-y-1 pt-1">
            {item.subItems?.map((subItem, index) => (
              <Button
                key={subItem.href}
                variant="ghost"
                className={cn(
                  "w-full justify-start h-9 cursor-pointer group relative overflow-hidden",
                  "hover:bg-white/5 hover:translate-x-1 transition-all duration-200 ease-out",
                  pathname === subItem.href && "bg-teal-500/10 border-l-2 border-teal-400/50",
                  // Staggered animation
                  isExpanded && "animate-slide-in-left"
                )}
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
                onClick={() => onClick(subItem.href, subItem.label)}
              >
                <subItem.icon className={cn(
                  "mr-2 h-3.5 w-3.5 transition-all duration-200 ease-out",
                  pathname === subItem.href ? "text-teal-400" : "text-gray-600",
                  "group-hover:text-teal-400"
                )} />
                <span className={cn(
                  "text-sm font-medium transition-colors",
                  pathname === subItem.href ? "text-teal-400" : "text-gray-400",
                  "group-hover:text-white"
                )}>{subItem.label}</span>
                {/* Sub-item hover indicator */}
                <div className={cn(
                  "absolute left-0 top-0 w-0.5 h-full bg-teal-400/50 scale-y-0",
                  "group-hover:scale-y-100 transition-transform duration-200 ease-out origin-center"
                )} />
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }
);

export const SideNavigation = ({ className }: { className?: string }) => {
 
  const router = useRouter();
  const pathname = usePathname();

  const { expandedItems, setExpandedItems, setSelectedType } =
    useDashboardStore();

  const navigationSections: NavSection[] = [
    {
      items: [
        {
          label: "Dashboard",
          href: "/dashboard",
          icon: Home,
        },
      ],
    },
    {
      label: "Contract Management",
      items: [
        {
          label: "Contracts",
          icon: Files,
          href: "/dashboard/contracts",
          subItems: [
            {
              label: "All Contracts",
              href: "/dashboard/contracts",
              icon: FileText,
            },
            {
              label: "Templates",
              href: "/dashboard/contracts/templates",
              icon: FileText,
            },
            {
              label: "Active",
              href: "/dashboard/contracts/active",
              icon: CheckCircle,
            },
            {
              label: "Pending Analysis",
              href: "/dashboard/contracts/pending",
              icon: FileSignature,
            },
            {
              label: "Drafts",
              href: "/dashboard/contracts/drafts",
              icon: Clock,
            },
            {
              label: "Expired",
              href: "/dashboard/contracts/expired",
              icon: AlertCircle,
            },
            {
              label: "Archived",
              href: "/dashboard/contracts/archived",
              icon: Archive,
            },
          ],
        },
        {
          label: "Collaborative Editor",
          href: "/dashboard/collaborative-editor",
          icon: FileEdit,
        },
        {
          label: "Vendors",
          href: "/dashboard/vendors",
          icon: Building2,
          subItems: [
            {
              label: "All Vendors",
              href: "/dashboard/vendors",
              icon: Building2,
            },
            {
              label: "Active Vendors",
              href: "/dashboard/vendors/active",
              icon: CheckCircle,
            },
            {
              label: "Inactive Vendors",
              href: "/dashboard/vendors/inactive",
              icon: AlertCircle,
            },
          ],
        },
      ],
    },
    {
      label: "AI & Analytics",
      items: [
        {
          label: "AI Agents",
          href: "/dashboard/agents",
          icon: Bot,
        },
        {
          label: "Analytics",
          href: "/dashboard/analytics",
          icon: BarChart3,
        },
      ],
    },
    {
      label: "Finance",
      items: [
        {
          label: "Budgets",
          href: "/dashboard/finance/budgets",
          icon: DollarSign,
        },
      ],
    },
    {
      label: "Administration",
      items: [
        {
          label: "System Health",
          href: "/dashboard/admin/system",
          icon: Activity,
        },
      ],
    },
    {
      label: "Account & Settings",
      items: [
        {
          label: "Profile",
          href: "/dashboard/profile",
          icon: User,
        },
        {
          label: "Settings",
          href: "/dashboard/settings",
          icon: Settings,
          subItems: [
            {
              label: "General",
              href: "/dashboard/settings",
              icon: Settings,
            },
            {
              label: "Enterprise",
              href: "/dashboard/settings/enterprise",
              icon: Building2,
            },
            {
              label: "Users",
              href: "/dashboard/settings/users",
              icon: Users,
            },
            {
              label: "Security",
              href: "/dashboard/settings/security",
              icon: Shield,
            },
            {
              label: "Notifications",
              href: "/dashboard/settings/notifications",
              icon: Bell,
            },
            {
              label: "Billing",
              href: "/dashboard/settings/billing",
              icon: CreditCard,
            },
            {
              label: "Data Management",
              href: "/dashboard/settings/data",
              icon: Database,
            },
            {
              label: "API",
              href: "/dashboard/settings/api",
              icon: Code,
            },
            {
              label: "Webhooks",
              href: "/dashboard/settings/webhooks",
              icon: Webhook,
            },
            {
              label: "Audit Log",
              href: "/dashboard/settings/audit",
              icon: ClipboardList,
            },
          ],
        },
      ],
    },
  ];

  const toggleExpanded = useCallback(
    (label: string) => {
      setExpandedItems((prev: string[]) =>
        prev.includes(label)
          ? prev.filter((item: string) => item !== label)
          : [...prev, label]
      );
    },
    [setExpandedItems]
  );

  const handleNavigate = useCallback(
    (href: string, label: string) => {
      router.push(href);
      setSelectedType(label);
    },
    [router, setSelectedType]
  );

  const isItemActive = useCallback(
    (href: string, subItems?: NavSection["items"][0]["subItems"]) => {
      // If this item has subitems and matches the base path
      if (subItems && pathname.startsWith(href)) {
        // Check if we're on the exact base path
        if (pathname === href) {
          return true;
        }
        // Check if any subitem paths match
        return subItems.some((subItem: { href: string }) =>
          pathname.startsWith(subItem.href)
        );
      }
      // Regular path matching for items without subitems
      return (
        pathname === href || pathname.startsWith(`${href}/`)
      );
    },
    [pathname]
  );

  return (
    <aside className={cn(
      "flex flex-col border-r glass h-full",
      "border-white/5",
      className
    )}>
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background opacity-90" />
      <ScrollArea className="flex-1 h-full relative z-10">
        <div className="space-y-8 p-6 min-h-full">
          {navigationSections.map((section, sectionIdx) => (
            <div 
              key={sectionIdx}
              className="animate-slide-in-left"
              style={{
                animationDelay: `${sectionIdx * 100}ms`,
              }}
            >
              {section.label && (
                <>
                  <div className="flex items-center px-2 mb-3">
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      {section.label}
                    </span>
                    <div className="ml-3 flex-1 h-px bg-gradient-to-r from-gray-800 to-transparent" />
                  </div>
                </>
              )}
              <div className="space-y-2">
                {section.items.map((item, itemIdx) => (
                  <div
                    key={item.href}
                    className="animate-fade-in-up"
                    style={{
                      animationDelay: `${(sectionIdx * 100) + (itemIdx * 50)}ms`,
                    }}
                  >
                    <NavItem
                      item={item}
                      isActive={isItemActive(item.href, item.subItems)}
                      isExpanded={expandedItems.includes(item.label)}
                      onExpand={() => toggleExpanded(item.label)}
                      onClick={handleNavigate}
                      pathname={pathname}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      
      {/* Navigation footer with gradient */}
      {/* <div className="p-4 border-t border-border/50 bg-gradient-to-t from-card/80 to-transparent">
        <div className="text-xs text-muted-foreground/60 text-center">
          Pactwise Enterprise
        </div>
      </div> */}
    </aside>
  );
};

export default SideNavigation;
