'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Copy,
  Send,
  Archive,
  Clock,
  CheckCircle2,
  FileStack,
  Variable,
  Layers,
  History,
  MoreHorizontal,
  Plus,
  GripVertical,
  ChevronRight,
  ChevronDown,
  Eye,
  Code,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useTemplate,
  useTemplateVersions,
  useDeleteTemplate,
  usePublishTemplate,
  useUpdateTemplate,
  useCreateTemplateSection,
  useUpdateTemplateSection,
  useDeleteTemplateSection,
  useCreateTemplateVariable,
  useUpdateTemplateVariable,
  useDeleteTemplateVariable,
} from '@/hooks/queries/useTemplates';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type {
  TemplateStatus,
  TemplateSection,
  TemplateVariable,
  TemplateVersion,
  NumberingStyle,
  VariableType,
} from '@/types/template.types';
import {
  templateTypeLabels,
  templateStatusLabels,
  variableTypeLabels,
} from '@/types/template.types';

// ============================================================================
// STATUS CONFIG
// ============================================================================

const statusConfig: Record<
  TemplateStatus,
  { label: string; color: string; bgColor: string }
> = {
  draft: {
    label: 'Draft',
    color: 'text-ghost-600',
    bgColor: 'bg-ghost-100',
  },
  pending_review: {
    label: 'Pending Review',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
  },
  pending_approval: {
    label: 'Pending Approval',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
  },
  approved: {
    label: 'Approved',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
  },
  active: {
    label: 'Active',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
  },
  deprecated: {
    label: 'Deprecated',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
  },
  archived: {
    label: 'Archived',
    color: 'text-ghost-500',
    bgColor: 'bg-ghost-50',
  },
};

