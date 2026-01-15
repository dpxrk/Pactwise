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
  CreditCard,
  ChevronDown,
  Activity,
  ClipboardList,
  FormInput,
  Send,
  Eye,
  PenTool,
  Shield,
  Users,
  Plus,
  Key,
  Play,
  FileStack,
  Calendar,
  CalendarClock,
  Bell,
  ListChecks,
  Target,
  ShieldCheck,
  ShieldAlert,
  Scale,
  TrendingUp,
  BarChart3,
  PieChart,
  LineChart,
  DollarSign,
  Award,
  Star,
  Brain,
  MessageSquareHeart,
  Lightbulb,
  GitBranch,
  Workflow,
} from "lucide-react"
import { useRouter, usePathname } from "next/navigation";
import React, { useCallback } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme } from "@/contexts/ThemeContext";
import { useNavItemAnimation } from "@/hooks/useAnimations";
import { cn } from "@/lib/utils";
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
    index,
    isDark,
  }: {
    item: NavSection["items"][0];
    isActive: boolean;
    isExpanded: boolean;
    onExpand: () => void;
    onClick: (href: string, label: string) => void;
    pathname: string;
    index: number;
    isDark: boolean;
  }) => {
    const { hoverProps: _hoverProps, className: navItemClassName } = useNavItemAnimation(isActive);

    const handleClick = useCallback(() => {
      if (item.subItems) {
        onExpand();
      } else {
        onClick(item.href, item.label);
      }
    }, [item, onExpand, onClick]);

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
            backgroundColor: isActive
              ? (isDark ? 'rgba(168, 85, 247, 0.1)' : 'rgba(41, 21, 40, 0.08)')
              : 'transparent',
            borderColor: isActive ? '#a855f7' : 'transparent'
          }}
          onClick={handleClick}
        >
          <item.icon
            className="mr-3 h-3.5 w-3.5 transition-all duration-150 ease-out"
            style={{ color: isActive ? '#a855f7' : (isDark ? '#6b6b70' : '#9e829c') }}
          />
          <span
            className="flex-1 text-left text-sm font-normal transition-colors font-mono"
            style={{ color: isActive ? (isDark ? '#e0e0e0' : '#291528') : (isDark ? '#a0a0a5' : '#3a3e3b') }}
          >{item.label}</span>
          {item.subItems && (
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-all duration-200 ease-out",
                isExpanded && "rotate-180"
              )}
              style={{ color: isDark ? '#6b6b70' : '#9e829c' }}
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
                  backgroundColor: pathname === subItem.href
                    ? (isDark ? 'rgba(168, 85, 247, 0.08)' : 'rgba(41, 21, 40, 0.05)')
                    : 'transparent',
                  borderColor: pathname === subItem.href ? '#9e829c' : 'transparent'
                }}
                onClick={() => onClick(subItem.href, subItem.label)}
              >
                <subItem.icon
                  className="mr-2 h-3 w-3 transition-all duration-150 ease-out"
                  style={{ color: pathname === subItem.href ? '#a855f7' : (isDark ? '#6b6b70' : '#9e829c') }}
                />
                <span
                  className="text-sm font-normal transition-colors font-mono"
                  style={{ color: pathname === subItem.href ? (isDark ? '#e0e0e0' : '#291528') : (isDark ? '#a0a0a5' : '#3a3e3b') }}
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
  const { isDark } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  const { expandedItems, setExpandedItems } =
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
          label: "Templates",
          icon: FileStack,
          href: "/dashboard/contracts/templates",
          subItems: [
            {
              label: "All Templates",
              href: "/dashboard/contracts/templates",
              icon: FileStack,
            },
            {
              label: "Create Template",
              href: "/dashboard/contracts/templates/new",
              icon: Plus,
            },
          ],
        },
        {
          label: "Contract Intake",
          icon: ClipboardList,
          href: "/dashboard/contracts/intake",
          subItems: [
            {
              label: "Overview",
              href: "/dashboard/contracts/intake",
              icon: Eye,
            },
            {
              label: "Manage Forms",
              href: "/dashboard/contracts/intake?tab=forms",
              icon: FormInput,
            },
            {
              label: "New Request",
              href: "/dashboard/contracts/intake/new",
              icon: Send,
            },
          ],
        },
        {
          label: "Signatures",
          icon: PenTool,
          href: "/dashboard/contracts/signatures",
          subItems: [
            {
              label: "All Requests",
              href: "/dashboard/contracts/signatures",
              icon: FileSignature,
            },
            {
              label: "New Request",
              href: "/dashboard/contracts/signatures/create",
              icon: Plus,
            },
          ],
        },
        {
          label: "Certificates",
          icon: Shield,
          href: "/dashboard/contracts/certificates",
          subItems: [
            {
              label: "Overview",
              href: "/dashboard/contracts/certificates",
              icon: Key,
            },
          ],
        },
        {
          label: "Collaboration",
          icon: Users,
          href: "/dashboard/contracts/sessions",
          subItems: [
            {
              label: "Sessions",
              href: "/dashboard/contracts/sessions",
              icon: Play,
            },
          ],
        },
      ],
    },
    {
      label: "Obligations",
      items: [
        {
          label: "Obligation Tracker",
          icon: ListChecks,
          href: "/dashboard/obligations",
          subItems: [
            {
              label: "Dashboard",
              href: "/dashboard/obligations",
              icon: Target,
            },
            {
              label: "Calendar",
              href: "/dashboard/obligations/calendar",
              icon: Calendar,
            },
            {
              label: "Upcoming",
              href: "/dashboard/obligations/upcoming",
              icon: CalendarClock,
            },
            {
              label: "Alerts",
              href: "/dashboard/obligations/alerts",
              icon: Bell,
            },
          ],
        },
      ],
    },
    {
      label: "Compliance & Risk",
      items: [
        {
          label: "Compliance",
          icon: ShieldCheck,
          href: "/dashboard/compliance",
          subItems: [
            {
              label: "Dashboard",
              href: "/dashboard/compliance",
              icon: ShieldCheck,
            },
            {
              label: "Frameworks",
              href: "/dashboard/compliance/frameworks",
              icon: Scale,
            },
            {
              label: "Rules",
              href: "/dashboard/compliance/rules",
              icon: ListChecks,
            },
            {
              label: "Issues",
              href: "/dashboard/compliance/issues",
              icon: ShieldAlert,
            },
          ],
        },
        {
          label: "Risk Assessment",
          icon: AlertCircle,
          href: "/dashboard/risk",
          subItems: [
            {
              label: "Dashboard",
              href: "/dashboard/risk",
              icon: Target,
            },
            {
              label: "Clause Conflicts",
              href: "/dashboard/risk/conflicts",
              icon: GitBranch,
            },
            {
              label: "Mitigations",
              href: "/dashboard/risk/mitigations",
              icon: Shield,
            },
          ],
        },
      ],
    },
    {
      label: "Vendors",
      items: [
        {
          label: "Vendor Management",
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
        {
          label: "Scorecards",
          href: "/dashboard/vendors/scorecards",
          icon: Star,
          subItems: [
            {
              label: "All Scorecards",
              href: "/dashboard/vendors/scorecards",
              icon: Award,
            },
            {
              label: "Templates",
              href: "/dashboard/vendors/scorecards/templates",
              icon: FileStack,
            },
          ],
        },
      ],
    },
    {
      label: "Analytics",
      items: [
        {
          label: "Temporal Analysis",
          icon: TrendingUp,
          href: "/dashboard/analytics/temporal",
          subItems: [
            {
              label: "Trends",
              href: "/dashboard/analytics/temporal",
              icon: LineChart,
            },
            {
              label: "Predictions",
              href: "/dashboard/analytics/temporal/predictions",
              icon: TrendingUp,
            },
            {
              label: "Patterns",
              href: "/dashboard/analytics/temporal/patterns",
              icon: BarChart3,
            },
          ],
        },
        {
          label: "Spend Analytics",
          icon: DollarSign,
          href: "/dashboard/analytics/spend",
          subItems: [
            {
              label: "Overview",
              href: "/dashboard/analytics/spend",
              icon: PieChart,
            },
            {
              label: "By Category",
              href: "/dashboard/analytics/spend/categories",
              icon: BarChart3,
            },
            {
              label: "Savings",
              href: "/dashboard/analytics/spend/savings",
              icon: DollarSign,
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
          subItems: [
            {
              label: "Overview",
              href: "/dashboard/agents",
              icon: Bot,
            },
            {
              label: "Donna AI",
              href: "/dashboard/agents/donna",
              icon: Brain,
            },
          ],
        },
        {
          label: "Donna Feedback",
          href: "/dashboard/agents/donna/feedback",
          icon: MessageSquareHeart,
          subItems: [
            {
              label: "Recommendations",
              href: "/dashboard/agents/donna/feedback",
              icon: Lightbulb,
            },
            {
              label: "Quality Metrics",
              href: "/dashboard/agents/donna/feedback/quality",
              icon: BarChart3,
            },
          ],
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
              label: "Approval Matrix",
              href: "/dashboard/settings/approvals",
              icon: Workflow,
            },
            {
              label: "Billing",
              href: "/dashboard/settings/billing",
              icon: CreditCard,
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
    (href: string, _label: string) => {
      router.push(href);
    },
    [router]
  );

  const isItemActive = useCallback(
    (href: string, subItems?: NavSection["items"][0]["subItems"]) => {
      if (subItems && pathname.startsWith(href)) {
        if (pathname === href) {
          return true;
        }
        return subItems.some((subItem: { href: string }) =>
          pathname.startsWith(subItem.href)
        );
      }
      return (
        pathname === href || pathname.startsWith(`${href}/`)
      );
    },
    [pathname]
  );

  return (
    <aside
      className={cn(
        "flex flex-col border-r h-full transition-colors duration-300",
        className
      )}
      style={{
        backgroundColor: isDark ? '#131316' : '#ffffff',
        borderColor: isDark ? '#2a2a2e' : '#d2d1de'
      }}
    >
      {/* Status indicator */}
      <div
        className="px-4 py-3 border-b"
        style={{ borderColor: isDark ? '#2a2a2e' : '#d2d1de' }}
      >
        <div className="flex items-center gap-2">
          <Activity className="w-3 h-3 text-success" />
          <span
            className="font-mono text-[10px] tracking-wider"
            style={{ color: isDark ? '#6b6b70' : '#9e829c' }}
          >
            SYSTEM OPERATIONAL
          </span>
        </div>
      </div>

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
                  <span
                    className="text-[10px] font-mono uppercase tracking-wider"
                    style={{ color: isDark ? '#6b6b70' : '#9e829c', letterSpacing: '0.1em' }}
                  >
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
                      isDark={isDark}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Bottom status bar */}
      <div
        className="px-4 py-2 border-t font-mono text-[10px]"
        style={{
          backgroundColor: isDark ? '#0d0d0f' : '#f0eff4',
          borderColor: isDark ? '#2a2a2e' : '#d2d1de',
          color: isDark ? '#6b6b70' : '#9e829c'
        }}
      >
        <div className="flex items-center justify-between">
          <span>v1.0.0</span>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
            <span className="text-success">ONLINE</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default SideNavigation;
