'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Blocks,
  Code,
  BookOpen,
  Sparkles,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DocsSearch } from './DocsSearch';

interface NavItem {
  slug: string;
  title: string;
  description: string;
  category: string;
  icon: string;
}

interface SearchableDoc {
  slug: string;
  title: string;
  headings: { id: string; text: string; level: number }[];
  content: string;
}

interface DocsSidebarProps {
  items: NavItem[];
  searchDocs: SearchableDoc[];
}

const ICON_MAP: Record<string, React.ElementType> = {
  Blocks,
  Code,
  BookOpen,
  Sparkles,
};

export function DocsSidebar({ items, searchDocs }: DocsSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Group items by category
  const grouped = items.reduce<Record<string, NavItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo / Header */}
      <div className="p-4 border-b border-ghost-300">
        <Link href="/docs" className="flex items-center gap-2 no-underline">
          <div className="h-7 w-7 bg-purple-900 flex items-center justify-center">
            <BookOpen className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="font-display font-bold text-sm text-purple-900 block leading-tight">
              Pactwise
            </span>
            <span className="font-mono text-[10px] text-ghost-500 uppercase tracking-wider">
              Documentation
            </span>
          </div>
        </Link>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-ghost-300">
        <DocsSearch docs={searchDocs} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {Object.entries(grouped).map(([category, navItems]) => (
          <div key={category}>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ghost-400 px-2 mb-1.5">
              {category}
            </p>
            <ul className="space-y-0.5">
              {navItems.map((item) => {
                const Icon = ICON_MAP[item.icon] || BookOpen;
                const isActive = pathname === `/docs/${item.slug}`;

                return (
                  <li key={item.slug}>
                    <Link
                      href={`/docs/${item.slug}`}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-2.5 px-2 py-2 text-sm transition-all no-underline group',
                        isActive
                          ? 'bg-purple-900 text-white'
                          : 'text-ghost-600 hover:bg-purple-50 hover:text-purple-900'
                      )}
                    >
                      <Icon className={cn(
                        'h-4 w-4 shrink-0',
                        isActive ? 'text-purple-300' : 'text-ghost-400 group-hover:text-purple-500'
                      )} />
                      <span className="flex-1 truncate">{item.title}</span>
                      <ChevronRight className={cn(
                        'h-3.5 w-3.5 shrink-0 transition-transform',
                        isActive ? 'text-purple-400' : 'text-ghost-300 group-hover:text-purple-400',
                        isActive && 'translate-x-0.5'
                      )} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-ghost-300">
        <div className="px-2 py-1.5">
          <p className="font-mono text-[10px] text-ghost-400 uppercase tracking-wider">
            Pactwise Agent System
          </p>
          <p className="font-mono text-[10px] text-ghost-300 mt-0.5">
            v1.0 &middot; 7 Agents &middot; Swarm Intelligence
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-ghost-300 shadow-sm hover:bg-purple-50"
        aria-label="Toggle navigation"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen w-64 bg-white border-r border-ghost-300',
          'transition-transform duration-200',
          'lg:translate-x-0 lg:static lg:z-auto',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
