import { LucideIcon } from "lucide-react";

export interface SubNavigationItem {
  label: string;
  href: string;
  icon?: LucideIcon;
}

export interface NavigationItem {
  icon: LucideIcon;
  label: string;
  href: string;
  badge?: number | string;
  subItems?: SubNavigationItem[];
}

export interface NavigationGroup {
  label?: string;
  items: NavigationItem[];
}

export type NavigationState = {
  expandedItems: string[];
  activeItem: string;
};

export interface NavLink {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavSection {
  label?: string;
  items: {
    label: string;
    href: string;
    icon: LucideIcon;
    subItems?: NavLink[];
  }[];
}
