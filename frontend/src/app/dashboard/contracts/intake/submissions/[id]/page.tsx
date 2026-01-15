'use client';

import {
  ArrowLeft,
  Check,
  X,
  MessageSquare,
  FileText,
  AlertCircle,
  Send,
  User,
  Calendar,
  Building,
  Mail,
  RefreshCw,
  Loader2,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, use } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useIntakeSubmission, useReviewSubmission, useConvertSubmission, useAddSubmissionComment } from '@/hooks/queries/useIntakeSubmissions';
import { cn } from '@/lib/utils';
import {
  submissionStatusLabels,
  statusColors,
  priorityLabels,
  priorityColors,
  formTypeLabels,
} from '@/types/intake.types';

export default function SubmissionReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: submissionId } = use(params);
  const router = useRouter();
  const { userProfile, isLoading: isAuthLoading } = useAuth();

  // State
  const [reviewComment, setReviewComment] = useState('');
  const [newComment, setNewComment] = useState('');
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [contractTitle, setContractTitle] = useState('');

  // Queries
  const {
    data: submission,
    isLoading: isSubmissionLoading,
    error: submissionError,
  } = useIntakeSubmission(submissionId);

  // Mutations
  const reviewSubmission = useReviewSubmission();
  const convertSubmission = useConvertSubmission();
  const addComment = useAddSubmissionComment();

  const isLoading = isAuthLoading || isSubmissionLoading;

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Handlers
  const handleReview = async (decision: 'approve' | 'reject' | 'request_changes') => {
    if (!userProfile) return;

    try {
      await reviewSubmission.mutateAsync({
        submissionId,
        reviewerId: userProfile.id,
        data: {
          decision,
          comments: reviewComment || undefined,
        },
      });
      setReviewComment('');
    } catch (error) {
      console.error('Failed to review submission:', error);
    }
  };

  const handleAddComment = async () => {
    if (!userProfile || !newComment.trim()) return;

    try {
      await addComment.mutateAsync({
        submissionId,
        userId: userProfile.id,
        commentText: newComment.trim(),
      });
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleConvert = async () => {
    if (!userProfile || !userProfile.enterprise_id || !contractTitle.trim()) return;

    try {
      await convertSubmission.mutateAsync({
        submissionId,
        enterpriseId: userProfile.enterprise_id as string,
        userId: userProfile.id,
        data: {
          title: contractTitle.trim(),
        },
      });
      setShowConvertDialog(false);
      setContractTitle('');
    } catch (error) {
      console.error('Failed to convert submission:', error);
    }
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
          <LoadingSpinner size="lg" showText text="Loading submission..." />
        </div>
      </div>
    );
  }

  // Handle error state
  if (submissionError || !submission) {
    return (
      <div className="min-h-screen bg-ghost-100 p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Submission</AlertTitle>
          <AlertDescription>
            {submissionError?.message || 'Submission not found'}
          </AlertDescription>
        </Alert>
        <button
          onClick={() => router.push('/dashboard/contracts/intake')}
          className="mt-4 border border-ghost-300 bg-white px-4 py-2 font-mono text-xs text-ghost-700 hover:bg-ghost-50"
        >
          <ArrowLeft className="h-3 w-3 inline mr-2" />
          BACK TO INTAKE
        </button>
      </div>
    );
  }

  const canReview = ['submitted', 'under_review'].includes(submission.status);
  const canConvert = submission.status === 'approved' && !submission.contract_id;

  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Top Status Bar */}
      <div className="border-b border-ghost-300 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button
              onClick={() => router.push('/dashboard/contracts/intake')}
              className="flex items-center gap-2 text-ghost-700 hover:text-purple-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="font-mono text-xs">BACK</span>
            </button>
            <div className="flex items-center gap-2">
              <div className={cn(
                'h-2 w-2',
                submission.status === 'approved' ? 'bg-green-500' :
                submission.status === 'rejected' ? 'bg-red-500' :
                submission.status === 'converted' ? 'bg-purple-500' :
                'bg-amber-500 animate-pulse'
              )} />
              <span className="font-mono text-xs text-ghost-700">
                SUBMISSION: {submission.submission_number}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge className={cn('font-mono text-[10px] uppercase', statusColors[submission.status])}>
              {submissionStatusLabels[submission.status]}
            </Badge>
            <span className={cn('font-mono text-xs', priorityColors[submission.priority])}>
              {priorityLabels[submission.priority]}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-3 gap-6">
            {/* Left Panel - Submission Info */}
            <div className="space-y-4">
              {/* Requester Info */}
              <div className="border border-ghost-300 bg-white">
                <div className="border-b border-ghost-300 px-4 py-3">
                  <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                    REQUESTER
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-ghost-400" />
                    <div>
                      <p className="font-mono text-sm text-ghost-900">{submission.requester_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-ghost-400" />
                    <p className="font-mono text-xs text-ghost-700">{submission.requester_email}</p>
                  </div>
                  {submission.requester_department && (
                    <div className="flex items-center gap-3">
                      <Building className="h-4 w-4 text-ghost-400" />
                      <p className="font-mono text-xs text-ghost-700">{submission.requester_department}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-ghost-400" />
                    <p className="font-mono text-xs text-ghost-700">{formatDate(submission.created_at)}</p>
                  </div>
                </div>
              </div>

              {/* Form Info */}
              {submission.form && (
                <div className="border border-ghost-300 bg-white">
                  <div className="border-b border-ghost-300 px-4 py-3">
                    <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                      FORM
                    </h3>
                  </div>
                  <div className="p-4">
                    <p className="font-mono text-sm text-ghost-900">{submission.form.name}</p>
                    <p className="font-mono text-[10px] text-ghost-500 mt-1">
                      {formTypeLabels[submission.form.form_type]}
                    </p>
                  </div>
                </div>
              )}

              {/* Review Status */}
              {submission.reviewer && (
                <div className="border border-ghost-300 bg-white">
                  <div className="border-b border-ghost-300 px-4 py-3">
                    <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                      REVIEWED BY
                    </h3>
                  </div>
                  <div className="p-4">
                    <p className="font-mono text-sm text-ghost-900">{submission.reviewer.full_name}</p>
                    <p className="font-mono text-[10px] text-ghost-500 mt-1">
                      {submission.reviewed_at && formatDate(submission.reviewed_at)}
                    </p>
                    {submission.review_comments && (
                      <p className="font-mono text-xs text-ghost-700 mt-2 border-t border-ghost-200 pt-2">
                        {submission.review_comments}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Contract Link */}
              {submission.contract_id && (
                <div className="border border-purple-300 bg-purple-50">
                  <div className="border-b border-purple-300 px-4 py-3">
                    <h3 className="font-mono text-xs uppercase tracking-wider text-purple-700">
                      CONVERTED TO CONTRACT
                    </h3>
                  </div>
                  <div className="p-4">
                    <button
                      onClick={() => router.push(`/dashboard/contracts/${submission.contract_id}`)}
                      className="flex items-center gap-2 font-mono text-xs text-purple-900 hover:underline"
                    >
                      <FileText className="h-4 w-4" />
                      VIEW CONTRACT
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Review Actions */}
              {canReview && (
                <div className="border border-ghost-300 bg-white">
                  <div className="border-b border-ghost-300 px-4 py-3">
                    <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                      REVIEW ACTIONS
                    </h3>
                  </div>
                  <div className="p-4 space-y-3">
                    <Textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Add review comments (optional)"
                      rows={3}
                      className="font-mono text-xs bg-white border border-ghost-300"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleReview('approve')}
                        disabled={reviewSubmission.isPending}
                        className="border border-green-500 bg-green-500 text-white px-3 py-2 font-mono text-[10px] hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        <Check className="h-3 w-3" />
                        APPROVE
                      </button>
                      <button
                        onClick={() => handleReview('reject')}
                        disabled={reviewSubmission.isPending}
                        className="border border-red-500 bg-red-500 text-white px-3 py-2 font-mono text-[10px] hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        <X className="h-3 w-3" />
                        REJECT
                      </button>
                    </div>
                    <button
                      onClick={() => handleReview('request_changes')}
                      disabled={reviewSubmission.isPending}
                      className="w-full border border-amber-500 bg-amber-500 text-white px-3 py-2 font-mono text-[10px] hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      REQUEST CHANGES
                    </button>
                  </div>
                </div>
              )}

              {/* Convert to Contract */}
              {canConvert && (
                <button
                  onClick={() => setShowConvertDialog(true)}
                  className="w-full border border-purple-900 bg-purple-900 text-white px-4 py-3 font-mono text-xs hover:bg-purple-800 flex items-center justify-center gap-2"
                >
                  <ChevronRight className="h-4 w-4" />
                  CONVERT TO CONTRACT
                </button>
              )}
            </div>

            {/* Middle Panel - Form Data */}
            <div className="border border-ghost-300 bg-white">
              <div className="border-b border-ghost-300 px-4 py-3">
                <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                  SUBMITTED DATA
                </h3>
              </div>
              <div className="p-4 space-y-4">
                {submission.form?.fields && submission.form.fields.length > 0 ? (
                  [...submission.form.fields]
                    .sort((a, b) => a.display_order - b.display_order)
                    .map((field) => {
                      const value = submission.form_data[field.field_name];
                      return (
                        <div key={field.id} className="border-b border-ghost-100 pb-3 last:border-0">
                          <label className="font-mono text-[10px] text-ghost-600 uppercase block mb-1">
                            {field.field_label}
                          </label>
                          <p className="font-mono text-sm text-ghost-900">
                            {renderFieldValue(value, field.field_type)}
                          </p>
                        </div>
                      );
                    })
                ) : (
                  // Fallback to raw form data
                  Object.entries(submission.form_data).map(([key, value]) => (
                    <div key={key} className="border-b border-ghost-100 pb-3 last:border-0">
                      <label className="font-mono text-[10px] text-ghost-600 uppercase block mb-1">
                        {key.replace(/_/g, ' ')}
                      </label>
                      <p className="font-mono text-sm text-ghost-900">
                        {renderFieldValue(value, 'text')}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Panel - Comments */}
            <div className="border border-ghost-300 bg-white">
              <div className="border-b border-ghost-300 px-4 py-3">
                <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                  COMMENTS ({submission.comments?.length || 0})
                </h3>
              </div>

              {/* Comments List */}
              <div className="max-h-96 overflow-y-auto divide-y divide-ghost-100">
                {submission.comments && submission.comments.length > 0 ? (
                  submission.comments.map((comment) => (
                    <div key={comment.id} className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-semibold text-ghost-900">
                          {comment.user?.full_name || 'Unknown'}
                        </span>
                        <span className="font-mono text-[10px] text-ghost-500">
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                      <p className="font-mono text-xs text-ghost-700">{comment.comment_text}</p>
                      {comment.comment_type !== 'general' && (
                        <Badge variant="outline" className="font-mono text-[10px] mt-1">
                          {comment.comment_type}
                        </Badge>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center">
                    <MessageSquare className="h-8 w-8 text-ghost-300 mx-auto mb-2" />
                    <p className="font-mono text-[10px] text-ghost-500">No comments yet</p>
                  </div>
                )}
              </div>

              {/* Add Comment */}
              <div className="border-t border-ghost-300 p-3">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={2}
                  className="font-mono text-xs bg-white border border-ghost-300 mb-2"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || addComment.isPending}
                  className="w-full border border-purple-900 bg-purple-900 text-white px-3 py-2 font-mono text-[10px] hover:bg-purple-800 disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {addComment.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                  ADD COMMENT
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Convert to Contract Dialog */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono text-sm uppercase tracking-wider">
              Convert to Contract
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Create a new contract from this approved submission.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="font-mono text-xs text-ghost-700 uppercase block mb-2">
                Contract Title *
              </label>
              <Input
                variant="terminal"
                value={contractTitle}
                onChange={(e) => setContractTitle(e.target.value)}
                placeholder="Enter contract title"
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setShowConvertDialog(false)}
              className="border border-ghost-300 bg-white px-4 py-2 font-mono text-xs text-ghost-700 hover:bg-ghost-50"
            >
              CANCEL
            </button>
            <button
              onClick={handleConvert}
              disabled={!contractTitle.trim() || convertSubmission.isPending}
              className="border border-purple-900 bg-purple-900 text-white px-4 py-2 font-mono text-xs hover:bg-purple-800 disabled:opacity-50 flex items-center gap-2"
            >
              {convertSubmission.isPending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  CONVERTING...
                </>
              ) : (
                'CREATE CONTRACT'
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper function to render field values
function renderFieldValue(value: unknown, _fieldType: string): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (Array.isArray(value)) {
    return value.join(', ');
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}
