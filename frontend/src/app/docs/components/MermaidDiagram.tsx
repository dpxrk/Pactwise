'use client';

import React, { useEffect, useRef, useState } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { cn } from '@/lib/utils';

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

let mermaidInitialized = false;
let mermaidId = 0;

export function MermaidDiagram({ chart, className }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      try {
        const mermaid = (await import('mermaid')).default;

        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: 'base',
            themeVariables: {
              primaryColor: '#f5ebf3',
              primaryTextColor: '#291528',
              primaryBorderColor: '#9e829c',
              lineColor: '#9e829c',
              secondaryColor: '#f0eff4',
              tertiaryColor: '#ead6e7',
              fontFamily: 'var(--font-jetbrains-mono), monospace',
              fontSize: '13px',
            },
            flowchart: { curve: 'basis', padding: 15 },
            sequence: { actorMargin: 50 },
          });
          mermaidInitialized = true;
        }

        const id = `mermaid-${++mermaidId}`;
        const { svg: rendered } = await mermaid.render(id, chart.trim());

        if (!cancelled) {
          // Sanitize the SVG output
          const sanitized = DOMPurify.sanitize(rendered, {
            USE_PROFILES: { svg: true, svgFilters: true },
            ADD_TAGS: ['foreignObject'],
          });
          setSvg(sanitized);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to render diagram');
          setLoading(false);
        }
      }
    }

    renderDiagram();
    return () => { cancelled = true; };
  }, [chart]);

  if (loading) {
    return (
      <div className={cn('border border-ghost-300 bg-ghost-50 p-8', className)}>
        <div className="flex items-center gap-3 text-ghost-500">
          <div className="h-4 w-4 border-2 border-purple-500 border-t-transparent animate-spin" />
          <span className="font-mono text-sm">Rendering diagram...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('border border-error-300 bg-error-50 p-4', className)}>
        <p className="font-mono text-sm text-error-600">Diagram error: {error}</p>
        <pre className="mt-2 text-xs text-ghost-500 overflow-x-auto">{chart}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'border border-ghost-300 bg-white p-6 overflow-x-auto',
        '[&_svg]:mx-auto [&_svg]:max-w-full',
        className
      )}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
