'use client'

import {
  Home,
  Files,
  FileText,
  CheckCircle,
  FileSignature,
  Clock,
  AlertCircle,
  Archive,
  Building2,
  Bot,
  User,
  Settings,
  Users,
  Shield,
  Bell,
  CreditCard,
  Database,
  Code,
  Webhook,
  ClipboardList,
  ChevronDown
} from "lucide-react"
import { useRouter, usePathname } from "next/navigation";
import React, { useCallback } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavItemAnimation } from "@/hooks/useAnimations";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/stores/dashboard-store"
import type { NavSection } from "@/types/homedashboard.types"

// Icons

const NavItem = React.memo(
  ({
    item,
    isActive,
    isExpanded,
    onExpand,
    onClick,
    pathname,
    index,
  }: {
    item: NavSection["items"][0];
    isActive: boolean;
    isExpanded: boolean;
    onExpand: () => void;
    onClick: (href: string, label: string) => void;
    pathname: string;
    index: number;
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
      <div className="space-y-0.5">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start relative overflow-hidden cursor-pointer rounded-none h-9",
            "transition-all duration-150 ease-out",
            isActive && "border-l-2",
            navItemClassName
          )}
          style={{
            backgroundColor: isActive ? 'rgba(41, 21, 40, 0.08)' : 'transparent',
            borderColor: isActive ? '#291528' : 'transparent'
          }}
          onClick={handleClick}
        >
          <item.icon
            className="mr-3 h-3.5 w-3.5 transition-all duration-150 ease-out"
            style={{ color: isActive ? '#291528' : '#9e829c' }}
          />
          <span
            className="flex-1 text-left text-sm font-normal transition-colors"
            style={{ color: isActive ? '#291528' : '#3a3e3b' }}
          >{item.label}</span>
          {item.subItems && (
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-all duration-200 ease-out",
                isExpanded && "rotate-180"
              )}
              style={{ color: '#9e829c' }}
            />
          )}
        </Button>

        {/* Animated sub-items */}
        <div className={cn(
          "transition-all duration-200 ease-out",
          isExpanded ? "max-h-[800px] opacity-100 overflow-visible" : "max-h-0 opacity-0 overflow-hidden"
        )}>
          <div className="ml-4 space-y-0.5 pt-0.5">
            {item.subItems?.map((subItem, subIndex) => (
              <Button
                key={`subitem-${index}-${subIndex}-${subItem.label}`}
                variant="ghost"
                className={cn(
                  "w-full justify-start h-8 cursor-pointer relative overflow-hidden rounded-none",
                  "transition-all duration-150 ease-out",
                  pathname === subItem.href && "border-l-2",
                  isExpanded && "animate-slide-in-left"
                )}
                style={{
                  animationDelay: `${subIndex * 30}ms`,
                  backgroundColor: pathname === subItem.href ? 'rgba(41, 21, 40, 0.05)' : 'transparent',
                  borderColor: pathname === subItem.href ? '#9e829c' : 'transparent'
                }}
                onClick={() => onClick(subItem.href, subItem.label)}
              >
                <subItem.icon
                  className="mr-2 h-3 w-3 transition-all duration-150 ease-out"
                  style={{ color: pathname === subItem.href ? '#291528' : '#9e829c' }}
                />
                <span
                  className="text-sm font-normal transition-colors"
                  style={{ color: pathname === subItem.href ? '#291528' : '#3a3e3b' }}
                >{subItem.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }
);

NavItem.displayName = 'NavItem';

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
      label: "AI",
      items: [
        {
          label: "AI Agents",
          href: "/dashboard/agents",
          icon: Bot,
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
    <aside
      className={cn(
        "flex flex-col border-r h-full",
        className
      )}
      style={{
        backgroundColor: '#ffffff',
        borderColor: '#d2d1de'
      }}
    >
      <ScrollArea className="flex-1 h-full">
        <div className="space-y-6 p-4 min-h-full">
          {navigationSections.map((section, sectionIdx) => (
            <div
              key={sectionIdx}
              className="animate-slide-in-left"
              style={{
                animationDelay: `${sectionIdx * 100}ms`,
              }}
            >
              {section.label && (
                <div className="flex items-center mb-2">
                    <span className="text-xs font-normal uppercase tracking-wider" style={{ color: '#9e829c', letterSpacing: '0.1em' }}>
                      {section.label}
                    </span>
                  </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((item, itemIdx) => (
                  <div
                    key={`nav-${sectionIdx}-${itemIdx}-${item.label}`}
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
                      index={itemIdx}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
};

export default SideNavigation;
