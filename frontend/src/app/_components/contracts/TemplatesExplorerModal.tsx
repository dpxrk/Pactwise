'use client';

import { FileText, Folder, FolderOpen, Download, Eye, Search, X } from 'lucide-react';
import React, { useState, useMemo } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { contractTemplates, type ContractTemplateData } from '@/data/contractTemplates';
import { cn } from '@/lib/utils';

type ContractTemplate = ContractTemplateData;

interface TemplatesExplorerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate?: (template: ContractTemplate) => void;
}

export function TemplatesExplorerModal({
  open,
  onOpenChange,
  onSelectTemplate,
}: TemplatesExplorerModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Use real contract templates
  const templates: ContractTemplate[] = contractTemplates;

  // Group templates by category
  const categorizedTemplates = useMemo(() => {
    const filtered = templates.filter((template) =>
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const grouped: Record<string, ContractTemplate[]> = {};
    filtered.forEach((template) => {
      if (!grouped[template.category]) {
        grouped[template.category] = [];
      }
      grouped[template.category].push(template);
    });
    return grouped;
  }, [searchQuery]);

  const categories = Object.keys(categorizedTemplates).sort();

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(selectedCategory === category ? null : category);
  };

  const handleTemplateClick = (template: ContractTemplate) => {
    setSelectedTemplate(template);
  };

  const handleDownloadTemplate = (template: ContractTemplate) => {
    // Create a blob from the template content
    const blob = new Blob([template.content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);

    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = `${template.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handlePreviewTemplate = (template: ContractTemplate) => {
    setSelectedTemplate(template);
  };

  const handleUseTemplate = (template: ContractTemplate) => {
    // Call the callback with the selected template
    if (onSelectTemplate) {
      onSelectTemplate(template);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[88vw] w-[88vw] h-[78vh] bg-ghost-50 p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex-shrink-0 border-b border-ghost-300 px-6 py-4">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-purple-900">
                Contract Template Library
              </DialogTitle>
              <DialogDescription className="text-ghost-600">
                Browse and select from your template bank
              </DialogDescription>
            </DialogHeader>

            {/* Search */}
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ghost-500" />
              <Input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white border-ghost-300 font-mono text-sm"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Sidebar - Categories */}
            <div className="w-64 border-r border-ghost-300 bg-white overflow-y-auto">
              <div className="p-4">
                <div className="text-xs font-semibold text-ghost-500 uppercase tracking-wider mb-3 font-mono">
                  Categories ({categories.length})
                </div>
                <div className="space-y-1">
                  {categories.map((category) => {
                    const isExpanded = selectedCategory === category;
                    const templatesInCategory = categorizedTemplates[category];
                    const Icon = isExpanded ? FolderOpen : Folder;

                    return (
                      <div key={category}>
                        <button
                          onClick={() => handleCategoryClick(category)}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                            'hover:bg-purple-50',
                            isExpanded
                              ? 'bg-purple-100 text-purple-900 font-semibold'
                              : 'text-ghost-700'
                          )}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          <span className="flex-1 text-left">{category}</span>
                          <span className="text-xs text-ghost-500 font-mono">
                            {templatesInCategory.length}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Main Content - Templates List and Preview */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              {/* Templates List */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {selectedCategory ? (
                  <div className="p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-ghost-900">
                        {selectedCategory}
                      </h3>
                      <p className="text-sm text-ghost-600 font-mono">
                        {categorizedTemplates[selectedCategory].length} templates
                      </p>
                    </div>
                    <div className="space-y-2">
                      {categorizedTemplates[selectedCategory].map((template) => (
                        <div
                          key={template.id}
                          className={cn(
                            'group border border-ghost-300 bg-white p-4 transition-all cursor-pointer',
                            'hover:border-purple-500 hover:shadow-md',
                            selectedTemplate?.id === template.id &&
                              'border-purple-900 bg-purple-50'
                          )}
                          onClick={() => handleTemplateClick(template)}
                        >
                          <div className="flex items-start gap-4">
                            <div
                              className={cn(
                                'p-3 transition-colors',
                                selectedTemplate?.id === template.id
                                  ? 'bg-purple-100'
                                  : 'bg-ghost-100 group-hover:bg-purple-50'
                              )}
                            >
                              <FileText
                                className={cn(
                                  'h-6 w-6 transition-colors',
                                  selectedTemplate?.id === template.id
                                    ? 'text-purple-900'
                                    : 'text-ghost-600 group-hover:text-purple-900'
                                )}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-ghost-900 mb-1">
                                {template.name}
                              </h4>
                              <p className="text-sm text-ghost-600 mb-2">
                                {template.description}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-ghost-500 font-mono">
                                <span>Modified: {template.lastModified}</span>
                                <span>•</span>
                                <span>{template.size}</span>
                                <span>•</span>
                                <span>Used {template.usageCount}×</span>
                              </div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePreviewTemplate(template);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadTemplate(template);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-center p-8">
                    <div>
                      <Folder className="h-16 w-16 text-ghost-400 mx-auto mb-4" />
                      <p className="text-ghost-600 font-mono text-sm">
                        Select a category to view templates
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Preview Section */}
              {selectedTemplate && (
                <div className="flex-shrink-0 h-48 border-t border-ghost-300 bg-white overflow-hidden">
                  <div className="h-full flex flex-col">
                    <div className="flex-shrink-0 px-6 py-3 border-b border-ghost-300 bg-ghost-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100">
                            <FileText className="h-4 w-4 text-purple-900" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-ghost-900 text-sm">
                              {selectedTemplate.name}
                            </h4>
                            <p className="text-xs text-ghost-500 font-mono">
                              Quick Preview
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadTemplate(selectedTemplate)}
                            className="border-ghost-300 text-ghost-700 hover:bg-ghost-100 h-8"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleUseTemplate(selectedTemplate)}
                            className="bg-purple-900 hover:bg-purple-800 text-white h-8"
                          >
                            Use Template
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 bg-ghost-50">
                      <div className="bg-white border border-ghost-300 p-4">
                        <pre className="text-xs font-mono text-ghost-700 whitespace-pre-wrap">
                          {selectedTemplate.content.substring(0, 800)}...
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Details Panel */}
            {selectedTemplate && (
              <div className="w-80 border-l border-ghost-300 bg-white overflow-y-auto flex-shrink-0">
                <div className="p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="p-3 bg-purple-100">
                      <FileText className="h-6 w-6 text-purple-900" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-ghost-900 mb-1">
                        {selectedTemplate.name}
                      </h3>
                      <p className="text-xs text-ghost-500 font-mono">
                        {selectedTemplate.category}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-ghost-600 mb-6">
                    {selectedTemplate.description}
                  </p>

                  <div className="space-y-3 mb-6">
                    <div className="border-t border-ghost-200 pt-3">
                      <h4 className="text-xs font-semibold text-ghost-700 uppercase tracking-wider mb-3 font-mono">
                        Metadata
                      </h4>
                      <div className="space-y-2 text-xs text-ghost-600 font-mono">
                        <div className="flex justify-between">
                          <span>Last Modified:</span>
                          <span className="text-ghost-900">{selectedTemplate.lastModified}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>File Size:</span>
                          <span className="text-ghost-900">{selectedTemplate.size}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Usage Count:</span>
                          <span className="text-ghost-900">{selectedTemplate.usageCount}×</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Category:</span>
                          <span className="text-ghost-900">{selectedTemplate.category}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-ghost-200 pt-3">
                      <h4 className="text-xs font-semibold text-ghost-700 uppercase tracking-wider mb-3 font-mono">
                        Actions
                      </h4>
                      <div className="space-y-2">
                        <Button
                          className="w-full bg-purple-900 hover:bg-purple-800 text-white"
                          onClick={() => handleUseTemplate(selectedTemplate)}
                        >
                          Use This Template
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full border-ghost-300 text-ghost-700 hover:bg-ghost-100"
                          onClick={() => handleDownloadTemplate(selectedTemplate)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Template
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
