'use client';

import {
  Plus,
  FileText,
  ClipboardList,
  Eye,
  Settings,
  Play,
  AlertCircle,
  Clock,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '@/contexts/AuthContext';
import { useIntakeFormList, useIntakeStats } from '@/hooks/queries/useIntakeForms';
import { usePendingSubmissions } from '@/hooks/queries/useIntakeSubmissions';
import { cn } from '@/lib/utils';
import {
  IntakeForm,
  IntakeSubmission,
  formTypeLabels,
  submissionStatusLabels,
  priorityLabels,
  priorityColors,
  statusColors,
} from '@/types/intake.types';

import { CreateFormDialog } from './_components/CreateFormDialog';

export default function IntakePage() {
  const router = useRouter();
  const { userProfile, isLoading: isAuthLoading } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'forms' | 'submissions'>('overview');

  // Fetch data
  const {
    data: forms,
    isLoading: isFormsLoading,
    error: formsError,
  } = useIntakeFormList(userProfile?.enterprise_id || '');

  const {
    data: stats,
    isLoading: isStatsLoading,
  } = useIntakeStats(userProfile?.enterprise_id || '');

  const {
    data: pendingSubmissions,
    isLoading: isPendingLoading,
  } = usePendingSubmissions(userProfile?.enterprise_id || '');

  const isLoading = isAuthLoading || isFormsLoading || isStatsLoading || isPendingLoading;

  // Group forms by status
  const formsByStatus = useMemo(() => {
    if (!forms) return { active: [], draft: [] };
    return {
      active: forms.filter(f => f.status === 'active'),
      draft: forms.filter(f => f.status === 'draft'),
    };
  }, [forms]);

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-ghost-100">
        <div className="border-b border-ghost-300 bg-white px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-ghost-400 animate-pulse" />
            <span className="font-mono text-xs text-ghost-700">LOADING...</span>
          </div>
        </div>
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner size="lg" showText text="Loading intake system..." />
        </div>
      </div>
    );
  }

  // Handle error state
  if (formsError) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Intake Forms</AlertTitle>
        <AlertDescription>
          {formsError?.message || 'An error occurred while loading intake forms'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Top Status Bar */}
      <div className="border-b border-ghost-300 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 animate-pulse" />
              <span className="font-mono text-xs text-ghost-700">CONTRACT INTAKE SYSTEM</span>
            </div>
            <div className="font-mono text-xs text-ghost-600">
              LAST UPDATE: {new Date().toLocaleTimeString()}
            </div>
          </div>
          <div className="flex items-center gap-6 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="text-ghost-600">ACTIVE FORMS:</span>
              <span className="font-semibold text-purple-900">{stats?.forms.active_forms || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-ghost-600">PENDING REVIEW:</span>
              <span className="font-semibold text-amber-600">{stats?.submissions.pending_review || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-ghost-600">TOTAL SUBMISSIONS:</span>
              <span className="font-semibold text-purple-900">{stats?.submissions.total || 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Tabs */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-1 border border-ghost-300 bg-white p-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={cn(
                'px-4 py-2 font-mono text-xs transition-colors',
                activeTab === 'overview'
                  ? 'bg-purple-900 text-white'
                  : 'text-ghost-700 hover:bg-ghost-50'
              )}
            >
              OVERVIEW
            </button>
            <button
              onClick={() => setActiveTab('forms')}
              className={cn(
                'px-4 py-2 font-mono text-xs transition-colors',
                activeTab === 'forms'
                  ? 'bg-purple-900 text-white'
                  : 'text-ghost-700 hover:bg-ghost-50'
              )}
            >
              MANAGE FORMS
            </button>
            <button
              onClick={() => setActiveTab('submissions')}
              className={cn(
                'px-4 py-2 font-mono text-xs transition-colors',
                activeTab === 'submissions'
                  ? 'bg-purple-900 text-white'
                  : 'text-ghost-700 hover:bg-ghost-50'
              )}
            >
              ALL SUBMISSIONS
            </button>
          </div>
          <button
            onClick={() => setIsCreateDialogOpen(true)}
            className="border border-ghost-300 bg-purple-900 text-white px-4 py-2 font-mono text-xs font-semibold hover:bg-purple-800 flex items-center gap-2"
          >
            <Plus className="h-3 w-3" />
            NEW FORM
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
              <StatCard
                label="Total Forms"
                value={stats?.forms.total_forms || 0}
                icon={FileText}
              />
              <StatCard
                label="Active Forms"
                value={stats?.forms.active_forms || 0}
                icon={Play}
                accent="green"
              />
              <StatCard
                label="Pending Review"
                value={stats?.submissions.pending_review || 0}
                icon={Clock}
                accent="amber"
              />
              <StatCard
                label="Last 30 Days"
                value={stats?.submissions.last_30_days || 0}
                icon={ClipboardList}
              />
            </div>

            {/* Pending Submissions */}
            {pendingSubmissions && pendingSubmissions.length > 0 && (
              <div className="border border-ghost-300 bg-white">
                <div className="border-b border-ghost-300 px-4 py-3 flex items-center justify-between">
                  <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                    PENDING REVIEW ({pendingSubmissions.length})
                  </h3>
                  <button
                    onClick={() => setActiveTab('submissions')}
                    className="font-mono text-xs text-purple-900 hover:underline flex items-center gap-1"
                  >
                    VIEW ALL <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
                <div className="divide-y divide-ghost-200">
                  {pendingSubmissions.slice(0, 5).map((submission) => (
                    <SubmissionRow
                      key={submission.id}
                      submission={submission}
                      onClick={() => router.push(`/dashboard/contracts/intake/submissions/${submission.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Active Forms */}
            <div className="border border-ghost-300 bg-white">
              <div className="border-b border-ghost-300 px-4 py-3 flex items-center justify-between">
                <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                  ACTIVE FORMS ({formsByStatus.active.length})
                </h3>
                <button
                  onClick={() => setActiveTab('forms')}
                  className="font-mono text-xs text-purple-900 hover:underline flex items-center gap-1"
                >
                  MANAGE <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              {formsByStatus.active.length > 0 ? (
                <div className="divide-y divide-ghost-200">
                  {formsByStatus.active.map((form) => (
                    <FormRow
                      key={form.id}
                      form={form}
                      onEdit={() => router.push(`/dashboard/contracts/intake/forms/${form.id}`)}
                      onSubmit={() => router.push(`/dashboard/contracts/intake/new?form=${form.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <div className="px-6 py-12 text-center">
                  <FileText className="h-12 w-12 text-ghost-400 mx-auto mb-3" />
                  <p className="font-mono text-xs text-ghost-600 uppercase">
                    No active forms. Create one to get started.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Forms Tab */}
        {activeTab === 'forms' && (
          <div className="border border-ghost-300 bg-white">
            <div className="border-b border-ghost-300 px-4 py-3">
              <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                ALL FORMS ({forms?.length || 0})
              </h3>
            </div>

            {/* Table Header */}
            <div className="flex items-center border-b border-ghost-300 bg-ghost-700 font-mono text-xs text-white px-4 py-2">
              <div className="w-64 flex-shrink-0">NAME</div>
              <div className="w-40 px-4 flex-shrink-0">TYPE</div>
              <div className="w-24 px-4 flex-shrink-0">STATUS</div>
              <div className="w-24 px-4 flex-shrink-0">VERSION</div>
              <div className="w-32 px-4 flex-shrink-0">CREATED</div>
              <div className="flex-1 text-right">ACTIONS</div>
            </div>

            {forms && forms.length > 0 ? (
              <div className="divide-y divide-ghost-200">
                {forms.map((form) => (
                  <div
                    key={form.id}
                    className="flex items-center px-4 py-3 hover:bg-purple-50 transition-colors"
                  >
                    <div className="w-64 flex-shrink-0">
                      <p className="font-mono text-xs text-ghost-900 truncate">{form.name}</p>
                      {form.description && (
                        <p className="font-mono text-[10px] text-ghost-500 truncate">{form.description}</p>
                      )}
                    </div>
                    <div className="w-40 px-4 flex-shrink-0">
                      <span className="font-mono text-xs text-ghost-700">
                        {formTypeLabels[form.form_type]}
                      </span>
                    </div>
                    <div className="w-24 px-4 flex-shrink-0">
                      <Badge
                        variant="outline"
                        className={cn(
                          'font-mono text-[10px] uppercase',
                          form.status === 'active'
                            ? 'border-green-500 text-green-700 bg-green-50'
                            : form.status === 'draft'
                            ? 'border-blue-500 text-blue-700 bg-blue-50'
                            : 'border-ghost-500 text-ghost-700 bg-ghost-50'
                        )}
                      >
                        {form.status}
                      </Badge>
                    </div>
                    <div className="w-24 px-4 flex-shrink-0">
                      <span className="font-mono text-xs text-ghost-700">v{form.version}</span>
                    </div>
                    <div className="w-32 px-4 flex-shrink-0">
                      <span className="font-mono text-xs text-ghost-700">{formatDate(form.created_at)}</span>
                    </div>
                    <div className="flex-1 flex justify-end gap-2">
                      <button
                        onClick={() => router.push(`/dashboard/contracts/intake/forms/${form.id}`)}
                        className="border border-ghost-300 bg-white px-3 py-1 text-[10px] font-mono text-ghost-700 hover:bg-ghost-50 hover:border-purple-900 uppercase flex items-center gap-1"
                      >
                        <Settings className="h-3 w-3" />
                        EDIT
                      </button>
                      {form.status === 'active' && (
                        <button
                          onClick={() => router.push(`/dashboard/contracts/intake/new?form=${form.id}`)}
                          className="border border-purple-900 bg-purple-900 px-3 py-1 text-[10px] font-mono text-white hover:bg-purple-800 uppercase flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          SUBMIT
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <FileText className="h-12 w-12 text-ghost-400 mx-auto mb-3" />
                <p className="font-mono text-xs text-ghost-600 uppercase mb-4">
                  No intake forms created yet
                </p>
                <button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="border border-ghost-300 bg-purple-900 text-white px-4 py-2 font-mono text-xs font-semibold hover:bg-purple-800"
                >
                  CREATE YOUR FIRST FORM
                </button>
              </div>
            )}
          </div>
        )}

        {/* Submissions Tab */}
        {activeTab === 'submissions' && (
          <SubmissionsTable
            enterpriseId={userProfile?.enterprise_id || ''}
          />
        )}
      </div>

      {/* Create Form Dialog */}
      <CreateFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        enterpriseId={userProfile?.enterprise_id || ''}
        userId={userProfile?.id || ''}
      />
    </div>
  );
}

// ============================================================================
// COMPONENTS
// ============================================================================

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  accent?: string;
}) {
  const iconColorClass = accent === 'green' ? 'text-green-500' :
    accent === 'amber' ? 'text-amber-500' :
    accent === 'red' ? 'text-red-500' :
    'text-ghost-400';

  const valueColorClass = accent === 'green' ? 'text-green-600' :
    accent === 'amber' ? 'text-amber-600' :
    accent === 'red' ? 'text-red-600' :
    'text-purple-900';

  return (
    <div className="border border-ghost-300 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <Icon className={cn('h-5 w-5', iconColorClass)} />
        <span className={cn('font-mono text-2xl font-semibold', valueColorClass)}>
          {value}
        </span>
      </div>
      <p className="font-mono text-xs text-ghost-600 uppercase">{label}</p>
    </div>
  );
}

function FormRow({
  form,
  onEdit,
  onSubmit,
}: {
  form: IntakeForm;
  onEdit: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-purple-50 transition-colors">
      <div className="flex items-center gap-4">
        <FileText className="h-5 w-5 text-purple-900" />
        <div>
          <p className="font-mono text-xs text-ghost-900">{form.name}</p>
          <p className="font-mono text-[10px] text-ghost-500">
            {formTypeLabels[form.form_type]} &middot; v{form.version}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onEdit}
          className="border border-ghost-300 bg-white px-3 py-1 text-[10px] font-mono text-ghost-700 hover:bg-ghost-50 hover:border-purple-900 uppercase"
        >
          EDIT
        </button>
        <button
          onClick={onSubmit}
          className="border border-purple-900 bg-purple-900 px-3 py-1 text-[10px] font-mono text-white hover:bg-purple-800 uppercase"
        >
          NEW REQUEST
        </button>
      </div>
    </div>
  );
}

function SubmissionRow({
  submission,
  onClick,
}: {
  submission: IntakeSubmission;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between px-4 py-3 hover:bg-purple-50 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-4">
        <ClipboardList className="h-5 w-5 text-purple-900" />
        <div>
          <p className="font-mono text-xs text-ghost-900">{submission.submission_number}</p>
          <p className="font-mono text-[10px] text-ghost-500">
            {submission.requester_name} &middot; {submission.form?.name || 'Unknown Form'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className={cn('font-mono text-xs', priorityColors[submission.priority])}>
          {priorityLabels[submission.priority]}
        </span>
        <Badge className={cn('font-mono text-[10px] uppercase', statusColors[submission.status])}>
          {submissionStatusLabels[submission.status]}
        </Badge>
        <Eye className="h-4 w-4 text-ghost-400" />
      </div>
    </div>
  );
}

function SubmissionsTable({ enterpriseId }: { enterpriseId: string }) {
  const router = useRouter();
  const { data, isLoading } = usePendingSubmissions(enterpriseId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="lg" showText text="Loading submissions..." />
      </div>
    );
  }

  return (
    <div className="border border-ghost-300 bg-white">
      <div className="border-b border-ghost-300 px-4 py-3">
        <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
          ALL SUBMISSIONS
        </h3>
      </div>

      {/* Table Header */}
      <div className="flex items-center border-b border-ghost-300 bg-ghost-700 font-mono text-xs text-white px-4 py-2">
        <div className="w-32 flex-shrink-0">NUMBER</div>
        <div className="w-48 px-4 flex-shrink-0">REQUESTER</div>
        <div className="w-40 px-4 flex-shrink-0">FORM</div>
        <div className="w-24 px-4 flex-shrink-0">PRIORITY</div>
        <div className="w-28 px-4 flex-shrink-0">STATUS</div>
        <div className="w-32 px-4 flex-shrink-0">SUBMITTED</div>
        <div className="flex-1 text-right">ACTION</div>
      </div>

      {data && data.length > 0 ? (
        <div className="divide-y divide-ghost-200">
          {data.map((submission) => (
            <div
              key={submission.id}
              className="flex items-center px-4 py-3 hover:bg-purple-50 transition-colors cursor-pointer"
              onClick={() => router.push(`/dashboard/contracts/intake/submissions/${submission.id}`)}
            >
              <div className="w-32 flex-shrink-0">
                <span className="font-mono text-xs text-purple-900">{submission.submission_number}</span>
              </div>
              <div className="w-48 px-4 flex-shrink-0">
                <p className="font-mono text-xs text-ghost-900 truncate">{submission.requester_name}</p>
                <p className="font-mono text-[10px] text-ghost-500 truncate">{submission.requester_email}</p>
              </div>
              <div className="w-40 px-4 flex-shrink-0">
                <span className="font-mono text-xs text-ghost-700">{submission.form?.name || 'N/A'}</span>
              </div>
              <div className="w-24 px-4 flex-shrink-0">
                <span className={cn('font-mono text-xs', priorityColors[submission.priority])}>
                  {priorityLabels[submission.priority]}
                </span>
              </div>
              <div className="w-28 px-4 flex-shrink-0">
                <Badge className={cn('font-mono text-[10px] uppercase', statusColors[submission.status])}>
                  {submissionStatusLabels[submission.status]}
                </Badge>
              </div>
              <div className="w-32 px-4 flex-shrink-0">
                <span className="font-mono text-xs text-ghost-700">
                  {new Date(submission.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex-1 flex justify-end">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/dashboard/contracts/intake/submissions/${submission.id}`);
                  }}
                  className="border border-ghost-300 bg-white px-3 py-1 text-[10px] font-mono text-ghost-700 hover:bg-ghost-50 hover:border-purple-900 uppercase"
                >
                  <Eye className="h-3 w-3 inline mr-1" />
                  VIEW
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-6 py-12 text-center">
          <ClipboardList className="h-12 w-12 text-ghost-400 mx-auto mb-3" />
          <p className="font-mono text-xs text-ghost-600 uppercase">
            No submissions yet
          </p>
        </div>
      )}
    </div>
  );
}
