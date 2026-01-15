'use client';

import {
  Plus,
  Search,
  FileStack,
  Clock,
  CheckCircle2,
  Archive,
  Copy,
  Eye,
  MoreHorizontal,
  RefreshCw,
  Filter,
  Edit,
  Trash2,
  Send,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import {
  useTemplateList,
  useTemplateStats,
  useDeleteTemplate,
  usePublishTemplate,
} from '@/hooks/queries/useTemplates';
import { cn } from '@/lib/utils';
import type {
  TemplateListItem,
  TemplateStatus,
  TemplateType,
} from '@/types/template.types';
import {
  templateTypeLabels,
} from '@/types/template.types';

// ============================================================================
// STATUS CONFIG
// ============================================================================

const statusConfig: Record<
  TemplateStatus,
  { label: string; color: string; bgColor: string; icon: LucideIcon }
> = {
  draft: {
    label: 'Draft',
    color: 'text-ghost-600',
    bgColor: 'bg-ghost-100',
    icon: FileStack,
  },
  pending_review: {
    label: 'Pending Review',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    icon: Clock,
  },
  pending_approval: {
    label: 'Pending Approval',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    icon: Clock,
  },
  approved: {
    label: 'Approved',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    icon: CheckCircle2,
  },
  active: {
    label: 'Active',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    icon: CheckCircle2,
  },
  deprecated: {
    label: 'Deprecated',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    icon: Archive,
  },
  archived: {
    label: 'Archived',
    color: 'text-ghost-500',
    bgColor: 'bg-ghost-50',
    icon: Archive,
  },
};

// ============================================================================
// TEMPLATES PAGE
// ============================================================================

export default function TemplatesPage() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const userId = userProfile?.id;
  const enterpriseId = userProfile?.enterprise_id;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TemplateStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<TemplateType | 'all'>('all');

  // Fetch data
  const {
    data: templates,
    isLoading: templatesLoading,
    refetch,
  } = useTemplateList(enterpriseId || '', {
    status: statusFilter === 'all' ? undefined : statusFilter,
    template_type: typeFilter === 'all' ? undefined : typeFilter,
    search: searchQuery || undefined,
  });

  const { data: stats, isLoading: statsLoading } = useTemplateStats(enterpriseId || '');

  // Mutations
  const deleteMutation = useDeleteTemplate();
  const publishMutation = usePublishTemplate();

  // Filter templates based on search
  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    if (!searchQuery) return templates;
    const query = searchQuery.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        (t.description?.toLowerCase().includes(query) ?? false)
    );
  }, [templates, searchQuery]);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!enterpriseId) {
    return (
      <div className="min-h-screen bg-ghost-100 flex items-center justify-center">
        <p className="font-mono text-sm text-ghost-600">No enterprise selected</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Top Status Bar */}
      <div className="border-b border-ghost-300 bg-white px-6 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-purple-500 animate-pulse" />
              <span className="font-mono text-xs text-ghost-700 uppercase">
                CONTRACT TEMPLATES
              </span>
            </div>
            <div className="font-mono text-xs text-ghost-600">
              LAST UPDATE: {new Date().toLocaleTimeString()}
            </div>
          </div>
          <div className="flex items-center gap-6 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="text-ghost-600 uppercase">Active:</span>
              <span className="font-semibold text-green-600">
                {stats?.by_status?.active || 0}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-ghost-600 uppercase">Draft:</span>
              <span className="font-semibold text-ghost-600">
                {stats?.by_status?.draft || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Header */}
        <div className="border border-ghost-300 bg-white p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-purple-900 mb-1">
                CONTRACT TEMPLATES
              </h1>
              <p className="font-mono text-xs text-ghost-600 uppercase">
                Create and manage reusable contract templates
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard/contracts/templates/new')}
              className="border border-purple-900 bg-purple-900 text-white px-4 py-2 font-mono text-xs hover:bg-purple-800 flex items-center gap-2"
            >
              <Plus className="h-3 w-3" />
              NEW TEMPLATE
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
          {statsLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))
          ) : (
            <>
              <StatCard
                label="Total"
                value={stats?.total || 0}
                color="text-purple-900"
              />
              <StatCard
                label="Active"
                value={stats?.by_status?.active || 0}
                color="text-green-600"
              />
              <StatCard
                label="Draft"
                value={stats?.by_status?.draft || 0}
                color="text-ghost-600"
              />
              <StatCard
                label="Pending"
                value={stats?.by_status?.pending_approval || 0}
                color="text-amber-600"
              />
              <StatCard
                label="Archived"
                value={stats?.by_status?.archived || 0}
                color="text-ghost-500"
              />
            </>
          )}
        </div>

        {/* Filters */}
        <div className="border border-ghost-300 bg-white p-4 mb-6">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ghost-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-ghost-300 font-mono text-sm focus:border-purple-900 focus:outline-none"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-ghost-500" />
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as TemplateStatus | 'all')
                }
                className="border border-ghost-300 px-3 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="pending_approval">Pending</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as TemplateType | 'all')
              }
              className="border border-ghost-300 px-3 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none"
            >
              <option value="all">All Types</option>
              {Object.entries(templateTypeLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>

            {/* Refresh */}
            <button
              onClick={() => refetch()}
              className="border border-ghost-300 p-2 hover:border-purple-900 hover:bg-ghost-50"
            >
              <RefreshCw className="h-4 w-4 text-ghost-600" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="border border-ghost-300 bg-white">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-ghost-300 bg-ghost-50">
            <div className="col-span-4 font-mono text-xs font-semibold text-ghost-700 uppercase">
              Template
            </div>
            <div className="col-span-2 font-mono text-xs font-semibold text-ghost-700 uppercase">
              Type
            </div>
            <div className="col-span-2 font-mono text-xs font-semibold text-ghost-700 uppercase">
              Status
            </div>
            <div className="col-span-1 font-mono text-xs font-semibold text-ghost-700 uppercase">
              Version
            </div>
            <div className="col-span-1 font-mono text-xs font-semibold text-ghost-700 uppercase">
              Usage
            </div>
            <div className="col-span-2 font-mono text-xs font-semibold text-ghost-700 uppercase text-right">
              Actions
            </div>
          </div>

          {/* Table Body */}
          {templatesLoading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="p-12 text-center">
              <FileStack className="h-12 w-12 text-ghost-300 mx-auto mb-4" />
              <p className="font-mono text-sm text-ghost-600 mb-2">
                No templates found
              </p>
              <button
                onClick={() => router.push('/dashboard/contracts/templates/new')}
                className="font-mono text-xs text-purple-900 hover:underline"
              >
                Create your first template
              </button>
            </div>
          ) : (
            <div className="divide-y divide-ghost-200">
              {filteredTemplates.map((template) => (
                <TemplateRow
                  key={template.id}
                  template={template}
                  onView={() =>
                    router.push(`/dashboard/contracts/templates/${template.id}`)
                  }
                  onEdit={() =>
                    router.push(`/dashboard/contracts/templates/${template.id}/edit`)
                  }
                  onDelete={() => deleteMutation.mutate(template.id)}
                  onPublish={() =>
                    userId && publishMutation.mutate({
                      templateId: template.id,
                      approverId: userId,
                    })
                  }
                  onDuplicate={() =>
                    router.push(`/dashboard/contracts/templates/new?duplicate=${template.id}`)
                  }
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STAT CARD
// ============================================================================

interface StatCardProps {
  label: string;
  value: number;
  color: string;
}

function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className="border border-ghost-300 bg-white p-4">
      <span className="font-mono text-xs text-ghost-600 uppercase block mb-1">
        {label}
      </span>
      <div className={cn('text-2xl font-bold', color)}>{value}</div>
    </div>
  );
}

// ============================================================================
// TEMPLATE ROW
// ============================================================================

interface TemplateRowProps {
  template: TemplateListItem;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPublish: () => void;
  onDuplicate: () => void;
  formatDate: (date: string) => string;
}

function TemplateRow({
  template,
  onView,
  onEdit,
  onDelete,
  onPublish,
  onDuplicate,
  formatDate,
}: TemplateRowProps) {
  const config = statusConfig[template.status];
  const StatusIcon = config.icon;

  return (
    <div
      className="grid grid-cols-12 gap-4 px-4 py-4 hover:bg-ghost-50 cursor-pointer group"
      onClick={onView}
    >
      {/* Template Info */}
      <div className="col-span-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="font-mono text-sm font-medium text-purple-900 group-hover:underline">
            {template.name}
          </div>
          {template.is_default && (
            <Badge className="font-mono text-[10px] bg-purple-100 text-purple-700">
              DEFAULT
            </Badge>
          )}
        </div>
        {template.description && (
          <div className="font-mono text-xs text-ghost-500 line-clamp-1">
            {template.description}
          </div>
        )}
        <div className="font-mono text-xs text-ghost-400 mt-1">
          Updated {formatDate(template.updated_at)}
        </div>
      </div>

      {/* Type */}
      <div className="col-span-2 flex items-center">
        <Badge className="font-mono text-xs bg-ghost-100 text-ghost-700">
          {templateTypeLabels[template.template_type]}
        </Badge>
      </div>

      {/* Status */}
      <div className="col-span-2 flex items-center">
        <Badge
          className={cn(
            'font-mono text-xs flex items-center gap-1',
            config.bgColor,
            config.color
          )}
        >
          <StatusIcon className="h-3 w-3" />
          {config.label}
        </Badge>
      </div>

      {/* Version */}
      <div className="col-span-1 flex items-center">
        <span className="font-mono text-sm text-ghost-600">v{template.version}</span>
      </div>

      {/* Usage */}
      <div className="col-span-1 flex items-center">
        <span className="font-mono text-sm text-ghost-600">{template.usage_count}</span>
      </div>

      {/* Actions */}
      <div className="col-span-2 flex items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={(e) => e.stopPropagation()}
            className="p-2 hover:bg-ghost-100 rounded"
          >
            <MoreHorizontal className="h-4 w-4 text-ghost-500" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onView}>
              <Eye className="h-4 w-4 mr-2" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            {template.status === 'draft' && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onPublish();
                }}
              >
                <Send className="h-4 w-4 mr-2" />
                Publish
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
