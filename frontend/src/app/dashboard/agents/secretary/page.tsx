'use client';

import React from 'react';
import AgentPageTemplate, { AgentPageConfig } from '@/components/agents/AgentPageTemplate';
import { Card } from '@/components/ui/card';
import { Upload } from 'lucide-react';

const secretaryConfig: AgentPageConfig = {
  agentType: 'secretary',
  name: 'Document Secretary',
  icon: '📑',
  description: 'Intelligent document processing with automatic metadata extraction and entity recognition',

  capabilities: [
    'Extract document metadata (title, parties, dates, amounts)',
    'Identify and classify document types automatically',
    'Extract key clauses and terms from contracts',
    'Perform OCR on scanned documents',
    'Recognize named entities (people, organizations, locations)',
    'Generate document summaries',
    'Quality check for document completeness',
    'Cross-reference vendor and contract data'
  ],

  useWhen: 'Processing new documents, extracting contract information, or automating document intake workflows.',

  exampleQueries: [
    'Extract metadata from uploaded contract',
    'Identify all parties in this agreement',
    'List all payment terms and amounts',
    'Generate summary of key clauses',
    'Check document completeness',
    'Extract vendor information from invoice'
  ]
};

export default function SecretaryAgentPage() {
  return (
    <AgentPageTemplate config={secretaryConfig}>
      {/* Add Secretary-specific features here */}
      <div className="mt-6">
        <Card className="bg-white border-ghost-300 p-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Document Upload
          </h3>
          <div className="border-2 border-dashed border-ghost-300 rounded-lg p-12 text-center">
            <Upload className="w-12 h-12 mx-auto text-ghost-500 mb-4" />
            <p className="text-text-muted mb-2">Drag and drop documents here or click to browse</p>
            <p className="text-xs text-text-tertiary">Supports PDF, DOCX, TXT, and image files</p>
          </div>
        </Card>
      </div>
    </AgentPageTemplate>
  );
}
