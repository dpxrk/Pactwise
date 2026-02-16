import Link from 'next/link';
import { Blocks, Code, BookOpen, Sparkles, ArrowRight } from 'lucide-react';
import { getDocNav } from './lib/docs-data';

const ICON_MAP: Record<string, React.ElementType> = {
  Blocks,
  Code,
  BookOpen,
  Sparkles,
};

export default function DocsPage() {
  const docs = getDocNav();

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 lg:py-16">
      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-1 w-8 bg-purple-900" />
          <span className="font-mono text-xs uppercase tracking-widest text-purple-500">
            Documentation
          </span>
        </div>
        <h1 className="font-display text-4xl font-bold text-purple-900 mb-4">
          Pactwise Agent System
        </h1>
        <p className="text-lg text-ghost-600 max-w-2xl leading-relaxed">
          Comprehensive documentation for the multi-agent AI architecture powering
          contract and vendor management. Seven specialized agents, swarm intelligence,
          and cross-enterprise learning.
        </p>
      </div>

      {/* Doc cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {docs.map((doc) => {
          const Icon = ICON_MAP[doc.icon] || BookOpen;

          return (
            <Link
              key={doc.slug}
              href={`/docs/${doc.slug}`}
              className="group block border-2 border-ghost-300 bg-white p-6 hover:border-purple-500 transition-all no-underline"
            >
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 bg-purple-50 border border-purple-200 flex items-center justify-center shrink-0 group-hover:bg-purple-900 group-hover:border-purple-900 transition-colors">
                  <Icon className="h-5 w-5 text-purple-500 group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-display text-lg font-semibold text-purple-900 mb-1 group-hover:text-purple-700">
                    {doc.title}
                  </h2>
                  <p className="text-sm text-ghost-500 leading-relaxed">
                    {doc.description}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-ghost-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all shrink-0 mt-1" />
              </div>
              <div className="mt-3 pt-3 border-t border-ghost-200">
                <span className="font-mono text-[10px] uppercase tracking-widest text-ghost-400">
                  {doc.category}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick start */}
      <div className="mt-12 border-2 border-purple-200 bg-purple-50 p-6">
        <h2 className="font-display text-lg font-semibold text-purple-900 mb-2">
          Quick Start
        </h2>
        <p className="text-sm text-ghost-600 mb-4">
          New to Pactwise agents? Start with the Architecture overview to understand
          the system, then move to the Developer Guide for hands-on implementation.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/docs/architecture"
            className="inline-flex items-center gap-2 bg-purple-900 text-white px-4 py-2 text-sm font-medium hover:bg-purple-800 transition-colors no-underline"
          >
            Start with Architecture
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/docs/developer-guide"
            className="inline-flex items-center gap-2 border border-purple-900 text-purple-900 px-4 py-2 text-sm font-medium hover:bg-purple-100 transition-colors no-underline"
          >
            Developer Guide
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
