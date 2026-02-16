'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  items: TocItem[];
}

export function TableOfContents({ items }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -80% 0px', threshold: 0 }
    );

    const headings = document.querySelectorAll('h1[id], h2[id], h3[id], h4[id]');
    headings.forEach((heading) => observer.observe(heading));

    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  // Only show h2 and h3 in the on-page TOC
  const filtered = items.filter((item) => item.level >= 2 && item.level <= 3);

  if (filtered.length === 0) return null;

  return (
    <nav className="space-y-1">
      <p className="font-mono text-xs uppercase tracking-wider text-ghost-500 mb-3 px-2">
        On this page
      </p>
      <ul className="space-y-0.5">
        {filtered.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById(item.id);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  history.replaceState(null, '', `#${item.id}`);
                  setActiveId(item.id);
                }
              }}
              className={cn(
                'block py-1 px-2 text-sm transition-all border-l-2',
                item.level === 3 && 'pl-5',
                activeId === item.id
                  ? 'border-purple-900 text-purple-900 font-medium bg-purple-50'
                  : 'border-transparent text-ghost-500 hover:text-ghost-700 hover:border-ghost-300'
              )}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
