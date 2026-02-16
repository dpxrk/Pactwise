import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, ArrowLeft, ArrowRight } from 'lucide-react';

import { getDocPage, getAllDocSlugs, getDocNav, extractToc } from '../lib/docs-data';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { TableOfContents } from '../components/TableOfContents';

interface DocPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllDocSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: DocPageProps) {
  const { slug } = await params;
  const doc = getDocPage(slug);
  if (!doc) return { title: 'Not Found | Pactwise Docs' };

  return {
    title: `${doc.title} | Pactwise Docs`,
    description: doc.description,
  };
}

export default async function DocSlugPage({ params }: DocPageProps) {
  const { slug } = await params;
  const doc = getDocPage(slug);

  if (!doc) {
    notFound();
  }

  const toc = extractToc(doc.content);
  const allDocs = getDocNav();
  const currentIndex = allDocs.findIndex((d) => d.slug === slug);
  const prevDoc = currentIndex > 0 ? allDocs[currentIndex - 1] : null;
  const nextDoc = currentIndex < allDocs.length - 1 ? allDocs[currentIndex + 1] : null;

  return (
    <div className="flex">
      {/* Main content */}
      <div className="flex-1 min-w-0 max-w-4xl px-6 py-8 lg:px-12 lg:py-12">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5 mb-8 text-sm">
          <Link href="/docs" className="text-ghost-500 hover:text-purple-700 no-underline font-mono">
            Docs
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-ghost-400" />
          <span className="text-ghost-400 font-mono text-xs uppercase tracking-wider">
            {doc.category}
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-ghost-400" />
          <span className="text-purple-900 font-medium">
            {doc.title}
          </span>
        </nav>

        {/* Document content */}
        <article>
          <MarkdownRenderer content={doc.content} />
        </article>

        {/* Prev / Next navigation */}
        <nav className="mt-16 pt-6 border-t border-ghost-300 flex items-stretch gap-4">
          {prevDoc ? (
            <Link
              href={`/docs/${prevDoc.slug}`}
              className="flex-1 group border border-ghost-300 p-4 hover:border-purple-500 transition-colors no-underline"
            >
              <span className="font-mono text-[10px] uppercase tracking-widest text-ghost-400 flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" />
                Previous
              </span>
              <span className="block mt-1 text-sm font-medium text-purple-900 group-hover:text-purple-700">
                {prevDoc.title}
              </span>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
          {nextDoc ? (
            <Link
              href={`/docs/${nextDoc.slug}`}
              className="flex-1 group border border-ghost-300 p-4 hover:border-purple-500 transition-colors no-underline text-right"
            >
              <span className="font-mono text-[10px] uppercase tracking-widest text-ghost-400 flex items-center gap-1 justify-end">
                Next
                <ArrowRight className="h-3 w-3" />
              </span>
              <span className="block mt-1 text-sm font-medium text-purple-900 group-hover:text-purple-700">
                {nextDoc.title}
              </span>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
        </nav>
      </div>

      {/* Right sidebar - Table of Contents */}
      <aside className="hidden xl:block w-56 shrink-0 py-12 pr-6">
        <div className="sticky top-8">
          <TableOfContents items={toc} />
        </div>
      </aside>
    </div>
  );
}
