'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { CodeBlock } from './CodeBlock';
import { MermaidDiagram } from './MermaidDiagram';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function getTextContent(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(getTextContent).join('');
  if (React.isValidElement(node)) {
    const props = node.props as Record<string, unknown>;
    if (props.children) {
      return getTextContent(props.children as React.ReactNode);
    }
  }
  return '';
}

function getHeadingId(children: React.ReactNode): string {
  const text = getTextContent(children);
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn('docs-prose', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children, ...props }) => {
            const id = getHeadingId(children);
            return (
              <h1 id={id} className="scroll-mt-20 font-display text-3xl font-bold text-purple-900 mt-12 mb-6 pb-3 border-b-2 border-purple-200 first:mt-0" {...props}>
                <a href={`#${id}`} className="hover:text-purple-700 no-underline">
                  {children}
                </a>
              </h1>
            );
          },
          h2: ({ children, ...props }) => {
            const id = getHeadingId(children);
            return (
              <h2 id={id} className="scroll-mt-20 font-display text-2xl font-bold text-purple-900 mt-10 mb-4 pb-2 border-b border-ghost-300" {...props}>
                <a href={`#${id}`} className="hover:text-purple-700 no-underline">
                  {children}
                </a>
              </h2>
            );
          },
          h3: ({ children, ...props }) => {
            const id = getHeadingId(children);
            return (
              <h3 id={id} className="scroll-mt-20 font-display text-xl font-semibold text-ghost-700 mt-8 mb-3" {...props}>
                <a href={`#${id}`} className="hover:text-purple-700 no-underline">
                  {children}
                </a>
              </h3>
            );
          },
          h4: ({ children, ...props }) => {
            const id = getHeadingId(children);
            return (
              <h4 id={id} className="scroll-mt-20 font-display text-lg font-semibold text-ghost-700 mt-6 mb-2" {...props}>
                <a href={`#${id}`} className="hover:text-purple-700 no-underline">
                  {children}
                </a>
              </h4>
            );
          },
          p: ({ children, ...props }) => (
            <p className="text-ghost-700 leading-7 mb-4" {...props}>
              {children}
            </p>
          ),
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              className="text-purple-700 underline underline-offset-2 decoration-purple-300 hover:text-purple-900 hover:decoration-purple-500 transition-colors"
              target={href?.startsWith('http') ? '_blank' : undefined}
              rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
              {...props}
            >
              {children}
            </a>
          ),
          ul: ({ children, ...props }) => (
            <ul className="list-disc pl-6 mb-4 space-y-1.5 text-ghost-700" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="list-decimal pl-6 mb-4 space-y-1.5 text-ghost-700" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="leading-7" {...props}>
              {children}
            </li>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote className="border-l-4 border-purple-500 bg-purple-50 pl-4 py-3 pr-4 mb-4 text-ghost-600 italic" {...props}>
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-8 border-ghost-300" />,
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto mb-6">
              <table className="min-w-full border border-ghost-300 text-sm" {...props}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead className="bg-purple-900 text-white" {...props}>
              {children}
            </thead>
          ),
          th: ({ children, ...props }) => (
            <th className="border border-ghost-300 px-4 py-2 text-left font-mono text-xs uppercase tracking-wider" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="border border-ghost-300 px-4 py-2 font-mono text-sm" {...props}>
              {children}
            </td>
          ),
          tr: ({ children, ...props }) => (
            <tr className="even:bg-ghost-50 hover:bg-purple-50/50 transition-colors" {...props}>
              {children}
            </tr>
          ),
          strong: ({ children, ...props }) => (
            <strong className="font-semibold text-purple-900" {...props}>
              {children}
            </strong>
          ),
          em: ({ children, ...props }) => (
            <em className="text-ghost-600" {...props}>
              {children}
            </em>
          ),
          code: ({ className: codeClassName, children, ...props }) => {
            const match = /language-(\w+)/.exec(codeClassName || '');
            const language = match ? match[1] : undefined;
            const codeString = String(children).replace(/\n$/, '');

            // Check if this is an inline code or block code
            const isInline = !codeClassName && !codeString.includes('\n');

            if (isInline) {
              return (
                <code
                  className="bg-purple-100 text-purple-800 px-1.5 py-0.5 font-mono text-[0.85em] border border-purple-200"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            // Mermaid diagrams
            if (language === 'mermaid') {
              return <MermaidDiagram chart={codeString} className="my-6" />;
            }

            // Code blocks
            return (
              <CodeBlock language={language} className="my-6">
                {codeString}
              </CodeBlock>
            );
          },
          pre: ({ children }) => {
            return <>{children}</>;
          },
          img: ({ src, alt, ...props }) => (
            <span className="block my-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt || ''}
                className="max-w-full border border-ghost-300"
                {...props}
              />
            </span>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
