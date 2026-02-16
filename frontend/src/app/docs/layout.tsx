import type { Metadata } from 'next';

import { getAllDocPages, getDocNav, extractToc } from './lib/docs-data';
import { DocsSidebar } from './components/DocsSidebar';

export const metadata: Metadata = {
  title: 'Documentation | Pactwise',
  description: 'Comprehensive documentation for the Pactwise AI Agent System',
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navItems = getDocNav();
  const allPages = getAllDocPages();

  const searchDocs = allPages.map((page) => ({
    slug: page.slug,
    title: page.title,
    headings: extractToc(page.content),
    content: page.content,
  }));

  return (
    <div className="flex min-h-screen bg-ghost-100">
      <DocsSidebar items={navItems} searchDocs={searchDocs} />
      <main className="flex-1 min-w-0 lg:pl-0 pl-0">
        {children}
      </main>
    </div>
  );
}