// ============================================================================
// TEMPLATE DETAIL PAGE
// ============================================================================

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TemplateDetailPage({ params }: PageProps) {
  const { id: templateId } = use(params);
  const router = useRouter();
  const { userProfile } = useAuth();
  const userId = userProfile?.id;

  const [activeTab, setActiveTab] = useState('overview');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingVariableId, setEditingVariableId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Fetch data
  const { data: template, isLoading, error } = useTemplate(templateId);
  const { data: versions, isLoading: versionsLoading } = useTemplateVersions(templateId);

  // Mutations
  const deleteMutation = useDeleteTemplate();
  const publishMutation = usePublishTemplate();
  const updateMutation = useUpdateTemplate();
  const createSectionMutation = useCreateTemplateSection();
  const updateSectionMutation = useUpdateTemplateSection();
  const deleteSectionMutation = useDeleteTemplateSection();
  const createVariableMutation = useCreateTemplateVariable();
  const updateVariableMutation = useUpdateTemplateVariable();
  const deleteVariableMutation = useDeleteTemplateVariable();

  // Handlers
  const handleDelete = async () => {
    await deleteMutation.mutateAsync(templateId);
    router.push('/dashboard/contracts/templates');
  };

  const handlePublish = async () => {
    if (!userId) return;
    await publishMutation.mutateAsync({
      templateId,
      approverId: userId,
    });
  };

  const handleArchive = async () => {
    await updateMutation.mutateAsync({
      templateId,
      data: { status: 'archived' },
    });
  };

  const handleDuplicate = () => {
    router.push(`/dashboard/contracts/templates/new?duplicate=${templateId}`);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-ghost-100 p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64 w-full mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="min-h-screen bg-ghost-100 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="font-mono text-sm text-ghost-600">Template not found</p>
          <button
            onClick={() => router.push('/dashboard/contracts/templates')}
            className="mt-4 font-mono text-xs text-purple-900 hover:underline"
          >
            Back to templates
          </button>
        </div>
      </div>
    );
  }

  const config = statusConfig[template.status];

  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Top Status Bar */}
      <div className="border-b border-ghost-300 bg-white px-6 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard/contracts/templates')}
              className="p-1 hover:bg-ghost-100"
            >
              <ArrowLeft className="h-4 w-4 text-ghost-600" />
            </button>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-purple-500 animate-pulse" />
              <span className="font-mono text-xs text-ghost-700 uppercase">
                TEMPLATE DETAIL
              </span>
            </div>
            <div className="font-mono text-xs text-ghost-500">
              ID: {templateId.slice(0, 8)}...
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge className={cn('font-mono text-xs', config.bgColor, config.color)}>
              {config.label}
            </Badge>
            <span className="font-mono text-xs text-ghost-500">
              v{template.version}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Header */}
        <div className="border border-ghost-300 bg-white p-6 mb-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-purple-900">
                  {template.name}
                </h1>
                {template.is_default && (
                  <Badge className="font-mono text-[10px] bg-purple-100 text-purple-700">
                    DEFAULT
                  </Badge>
                )}
              </div>
              {template.description && (
                <p className="font-mono text-sm text-ghost-600 mb-4">
                  {template.description}
                </p>
              )}
              <div className="flex items-center gap-6 font-mono text-xs text-ghost-500">
                <div>
                  <span className="uppercase">Type: </span>
                  <span className="text-ghost-700">
                    {templateTypeLabels[template.template_type] || template.template_type}
                  </span>
                </div>
                {template.category && (
                  <div>
                    <span className="uppercase">Category: </span>
                    <span className="text-ghost-700">{template.category}</span>
                  </div>
                )}
                {template.jurisdiction && (
                  <div>
                    <span className="uppercase">Jurisdiction: </span>
                    <span className="text-ghost-700">{template.jurisdiction}</span>
                  </div>
                )}
                <div>
                  <span className="uppercase">Language: </span>
                  <span className="text-ghost-700">{template.language?.toUpperCase()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push(`/dashboard/contracts/templates/${templateId}/edit`)}
                className="border border-ghost-300 px-4 py-2 font-mono text-xs hover:border-purple-900 hover:bg-ghost-50 flex items-center gap-2"
              >
                <Edit className="h-3 w-3" />
                EDIT
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger className="border border-ghost-300 p-2 hover:border-purple-900 hover:bg-ghost-50">
                  <MoreHorizontal className="h-4 w-4 text-ghost-600" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDuplicate}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  {template.status === 'draft' && (
                    <DropdownMenuItem onClick={handlePublish}>
                      <Send className="h-4 w-4 mr-2" />
                      Publish
                    </DropdownMenuItem>
                  )}
                  {template.status === 'active' && (
                    <DropdownMenuItem onClick={handleArchive}>
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteDialogOpen(true)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <InfoCard
            label="Sections"
            value={template.sections?.length || 0}
            icon={Layers}
          />
          <InfoCard
            label="Variables"
            value={template.variables?.length || 0}
            icon={Variable}
          />
          <InfoCard
            label="Version"
            value={`v${template.version}`}
            icon={History}
          />
          <InfoCard
            label="Usage"
            value={template.usage_count || 0}
            icon={FileStack}
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="border border-ghost-300 bg-white p-1 w-full justify-start gap-0 h-auto">
            <TabsTrigger
              value="overview"
              className="font-mono text-xs uppercase px-4 py-2 data-[state=active]:bg-purple-900 data-[state=active]:text-white rounded-none"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="sections"
              className="font-mono text-xs uppercase px-4 py-2 data-[state=active]:bg-purple-900 data-[state=active]:text-white rounded-none"
            >
              Sections ({template.sections?.length || 0})
            </TabsTrigger>
            <TabsTrigger
              value="variables"
              className="font-mono text-xs uppercase px-4 py-2 data-[state=active]:bg-purple-900 data-[state=active]:text-white rounded-none"
            >
              Variables ({template.variables?.length || 0})
            </TabsTrigger>
            <TabsTrigger
              value="versions"
              className="font-mono text-xs uppercase px-4 py-2 data-[state=active]:bg-purple-900 data-[state=active]:text-white rounded-none"
            >
              Versions
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              className="font-mono text-xs uppercase px-4 py-2 data-[state=active]:bg-purple-900 data-[state=active]:text-white rounded-none"
            >
              Preview
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Details */}
              <div className="border border-ghost-300 bg-white p-6">
                <h3 className="font-mono text-sm font-semibold text-purple-900 uppercase mb-4">
                  Template Details
                </h3>
                <div className="space-y-4">
                  <DetailRow label="Created" value={formatDate(template.created_at)} />
                  <DetailRow label="Updated" value={formatDate(template.updated_at)} />
                  <DetailRow
                    label="Created By"
                    value={template.creator?.full_name || 'Unknown'}
                  />
                  {template.approver && (
                    <DetailRow
                      label="Approved By"
                      value={template.approver.full_name}
                    />
                  )}
                  {template.approved_at && (
                    <DetailRow
                      label="Approved At"
                      value={formatDate(template.approved_at)}
                    />
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className="border border-ghost-300 bg-white p-6">
                <h3 className="font-mono text-sm font-semibold text-purple-900 uppercase mb-4">
                  Metadata
                </h3>
                <div className="space-y-4">
                  {template.metadata?.tags && template.metadata.tags.length > 0 && (
                    <div>
                      <span className="font-mono text-xs text-ghost-500 uppercase block mb-2">
                        Tags
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {template.metadata.tags.map((tag) => (
                          <Badge
                            key={tag}
                            className="font-mono text-xs bg-ghost-100 text-ghost-700"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {template.metadata?.industry && (
                    <DetailRow label="Industry" value={template.metadata.industry} />
                  )}
                  {template.metadata?.department && (
                    <DetailRow label="Department" value={template.metadata.department} />
                  )}
                  {template.metadata?.legal_review_required !== undefined && (
                    <DetailRow
                      label="Legal Review Required"
                      value={template.metadata.legal_review_required ? 'Yes' : 'No'}
                    />
                  )}
                  {template.metadata?.typical_duration_days && (
                    <DetailRow
                      label="Typical Duration"
                      value={`${template.metadata.typical_duration_days} days`}
                    />
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Sections Tab */}
          <TabsContent value="sections" className="mt-6">
            <div className="border border-ghost-300 bg-white">
              <div className="border-b border-ghost-300 px-4 py-3 flex justify-between items-center">
                <h3 className="font-mono text-sm font-semibold text-purple-900 uppercase">
                  Template Sections
                </h3>
                <button
                  onClick={() => router.push(`/dashboard/contracts/templates/${templateId}/edit?tab=sections`)}
                  className="border border-ghost-300 px-3 py-1.5 font-mono text-xs hover:border-purple-900 hover:bg-ghost-50 flex items-center gap-2"
                >
                  <Plus className="h-3 w-3" />
                  ADD SECTION
                </button>
              </div>

              {!template.sections || template.sections.length === 0 ? (
                <div className="p-12 text-center">
                  <Layers className="h-12 w-12 text-ghost-300 mx-auto mb-4" />
                  <p className="font-mono text-sm text-ghost-600 mb-2">
                    No sections defined
                  </p>
                  <button
                    onClick={() => router.push(`/dashboard/contracts/templates/${templateId}/edit?tab=sections`)}
                    className="font-mono text-xs text-purple-900 hover:underline"
                  >
                    Add your first section
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-ghost-200">
                  {template.sections
                    .filter((s) => !s.parent_section_id)
                    .sort((a, b) => a.section_order - b.section_order)
                    .map((section) => (
                      <SectionRow
                        key={section.id}
                        section={section}
                        allSections={template.sections || []}
                        expanded={expandedSections.has(section.id)}
                        onToggle={() => toggleSection(section.id)}
                        depth={0}
                      />
                    ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Variables Tab */}
          <TabsContent value="variables" className="mt-6">
            <div className="border border-ghost-300 bg-white">
              <div className="border-b border-ghost-300 px-4 py-3 flex justify-between items-center">
                <h3 className="font-mono text-sm font-semibold text-purple-900 uppercase">
                  Template Variables
                </h3>
                <button
                  onClick={() => router.push(`/dashboard/contracts/templates/${templateId}/edit?tab=variables`)}
                  className="border border-ghost-300 px-3 py-1.5 font-mono text-xs hover:border-purple-900 hover:bg-ghost-50 flex items-center gap-2"
                >
                  <Plus className="h-3 w-3" />
                  ADD VARIABLE
                </button>
              </div>

              {!template.variables || template.variables.length === 0 ? (
                <div className="p-12 text-center">
                  <Variable className="h-12 w-12 text-ghost-300 mx-auto mb-4" />
                  <p className="font-mono text-sm text-ghost-600 mb-2">
                    No variables defined
                  </p>
                  <button
                    onClick={() => router.push(`/dashboard/contracts/templates/${templateId}/edit?tab=variables`)}
                    className="font-mono text-xs text-purple-900 hover:underline"
                  >
                    Add your first variable
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-ghost-200">
                  {/* Group variables by group_name */}
                  {(() => {
                    const groups: Record<string, TemplateVariable[]> = {};
                    template.variables.forEach((v) => {
                      const group = v.group_name || 'Ungrouped';
                      if (!groups[group]) groups[group] = [];
                      groups[group].push(v);
                    });
                    return Object.entries(groups).map(([groupName, vars]) => (
                      <div key={groupName}>
                        {groupName !== 'Ungrouped' && (
                          <div className="px-4 py-2 bg-ghost-50 border-b border-ghost-200">
                            <span className="font-mono text-xs font-semibold text-ghost-600 uppercase">
                              {groupName}
                            </span>
                          </div>
                        )}
                        {vars
                          .sort((a, b) => a.display_order - b.display_order)
                          .map((variable) => (
                            <VariableRow key={variable.id} variable={variable} />
                          ))}
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Versions Tab */}
          <TabsContent value="versions" className="mt-6">
            <div className="border border-ghost-300 bg-white">
              <div className="border-b border-ghost-300 px-4 py-3">
                <h3 className="font-mono text-sm font-semibold text-purple-900 uppercase">
                  Version History
                </h3>
              </div>

              {versionsLoading ? (
                <div className="p-4 space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : !versions || versions.length === 0 ? (
                <div className="p-12 text-center">
                  <History className="h-12 w-12 text-ghost-300 mx-auto mb-4" />
                  <p className="font-mono text-sm text-ghost-600">
                    No version history available
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-ghost-200">
                  {versions.map((version) => (
                    <VersionRow
                      key={version.id}
                      version={version}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="mt-6">
            <div className="border border-ghost-300 bg-white p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-mono text-sm font-semibold text-purple-900 uppercase">
                  Template Preview
                </h3>
                <div className="flex items-center gap-2">
                  <button className="border border-ghost-300 px-3 py-1.5 font-mono text-xs hover:border-purple-900 hover:bg-ghost-50 flex items-center gap-2">
                    <Eye className="h-3 w-3" />
                    RENDERED
                  </button>
                  <button className="border border-ghost-300 px-3 py-1.5 font-mono text-xs hover:border-purple-900 hover:bg-ghost-50 flex items-center gap-2">
                    <Code className="h-3 w-3" />
                    SOURCE
                  </button>
                </div>
              </div>

              <div className="prose prose-sm max-w-none font-mono">
                {template.sections
                  ?.filter((s) => !s.parent_section_id)
                  .sort((a, b) => a.section_order - b.section_order)
                  .map((section, index) => (
                    <div key={section.id} className="mb-6">
                      <h2 className="text-lg font-semibold text-purple-900 mb-2">
                        {index + 1}. {section.title}
                      </h2>
                      <div className="text-ghost-700 whitespace-pre-wrap">
                        {highlightVariables(section.content)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono text-lg text-purple-900">
              Delete Template
            </DialogTitle>
            <DialogDescription className="font-mono text-sm text-ghost-600">
              Are you sure you want to delete &quot;{template.name}&quot;? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button
              onClick={() => setDeleteDialogOpen(false)}
              className="border border-ghost-300 px-4 py-2 font-mono text-xs hover:border-ghost-500"
            >
              CANCEL
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="border border-red-600 bg-red-600 text-white px-4 py-2 font-mono text-xs hover:bg-red-700 disabled:opacity-50"
            >
              {deleteMutation.isPending ? 'DELETING...' : 'DELETE'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// INFO CARD
// ============================================================================

interface InfoCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
}

function InfoCard({ label, value, icon: Icon }: InfoCardProps) {
  return (
    <div className="border border-ghost-300 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-ghost-100">
          <Icon className="h-4 w-4 text-ghost-600" />
        </div>
        <div>
          <span className="font-mono text-xs text-ghost-500 uppercase block">
            {label}
          </span>
          <span className="font-mono text-lg font-semibold text-purple-900">
            {value}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DETAIL ROW
// ============================================================================

interface DetailRowProps {
  label: string;
  value: string;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex justify-between items-center">
      <span className="font-mono text-xs text-ghost-500 uppercase">{label}</span>
      <span className="font-mono text-sm text-ghost-700">{value}</span>
    </div>
  );
}

// ============================================================================
// SECTION ROW
// ============================================================================

interface SectionRowProps {
  section: TemplateSection;
  allSections: TemplateSection[];
  expanded: boolean;
  onToggle: () => void;
  depth: number;
}

function SectionRow({ section, allSections, expanded, onToggle, depth }: SectionRowProps) {
  const children = allSections.filter((s) => s.parent_section_id === section.id);
  const hasChildren = children.length > 0;

  return (
    <div>
      <div
        className={cn(
          'px-4 py-3 hover:bg-ghost-50 cursor-pointer flex items-center gap-3',
          depth > 0 && 'pl-8'
        )}
        style={{ paddingLeft: `${16 + depth * 24}px` }}
        onClick={onToggle}
      >
        <GripVertical className="h-4 w-4 text-ghost-300" />
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="h-4 w-4 text-ghost-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-ghost-500" />
          )
        ) : (
          <div className="w-4" />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium text-purple-900">
              {section.title}
            </span>
            {section.is_optional && (
              <Badge className="font-mono text-[10px] bg-ghost-100 text-ghost-600">
                OPTIONAL
              </Badge>
            )}
          </div>
          <div className="font-mono text-xs text-ghost-500 line-clamp-1 mt-1">
            {section.content.substring(0, 100)}
            {section.content.length > 100 && '...'}
          </div>
        </div>
        <Badge className="font-mono text-[10px] bg-ghost-100 text-ghost-600">
          {section.numbering_style}
        </Badge>
      </div>
      {expanded && hasChildren && (
        <div>
          {children
            .sort((a, b) => a.section_order - b.section_order)
            .map((child) => (
              <SectionRow
                key={child.id}
                section={child}
                allSections={allSections}
                expanded={expanded}
                onToggle={() => {}}
                depth={depth + 1}
              />
            ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// VARIABLE ROW
// ============================================================================

interface VariableRowProps {
  variable: TemplateVariable;
}

function VariableRow({ variable }: VariableRowProps) {
  return (
    <div className="px-4 py-3 hover:bg-ghost-50 flex items-center gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <code className="font-mono text-sm font-medium text-purple-900 bg-purple-50 px-2 py-0.5">
            {`{{${variable.variable_name}}}`}
          </code>
          {variable.is_required && (
            <Badge className="font-mono text-[10px] bg-red-100 text-red-700">
              REQUIRED
            </Badge>
          )}
        </div>
        <div className="font-mono text-xs text-ghost-600 mt-1">
          {variable.variable_label}
          {variable.description && (
            <span className="text-ghost-400"> - {variable.description}</span>
          )}
        </div>
      </div>
      <Badge className="font-mono text-xs bg-ghost-100 text-ghost-600">
        {variableTypeLabels[variable.variable_type]}
      </Badge>
      {variable.default_value !== null && (
        <div className="font-mono text-xs text-ghost-500">
          Default: {String(variable.default_value)}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// VERSION ROW
// ============================================================================

interface VersionRowProps {
  version: TemplateVersion;
  formatDate: (date: string) => string;
}

function VersionRow({ version, formatDate }: VersionRowProps) {
  return (
    <div className="px-4 py-3 hover:bg-ghost-50 flex items-center gap-4">
      <div className="p-2 bg-ghost-100">
        <History className="h-4 w-4 text-ghost-600" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium text-purple-900">
            v{version.version_number}
          </span>
          {version.is_published && (
            <Badge className="font-mono text-[10px] bg-green-100 text-green-700">
              PUBLISHED
            </Badge>
          )}
        </div>
        {version.change_summary && (
          <div className="font-mono text-xs text-ghost-600 mt-1">
            {version.change_summary}
          </div>
        )}
      </div>
      <div className="text-right">
        <div className="font-mono text-xs text-ghost-600">
          {formatDate(version.created_at)}
        </div>
        <div className="font-mono text-xs text-ghost-400">
          by {version.creator?.full_name || 'Unknown'}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function highlightVariables(content: string): React.ReactNode {
  const parts = content.split(/(\{\{[^}]+\}\})/g);
  return parts.map((part, index) => {
    if (part.match(/\{\{[^}]+\}\}/)) {
      return (
        <code
          key={index}
          className="bg-purple-100 text-purple-700 px-1 rounded font-mono text-sm"
        >
          {part}
        </code>
      );
    }
    return part;
  });
}
