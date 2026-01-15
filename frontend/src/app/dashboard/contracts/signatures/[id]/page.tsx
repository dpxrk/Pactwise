'use client';

import {
  ArrowLeft,
  FileSignature,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  Eye,
  UserPlus,
  Link2,
  RefreshCw,
  Mail,
  User,
  Calendar,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { use, useState, useEffect } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import {
  useSignatureRequest,
  useCancelSignatureRequest,
  useResendSignatureRequest,
  useSendSignatureRequest,
  useAddSignatory,
  useRemoveSignatory,
  useGeneratePortalLink,
} from '@/hooks/queries/useSignatures';
import { cn } from '@/lib/utils';
import type { SignatoryStatus, SignatureRequestStatus } from '@/types/signature-management.types';
import { createClient } from '@/utils/supabase/client';

// ============================================================================
// STATUS CONFIG
// ============================================================================

const requestStatusConfig: Record<
  SignatureRequestStatus,
  { label: string; color: string; bgColor: string }
> = {
  draft: { label: 'Draft', color: 'text-ghost-600', bgColor: 'bg-ghost-100' },
  pending: { label: 'Pending', color: 'text-amber-700', bgColor: 'bg-amber-50' },
  in_progress: { label: 'In Progress', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  completed: { label: 'Completed', color: 'text-green-700', bgColor: 'bg-green-50' },
  expired: { label: 'Expired', color: 'text-ghost-600', bgColor: 'bg-ghost-100' },
  declined: { label: 'Declined', color: 'text-red-700', bgColor: 'bg-red-50' },
  cancelled: { label: 'Cancelled', color: 'text-ghost-500', bgColor: 'bg-ghost-50' },
};

const signatoryStatusConfig: Record<
  SignatoryStatus,
  { label: string; color: string; icon: LucideIcon }
> = {
  pending: { label: 'Pending', color: 'text-ghost-500', icon: Clock },
  sent: { label: 'Sent', color: 'text-amber-600', icon: Send },
  viewed: { label: 'Viewed', color: 'text-blue-600', icon: Eye },
  signed: { label: 'Signed', color: 'text-green-600', icon: CheckCircle2 },
  declined: { label: 'Declined', color: 'text-red-600', icon: XCircle },
};

// ============================================================================
// SIGNATURE DETAIL PAGE
// ============================================================================

export default function SignatureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { userProfile } = useAuth();
  const enterpriseId = userProfile?.enterprise_id;
  const [showAddSignatory, setShowAddSignatory] = useState(false);
  const [newSignatory, setNewSignatory] = useState({
    email: '',
    name: '',
    company: '',
    role: 'signatory',
  });

  // Fetch data
  const { data: request, isLoading, refetch } = useSignatureRequest(id);

  // Mutations
  const cancelMutation = useCancelSignatureRequest();
  const resendMutation = useResendSignatureRequest();
  const sendMutation = useSendSignatureRequest();
  const addSignatoryMutation = useAddSignatory();
  const removeSignatoryMutation = useRemoveSignatory();
  const generateLinkMutation = useGeneratePortalLink();

  // Real-time subscriptions for signature updates
  useEffect(() => {
    if (!id) return;

    const supabase = createClient();

    // Subscribe to signatory changes
    const signatoryChannel = supabase
      .channel(`signatories:${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'signatories',
          filter: `signature_request_id=eq.${id}`,
        },
        (_payload) => {
          // Refetch data when signatories change
          refetch();
        }
      )
      .subscribe();

    // Subscribe to signature request status changes
    const requestChannel = supabase
      .channel(`signature_request:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'signature_requests',
          filter: `id=eq.${id}`,
        },
        (_payload) => {
          // Refetch data when request status changes
          refetch();
        }
      )
      .subscribe();

    // Subscribe to signature events
    const eventsChannel = supabase
      .channel(`signature_events:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signature_events',
          filter: `signature_request_id=eq.${id}`,
        },
        (_payload) => {
          // Refetch data when new events are added
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(signatoryChannel);
      supabase.removeChannel(requestChannel);
      supabase.removeChannel(eventsChannel);
    };
  }, [id, refetch]);

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Handle add signatory
  const handleAddSignatory = () => {
    if (!newSignatory.email || !newSignatory.name) {
      toast.error('Email and name are required');
      return;
    }

    addSignatoryMutation.mutate(
      {
        signature_request_id: id,
        email: newSignatory.email,
        name: newSignatory.name,
        company: newSignatory.company || undefined,
        role: newSignatory.role,
      },
      {
        onSuccess: () => {
          setShowAddSignatory(false);
          setNewSignatory({ email: '', name: '', company: '', role: 'signatory' });
        },
      }
    );
  };

  // Handle generate portal link
  const handleGenerateLink = async (signatoryId: string) => {
    if (!enterpriseId) return;

    try {
      const result = await generateLinkMutation.mutateAsync({
        signatureRequestId: id,
        signatoryId,
        enterpriseId,
      });

      // Copy to clipboard
      await navigator.clipboard.writeText(window.location.origin + result.url);
      toast.success('Portal link copied to clipboard');
    } catch (_error) {
      // Error handled by mutation
    }
  };

  if (!enterpriseId) {
    return (
      <div className="min-h-screen bg-ghost-100 flex items-center justify-center">
        <p className="font-mono text-sm text-ghost-600">No enterprise selected</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-ghost-100 p-6">
        <Skeleton className="h-12 w-48 mb-6" />
        <Skeleton className="h-64 mb-6" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-ghost-100 flex items-center justify-center">
        <div className="text-center">
          <FileSignature className="h-12 w-12 text-ghost-300 mx-auto mb-4" />
          <p className="font-mono text-sm text-ghost-600">
            Signature request not found
          </p>
          <button
            onClick={() => router.push('/dashboard/contracts/signatures')}
            className="mt-4 font-mono text-xs text-purple-900 hover:underline"
          >
            Back to Signatures
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = requestStatusConfig[request.status];

  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Top Status Bar */}
      <div className="border-b border-ghost-300 bg-white px-6 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard/contracts/signatures')}
              className="p-1 hover:bg-ghost-100"
            >
              <ArrowLeft className="h-4 w-4 text-ghost-600" />
            </button>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-purple-500 animate-pulse" />
              <span className="font-mono text-xs text-ghost-700 uppercase">
                SIGNATURE REQUEST
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {request.status === 'draft' && (
              <button
                onClick={() => sendMutation.mutate(id)}
                disabled={sendMutation.isPending}
                className="border border-purple-900 bg-purple-900 text-white px-4 py-2 font-mono text-xs hover:bg-purple-800 flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="h-3 w-3" />
                SEND REQUEST
              </button>
            )}
            {(request.status === 'pending' || request.status === 'in_progress') && (
              <>
                <button
                  onClick={() => resendMutation.mutate(id)}
                  disabled={resendMutation.isPending}
                  className="border border-ghost-300 bg-white text-ghost-700 px-4 py-2 font-mono text-xs hover:border-purple-900 flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className="h-3 w-3" />
                  RESEND
                </button>
                <button
                  onClick={() => cancelMutation.mutate(id)}
                  disabled={cancelMutation.isPending}
                  className="border border-red-300 bg-white text-red-600 px-4 py-2 font-mono text-xs hover:border-red-600 flex items-center gap-2 disabled:opacity-50"
                >
                  <XCircle className="h-3 w-3" />
                  CANCEL
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Header Card */}
        <div className="border border-ghost-300 bg-white p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-purple-900 mb-2">
                {request.title}
              </h1>
              <Badge className={cn('font-mono text-xs', statusConfig.bgColor, statusConfig.color)}>
                {statusConfig.label}
              </Badge>
            </div>
            <div className="text-right">
              <div className="font-mono text-xs text-ghost-500 mb-1">
                Contract
              </div>
              <button
                onClick={() =>
                  router.push(`/dashboard/contracts/${request.contract.id}`)
                }
                className="font-mono text-sm text-purple-900 hover:underline"
              >
                {request.contract.title}
              </button>
              <div className="font-mono text-xs text-ghost-400">
                #{request.contract.contract_number}
              </div>
            </div>
          </div>

          {/* Meta Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-ghost-200">
            <div>
              <div className="font-mono text-xs text-ghost-500 mb-1">Created</div>
              <div className="font-mono text-sm text-ghost-700">
                {formatDate(request.created_at)}
              </div>
            </div>
            <div>
              <div className="font-mono text-xs text-ghost-500 mb-1">Expires</div>
              <div className="font-mono text-sm text-ghost-700">
                {formatDate(request.expires_at)}
              </div>
            </div>
            <div>
              <div className="font-mono text-xs text-ghost-500 mb-1">Signing Order</div>
              <div className="font-mono text-sm text-ghost-700 capitalize">
                {request.signing_order}
              </div>
            </div>
            <div>
              <div className="font-mono text-xs text-ghost-500 mb-1">Progress</div>
              <div className="font-mono text-sm text-ghost-700">
                {request.signatories.filter((s) => s.status === 'signed').length}/
                {request.signatories.length} signed
              </div>
            </div>
          </div>

          {/* Message */}
          {request.message && (
            <div className="mt-4 pt-4 border-t border-ghost-200">
              <div className="font-mono text-xs text-ghost-500 mb-2">Message to Signatories</div>
              <div className="font-mono text-sm text-ghost-700 bg-ghost-50 p-3 border border-ghost-200">
                {request.message}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Signatories */}
          <div className="lg:col-span-2">
            <div className="border border-ghost-300 bg-white">
              <div className="flex items-center justify-between px-4 py-3 border-b border-ghost-300 bg-ghost-50">
                <h2 className="font-mono text-sm font-semibold text-purple-900 uppercase">
                  Signatories
                </h2>
                {request.status !== 'completed' && request.status !== 'cancelled' && (
                  <Dialog open={showAddSignatory} onOpenChange={setShowAddSignatory}>
                    <DialogTrigger asChild>
                      <button className="font-mono text-xs text-purple-900 hover:underline flex items-center gap-1">
                        <UserPlus className="h-3 w-3" />
                        Add Signatory
                      </button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="font-mono">Add Signatory</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div>
                          <label className="font-mono text-xs text-ghost-600 block mb-1">
                            Email *
                          </label>
                          <input
                            type="email"
                            value={newSignatory.email}
                            onChange={(e) =>
                              setNewSignatory({ ...newSignatory, email: e.target.value })
                            }
                            className="w-full border border-ghost-300 px-3 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="font-mono text-xs text-ghost-600 block mb-1">
                            Name *
                          </label>
                          <input
                            type="text"
                            value={newSignatory.name}
                            onChange={(e) =>
                              setNewSignatory({ ...newSignatory, name: e.target.value })
                            }
                            className="w-full border border-ghost-300 px-3 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="font-mono text-xs text-ghost-600 block mb-1">
                            Company
                          </label>
                          <input
                            type="text"
                            value={newSignatory.company}
                            onChange={(e) =>
                              setNewSignatory({ ...newSignatory, company: e.target.value })
                            }
                            className="w-full border border-ghost-300 px-3 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="font-mono text-xs text-ghost-600 block mb-1">
                            Role
                          </label>
                          <select
                            value={newSignatory.role}
                            onChange={(e) =>
                              setNewSignatory({ ...newSignatory, role: e.target.value })
                            }
                            className="w-full border border-ghost-300 px-3 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none"
                          >
                            <option value="signatory">Signatory</option>
                            <option value="witness">Witness</option>
                            <option value="approver">Approver</option>
                          </select>
                        </div>
                        <button
                          onClick={handleAddSignatory}
                          disabled={addSignatoryMutation.isPending}
                          className="w-full border border-purple-900 bg-purple-900 text-white px-4 py-2 font-mono text-xs hover:bg-purple-800 disabled:opacity-50"
                        >
                          {addSignatoryMutation.isPending ? 'Adding...' : 'Add Signatory'}
                        </button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              <div className="divide-y divide-ghost-200">
                {request.signatories.map((signatory, index) => {
                  const config = signatoryStatusConfig[signatory.status];
                  const StatusIcon = config.icon;

                  return (
                    <div key={signatory.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-medium text-ghost-900">
                                {signatory.name}
                              </span>
                              {request.signing_order === 'sequential' && (
                                <span className="font-mono text-xs text-ghost-400">
                                  #{index + 1}
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-xs text-ghost-500">
                              {signatory.email}
                            </div>
                            {signatory.company && (
                              <div className="font-mono text-xs text-ghost-400">
                                {signatory.company}
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge
                                className={cn(
                                  'font-mono text-xs flex items-center gap-1',
                                  config.color
                                )}
                                variant="outline"
                              >
                                <StatusIcon className="h-3 w-3" />
                                {config.label}
                              </Badge>
                              <span className="font-mono text-xs text-ghost-400 capitalize">
                                {signatory.role}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {signatory.status !== 'signed' &&
                            signatory.status !== 'declined' &&
                            request.status !== 'cancelled' && (
                              <button
                                onClick={() => handleGenerateLink(signatory.id)}
                                disabled={generateLinkMutation.isPending}
                                className="p-2 hover:bg-ghost-100 rounded"
                                title="Copy portal link"
                              >
                                <Link2 className="h-4 w-4 text-ghost-500" />
                              </button>
                            )}
                          {signatory.status === 'pending' &&
                            request.status !== 'cancelled' && (
                              <button
                                onClick={() =>
                                  removeSignatoryMutation.mutate({
                                    signatoryId: signatory.id,
                                    requestId: id,
                                  })
                                }
                                className="p-2 hover:bg-red-50 rounded"
                                title="Remove signatory"
                              >
                                <XCircle className="h-4 w-4 text-ghost-400 hover:text-red-500" />
                              </button>
                            )}
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className="ml-11 mt-3 space-y-1 text-xs font-mono text-ghost-500">
                        {signatory.sent_at && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            <span>Sent {formatDate(signatory.sent_at)}</span>
                          </div>
                        )}
                        {signatory.viewed_at && (
                          <div className="flex items-center gap-2">
                            <Eye className="h-3 w-3" />
                            <span>Viewed {formatDate(signatory.viewed_at)}</span>
                          </div>
                        )}
                        {signatory.signed_at && (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Signed {formatDate(signatory.signed_at)}</span>
                          </div>
                        )}
                        {signatory.declined_at && (
                          <div className="flex items-center gap-2 text-red-600">
                            <XCircle className="h-3 w-3" />
                            <span>
                              Declined {formatDate(signatory.declined_at)}
                              {signatory.decline_reason && `: ${signatory.decline_reason}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {request.signatories.length === 0 && (
                  <div className="p-8 text-center">
                    <User className="h-8 w-8 text-ghost-300 mx-auto mb-2" />
                    <p className="font-mono text-sm text-ghost-500">
                      No signatories added yet
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Activity Log */}
          <div className="lg:col-span-1">
            <div className="border border-ghost-300 bg-white">
              <div className="px-4 py-3 border-b border-ghost-300 bg-ghost-50">
                <h2 className="font-mono text-sm font-semibold text-purple-900 uppercase">
                  Activity Log
                </h2>
              </div>

              <div className="max-h-[600px] overflow-y-auto">
                {request.events.length > 0 ? (
                  <div className="divide-y divide-ghost-200">
                    {request.events.map((event) => (
                      <div key={event.id} className="p-3">
                        <div className="font-mono text-xs text-ghost-900 mb-1">
                          {formatEventType(event.event_type)}
                        </div>
                        <div className="font-mono text-xs text-ghost-500">
                          {formatDate(event.created_at)}
                        </div>
                        {event.ip_address && (
                          <div className="font-mono text-xs text-ghost-400 mt-1">
                            IP: {event.ip_address}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <Calendar className="h-8 w-8 text-ghost-300 mx-auto mb-2" />
                    <p className="font-mono text-sm text-ghost-500">
                      No activity yet
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function formatEventType(eventType: string): string {
  const eventLabels: Record<string, string> = {
    created: 'Request created',
    sent: 'Request sent',
    viewed: 'Document viewed',
    signed: 'Document signed',
    declined: 'Signature declined',
    cancelled: 'Request cancelled',
    expired: 'Request expired',
    reminder_sent: 'Reminder sent',
    signatory_added: 'Signatory added',
    signatory_removed: 'Signatory removed',
  };
  return eventLabels[eventType] || eventType;
}
