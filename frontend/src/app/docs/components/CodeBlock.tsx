'use client';

import React, { useState, useCallback } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
  children: string;
  language?: string;
  className?: string;
}

const LANGUAGE_LABELS: Record<string, string> = {
  typescript: 'TypeScript',
  ts: 'TypeScript',
  javascript: 'JavaScript',
  js: 'JavaScript',
  tsx: 'TSX',
  jsx: 'JSX',
  bash: 'Bash',
  sh: 'Shell',
  shell: 'Shell',
  sql: 'SQL',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  css: 'CSS',
  html: 'HTML',
  python: 'Python',
  py: 'Python',
  go: 'Go',
  rust: 'Rust',
  markdown: 'Markdown',
  md: 'Markdown',
  mermaid: 'Mermaid',
  text: 'Text',
  plaintext: 'Text',
};

export function CodeBlock({ children, language, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = children;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [children]);

  const label = language ? LANGUAGE_LABELS[language] || language : null;
  const lines = children.split('\n');
  const showLineNumbers = lines.length > 3;

  return (
    <div className={cn('group relative border border-ghost-300 bg-ghost-50', className)}>
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-ghost-300 bg-ghost-100 px-4 py-1.5">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-purple-500" />
          {label && (
            <span className="font-mono text-xs text-ghost-500 uppercase tracking-wider">
              {label}
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 text-xs font-mono transition-all',
            'hover:bg-purple-100 hover:text-purple-900',
            copied ? 'text-success-600' : 'text-ghost-500'
          )}
          aria-label={copied ? 'Copied' : 'Copy code'}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <div className="overflow-x-auto">
        <pre className="p-4 text-sm leading-relaxed">
          <code className="font-mono text-ghost-700">
            {showLineNumbers ? (
              <table className="border-collapse">
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={i} className="hover:bg-purple-50/50">
                      <td className="select-none pr-4 text-right text-xs text-ghost-400 align-top w-8">
                        {i + 1}
                      </td>
                      <td className="whitespace-pre">{line}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              children
            )}
          </code>
        </pre>
      </div>
    </div>
  );
}
