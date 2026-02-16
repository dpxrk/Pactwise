import fs from 'fs';
import path from 'path';

export interface DocPage {
  slug: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  content: string;
  order: number;
}

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

const DOC_FILES: Omit<DocPage, 'content'>[] = [
  {
    slug: 'architecture',
    title: 'Agent Architecture',
    description: 'System overview, agent hierarchy, swarm intelligence, and data flow',
    category: 'Architecture',
    icon: 'Blocks',
    order: 0,
  },
  {
    slug: 'api',
    title: 'API Reference',
    description: 'Complete API documentation for all agent endpoints and interfaces',
    category: 'Reference',
    icon: 'Code',
    order: 1,
  },
  {
    slug: 'developer-guide',
    title: 'Developer Guide',
    description: 'Practical guide for developing, extending, and configuring agents',
    category: 'Guides',
    icon: 'BookOpen',
    order: 2,
  },
  {
    slug: 'prompt-engineering',
    title: 'Prompt Engineering',
    description: 'Creating, versioning, and optimizing prompts for the agent system',
    category: 'Guides',
    icon: 'Sparkles',
    order: 3,
  },
];

function getFilePath(slug: string): string {
  const root = process.cwd();
  const monorepoRoot = path.resolve(root, '..');

  switch (slug) {
    case 'architecture':
      return path.join(monorepoRoot, 'AGENT_ARCHITECTURE.md');
    case 'api':
      return path.join(monorepoRoot, 'AGENT_API.md');
    case 'developer-guide':
      return path.join(monorepoRoot, 'AGENT_DEVELOPER_GUIDE.md');
    case 'prompt-engineering':
      return path.join(monorepoRoot, 'backend', 'supabase', 'functions', 'local-agents', 'prompts', 'PROMPT_ENGINEERING_GUIDE.md');
    default:
      return '';
  }
}

export function getDocPage(slug: string): DocPage | null {
  const meta = DOC_FILES.find((d) => d.slug === slug);
  if (!meta) return null;

  const filePath = getFilePath(slug);
  if (!filePath) return null;

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { ...meta, content };
  } catch {
    return null;
  }
}

export function getAllDocSlugs(): string[] {
  return DOC_FILES.map((d) => d.slug);
}

export function getAllDocPages(): DocPage[] {
  return DOC_FILES.map((meta) => {
    const filePath = getFilePath(meta.slug);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return { ...meta, content };
    } catch {
      return { ...meta, content: '' };
    }
  }).sort((a, b) => a.order - b.order);
}

export function getDocNav(): Omit<DocPage, 'content'>[] {
  return DOC_FILES.sort((a, b) => a.order - b.order);
}

export function extractToc(markdown: string): TocItem[] {
  const headingRegex = /^(#{1,4})\s+(.+)$/gm;
  const items: TocItem[] = [];
  let match;

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2].replace(/[`*_~\[\]]/g, '').trim();
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
    items.push({ id, text, level });
  }

  return items;
}
