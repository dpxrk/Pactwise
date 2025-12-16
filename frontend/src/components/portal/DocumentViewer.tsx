'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';
import { usePortal } from '@/hooks/usePortal';
import type { PortalDocument } from '@/types/portal.types';
import { cn } from '@/lib/utils';

// ============================================================================
// DOCUMENT VIEWER
// ============================================================================

export function DocumentViewer() {
  const { getDocument, isLoading, error } = usePortal();
  const [document, setDocument] = useState<PortalDocument | null>(null);
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(1); // Would be determined from actual document

  // Load document on mount
  useEffect(() => {
    const loadDocument = async () => {
      const doc = await getDocument();
      setDocument(doc);
    };
    loadDocument();
  }, [getDocument]);

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(z + 25, 200));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 25, 50));

  // Page navigation
  const handlePrevPage = () => setCurrentPage((p) => Math.max(p - 1, 1));
  const handleNextPage = () => setCurrentPage((p) => Math.min(p + 1, totalPages));

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-purple-900 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-mono text-sm text-ghost-600">Loading document...</p>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="border border-red-300 bg-red-50 p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="font-mono text-sm text-red-700">
            {error || 'Failed to load document'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-ghost-300 bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ghost-300 bg-ghost-50">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-ghost-600" />
          <span className="font-mono text-sm font-medium text-ghost-900">
            {document.name || document.title || 'Document'}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 50}
              className="p-1.5 hover:bg-ghost-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ZoomOut className="h-4 w-4 text-ghost-600" />
            </button>
            <span className="font-mono text-xs text-ghost-600 w-12 text-center">
              {zoom}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= 200}
              className="p-1.5 hover:bg-ghost-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ZoomIn className="h-4 w-4 text-ghost-600" />
            </button>
          </div>

          {/* Page Navigation */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2 border-l border-ghost-300 pl-4">
              <button
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                className="p-1.5 hover:bg-ghost-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4 text-ghost-600" />
              </button>
              <span className="font-mono text-xs text-ghost-600">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
                className="p-1.5 hover:bg-ghost-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4 text-ghost-600" />
              </button>
            </div>
          )}

          {/* Download (if file_path available) */}
          {document.file_path && (
            <button
              className="flex items-center gap-2 px-3 py-1.5 font-mono text-xs text-ghost-600 hover:text-purple-900 border border-ghost-300 hover:border-purple-900"
            >
              <Download className="h-3 w-3" />
              DOWNLOAD
            </button>
          )}
        </div>
      </div>

      {/* Document Content */}
      <div className="p-8 overflow-auto max-h-[70vh] bg-ghost-50">
        <div
          className="mx-auto bg-white shadow-sm border border-ghost-200 p-8"
          style={{
            width: `${zoom}%`,
            maxWidth: '800px',
            minHeight: '600px',
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
          }}
        >
          {/* Render content based on type */}
          {document.content ? (
            // Rich text content - sanitized with DOMPurify
            <SanitizedContent content={document.content} />
          ) : document.file_path ? (
            // PDF or other file - show embed or placeholder
            <DocumentEmbed
              filePath={document.file_path}
              fileType={document.file_type}
            />
          ) : (
            // Fallback - show document info
            <DocumentPlaceholder document={document} />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-ghost-300 bg-ghost-50">
        <p className="font-mono text-xs text-ghost-500 text-center">
          This document is for review purposes only. All views are logged.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function SanitizedContent({ content }: { content: string }) {
  // Sanitize HTML content using DOMPurify
  const sanitizedContent = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr',
      'ul', 'ol', 'li',
      'strong', 'b', 'em', 'i', 'u', 's',
      'a', 'span', 'div',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'blockquote', 'pre', 'code',
    ],
    ALLOWED_ATTR: ['href', 'title', 'class', 'id', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  });

  return (
    <div
      className="prose prose-sm max-w-none font-mono"
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
}

function DocumentEmbed({ filePath, fileType }: { filePath: string; fileType?: string }) {
  const isPdf = fileType === 'application/pdf' || filePath.endsWith('.pdf');

  if (isPdf) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FileText className="h-16 w-16 text-ghost-400 mb-4" />
        <p className="font-mono text-sm text-ghost-600 mb-4">PDF Document</p>
        <p className="font-mono text-xs text-ghost-500">
          Click download to view the full document
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <FileText className="h-16 w-16 text-ghost-400 mb-4" />
      <p className="font-mono text-sm text-ghost-600">
        Document preview not available
      </p>
    </div>
  );
}

function DocumentPlaceholder({ document }: { document: PortalDocument }) {
  return (
    <div className="space-y-6">
      <div className="border-b border-ghost-200 pb-4">
        <h1 className="font-mono text-xl font-semibold text-purple-900">
          {document.title || document.name || 'Untitled Document'}
        </h1>
        {document.version_number && (
          <p className="font-mono text-xs text-ghost-500 mt-1">
            Version {document.version_number}
          </p>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <p className="font-mono text-xs text-ghost-500 uppercase mb-1">Document ID</p>
          <p className="font-mono text-sm text-ghost-900">{document.id}</p>
        </div>
        {document.status && (
          <div>
            <p className="font-mono text-xs text-ghost-500 uppercase mb-1">Status</p>
            <StatusBadge status={document.status} />
          </div>
        )}
      </div>

      <div className="border-t border-ghost-200 pt-6">
        <p className="font-mono text-xs text-ghost-500 text-center">
          Full document content will be displayed when available
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colorClass = {
    draft: 'bg-ghost-200 text-ghost-700',
    active: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    expired: 'bg-red-100 text-red-700',
  }[status] || 'bg-ghost-200 text-ghost-700';

  return (
    <span className={cn('px-2 py-1 font-mono text-xs uppercase', colorClass)}>
      {status}
    </span>
  );
}
