'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileText, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchableDoc {
  slug: string;
  title: string;
  headings: { id: string; text: string; level: number }[];
  content: string;
}

interface SearchResult {
  slug: string;
  title: string;
  heading?: string;
  headingId?: string;
  snippet: string;
  score: number;
}

interface DocsSearchProps {
  docs: SearchableDoc[];
}

export function DocsSearch({ docs }: DocsSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();

  // Keyboard shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];

    const q = query.toLowerCase();
    const matches: SearchResult[] = [];

    for (const doc of docs) {
      // Check title match
      if (doc.title.toLowerCase().includes(q)) {
        matches.push({
          slug: doc.slug,
          title: doc.title,
          snippet: doc.content.slice(0, 120).replace(/[#*`]/g, '') + '...',
          score: 100,
        });
      }

      // Check heading matches
      for (const heading of doc.headings) {
        if (heading.text.toLowerCase().includes(q)) {
          matches.push({
            slug: doc.slug,
            title: doc.title,
            heading: heading.text,
            headingId: heading.id,
            snippet: heading.text,
            score: 80,
          });
        }
      }

      // Check content matches
      const contentLower = doc.content.toLowerCase();
      const idx = contentLower.indexOf(q);
      if (idx !== -1) {
        const start = Math.max(0, idx - 40);
        const end = Math.min(doc.content.length, idx + q.length + 80);
        const snippet = (start > 0 ? '...' : '') +
          doc.content.slice(start, end).replace(/[#*`\n]/g, ' ').replace(/\s+/g, ' ') +
          (end < doc.content.length ? '...' : '');

        // Avoid duplicate from title match
        if (!matches.some((m) => m.slug === doc.slug && !m.heading)) {
          matches.push({
            slug: doc.slug,
            title: doc.title,
            snippet,
            score: 50,
          });
        }
      }
    }

    return matches.sort((a, b) => b.score - a.score).slice(0, 10);
  }, [query, docs]);

  const navigate = useCallback(
    (result: SearchResult) => {
      const hash = result.headingId ? `#${result.headingId}` : '';
      router.push(`/docs/${result.slug}${hash}`);
      setOpen(false);
      setQuery('');
    },
    [router]
  );

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'flex items-center gap-2 w-full px-3 py-2 text-sm',
          'border border-ghost-300 bg-white text-ghost-500',
          'hover:border-purple-500 hover:text-ghost-700 transition-colors',
          'font-mono'
        )}
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search docs...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 border border-ghost-300 px-1.5 py-0.5 text-[10px] font-mono text-ghost-400">
          <span className="text-xs">&#8984;</span>K
        </kbd>
      </button>

      {/* Search modal */}
      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="fixed left-1/2 top-[15%] w-full max-w-xl -translate-x-1/2">
            <div className="border-2 border-purple-900 bg-white shadow-2xl">
              {/* Search input */}
              <div className="flex items-center gap-3 border-b border-ghost-300 px-4 py-3">
                <Search className="h-5 w-5 text-purple-500" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search documentation..."
                  className="flex-1 bg-transparent text-sm outline-none font-mono placeholder:text-ghost-400"
                />
                <button
                  onClick={() => setOpen(false)}
                  className="text-xs font-mono text-ghost-400 border border-ghost-300 px-2 py-0.5 hover:bg-ghost-100"
                >
                  ESC
                </button>
              </div>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto p-2">
                {query.trim() === '' ? (
                  <div className="p-6 text-center">
                    <p className="text-sm text-ghost-500 font-mono">Type to search across all documentation</p>
                  </div>
                ) : results.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-sm text-ghost-500 font-mono">
                      No results for &quot;{query}&quot;
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-0.5">
                    {results.map((result, i) => (
                      <li key={`${result.slug}-${result.headingId || i}`}>
                        <button
                          onClick={() => navigate(result)}
                          className={cn(
                            'flex w-full items-start gap-3 px-3 py-2.5 text-left',
                            'hover:bg-purple-50 transition-colors group'
                          )}
                        >
                          <FileText className="h-4 w-4 mt-0.5 text-purple-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-ghost-700">
                                {result.title}
                              </span>
                              {result.heading && (
                                <>
                                  <ArrowRight className="h-3 w-3 text-ghost-400" />
                                  <span className="text-sm text-purple-700 truncate">
                                    {result.heading}
                                  </span>
                                </>
                              )}
                            </div>
                            <p className="text-xs text-ghost-500 mt-0.5 line-clamp-1 font-mono">
                              {result.snippet}
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 mt-0.5 text-ghost-300 group-hover:text-purple-500 shrink-0" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
