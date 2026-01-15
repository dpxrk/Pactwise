'use client';

import {
  ArrowLeft,
  Users,
  StopCircle,
  UserPlus,
  Link2,
  FileText,
  Clock,
  User,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { use, useState, useEffect } from 'react';
import { toast } from 'sonner';

import { CollaborativeEditor } from '@/components/collaborative-editor';
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
  useSession,
  useEndSession,
  useInviteParticipant,
  useGenerateSessionPortalLink,
} from '@/hooks/queries/useSessions';
import { cn } from '@/lib/utils';
import { createClient } from '@/utils/supabase/client';

// ============================================================================
// SESSION DETAIL PAGE
// ============================================================================

export default function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const enterpriseId = userProfile?.enterprise_id;
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');

  // Fetch data
  const { data: session, isLoading, refetch } = useSession(id);

  // Mutations
  const endSessionMutation = useEndSession();
  const inviteParticipantMutation = useInviteParticipant();
  const generateLinkMutation = useGenerateSessionPortalLink();

  // Real-time subscriptions for session updates
  useEffect(() => {
    if (!id) return;

    const supabase = createClient();

    // Subscribe to session changes
    const sessionChannel = supabase
      .channel(`collaborative_session:${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collaborative_sessions',
          filter: `id=eq.${id}`,
        },
        (_payload) => {
          // Refetch data when session changes
          refetch();
        }
      )
      .subscribe();

    // Subscribe to cursor/presence changes
    const cursorChannel = supabase
      .channel(`editing_cursors:${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'editing_cursors',
          filter: `session_id=eq.${id}`,
        },
        (_payload) => {
          // Refetch data when cursors change
          refetch();
        }
      )
      .subscribe();

    // Subscribe to document operations
    const opsChannel = supabase
      .channel(`document_operations:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'document_operations',
          filter: `session_id=eq.${id}`,
        },
        (_payload) => {
          // New operations - could trigger UI updates
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(cursorChannel);
      supabase.removeChannel(opsChannel);
    };
  }, [id, refetch]);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Handle invite
  const handleInvite = () => {
    if (!inviteEmail || !inviteName) {
      toast.error('Email and name are required');
      return;
    }

    inviteParticipantMutation.mutate(
      {
        session_id: id,
        email: inviteEmail,
        name: inviteName,
      },
      {
        onSuccess: () => {
          setShowInviteDialog(false);
          setInviteEmail('');
          setInviteName('');
        },
      }
    );
  };

  // Handle generate portal link
  const handleGenerateLink = async () => {
    if (!enterpriseId || !inviteEmail || !inviteName) {
      toast.error('Please fill in email and name first');
      return;
    }

    try {
      const result = await generateLinkMutation.mutateAsync({
        sessionId: id,
        email: inviteEmail,
        name: inviteName,
        enterpriseId,
      });

      // Copy to clipboard
      await navigator.clipboard.writeText(window.location.origin + result.url);
      toast.success('Portal link copied to clipboard');
      setShowInviteDialog(false);
      setInviteEmail('');
      setInviteName('');
    } catch (_error) {
      // Error handled by mutation
    }
  };

  if (!enterpriseId || !user) {
    return (
      <div className="min-h-screen bg-ghost-100 flex items-center justify-center">
        <p className="font-mono text-sm text-ghost-600">Not authenticated</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-ghost-100 p-6">
        <Skeleton className="h-12 w-48 mb-6" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-ghost-100 flex items-center justify-center">
        <div className="text-center">
          <Users className="h-12 w-12 text-ghost-300 mx-auto mb-4" />
          <p className="font-mono text-sm text-ghost-600">Session not found</p>
          <button
            onClick={() => router.push('/dashboard/contracts/sessions')}
            className="mt-4 font-mono text-xs text-purple-900 hover:underline"
          >
            Back to Sessions
          </button>
        </div>
      </div>
    );
  }

  const isActive = session.status === 'active';

  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Top Status Bar */}
      <div className="border-b border-ghost-300 bg-white px-6 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard/contracts/sessions')}
              className="p-1 hover:bg-ghost-100"
            >
              <ArrowLeft className="h-4 w-4 text-ghost-600" />
            </button>
            <div className="flex items-center gap-2">
              {isActive ? (
                <div className="h-2 w-2 bg-green-500 animate-pulse" />
              ) : (
                <div className="h-2 w-2 bg-ghost-400" />
              )}
              <span className="font-mono text-xs text-ghost-700 uppercase">
                COLLABORATIVE SESSION
              </span>
            </div>
            <Badge
              className={cn(
                'font-mono text-xs',
                isActive ? 'bg-green-50 text-green-700' : 'bg-ghost-100 text-ghost-600'
              )}
            >
              {isActive ? 'Active' : 'Ended'}
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            {isActive && (
              <>
                <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                  <DialogTrigger asChild>
                    <button className="border border-ghost-300 bg-white text-ghost-700 px-4 py-2 font-mono text-xs hover:border-purple-900 flex items-center gap-2">
                      <UserPlus className="h-3 w-3" />
                      INVITE
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="font-mono">Invite Participant</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <label className="font-mono text-xs text-ghost-600 block mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="email@example.com"
                          className="w-full border border-ghost-300 px-3 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-mono text-xs text-ghost-600 block mb-1">
                          Name
                        </label>
                        <input
                          type="text"
                          value={inviteName}
                          onChange={(e) => setInviteName(e.target.value)}
                          placeholder="John Doe"
                          className="w-full border border-ghost-300 px-3 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleInvite}
                          disabled={inviteParticipantMutation.isPending}
                          className="flex-1 border border-purple-900 bg-purple-900 text-white px-4 py-2 font-mono text-xs hover:bg-purple-800 disabled:opacity-50"
                        >
                          Add to Session
                        </button>
                        <button
                          onClick={handleGenerateLink}
                          disabled={generateLinkMutation.isPending}
                          className="border border-ghost-300 bg-white text-ghost-700 px-4 py-2 font-mono text-xs hover:border-purple-900 flex items-center gap-2 disabled:opacity-50"
                        >
                          <Link2 className="h-3 w-3" />
                          Copy Link
                        </button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <button
                  onClick={() => endSessionMutation.mutate(id)}
                  disabled={endSessionMutation.isPending}
                  className="border border-red-300 bg-white text-red-600 px-4 py-2 font-mono text-xs hover:border-red-600 flex items-center gap-2 disabled:opacity-50"
                >
                  <StopCircle className="h-3 w-3" />
                  END SESSION
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Editor Area */}
          <div className="lg:col-span-3">
            {/* Session Info Header */}
            <div className="border border-ghost-300 bg-white p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-mono text-lg font-bold text-purple-900">
                    {session.document?.file_name || 'Collaborative Document'}
                  </h1>
                  {session.contract && (
                    <button
                      onClick={() =>
                        router.push(`/dashboard/contracts/${session.contract?.id}`)
                      }
                      className="font-mono text-xs text-ghost-500 hover:text-purple-900 hover:underline flex items-center gap-1"
                    >
                      <FileText className="h-3 w-3" />
                      {session.contract.title} ({session.contract.contract_number})
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs text-ghost-500">
                    Started {formatDate(session.created_at)}
                  </div>
                  <div className="font-mono text-xs text-ghost-400">
                    Last updated {formatDate(session.updated_at)}
                  </div>
                </div>
              </div>
            </div>

            {/* Collaborative Editor */}
            {isActive ? (
              <CollaborativeEditor
                sessionId={id}
                userId={user.id}
                userName={user.email || 'Anonymous'}
                enterpriseId={enterpriseId}
                showPresenceList={false}
                showChangeTracker={true}
                onSave={async (_content) => {
                  // Save would be handled by the editor's auto-save
                  toast.success('Document saved');
                }}
              />
            ) : (
              <div className="border border-ghost-300 bg-white p-12 text-center">
                <StopCircle className="h-12 w-12 text-ghost-300 mx-auto mb-4" />
                <p className="font-mono text-sm text-ghost-600 mb-2">
                  This session has ended
                </p>
                <p className="font-mono text-xs text-ghost-400">
                  The document was last edited on {formatDate(session.updated_at)}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Participants */}
            <div className="border border-ghost-300 bg-white">
              <div className="px-4 py-3 border-b border-ghost-300 bg-ghost-50">
                <h2 className="font-mono text-sm font-semibold text-purple-900 uppercase flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Participants ({session.participants?.length || 0})
                </h2>
              </div>

              <div className="max-h-[300px] overflow-y-auto">
                {session.participants && session.participants.length > 0 ? (
                  <div className="divide-y divide-ghost-200">
                    {session.participants.map((participant) => (
                      <div
                        key={participant.id}
                        className="px-4 py-3 flex items-center gap-3"
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                          style={{ backgroundColor: participant.color }}
                        >
                          {participant.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-sm text-ghost-900 truncate">
                            {participant.name}
                            {participant.user_id === user.id && (
                              <span className="text-ghost-400 ml-1">(You)</span>
                            )}
                          </div>
                          <div className="font-mono text-xs text-ghost-500 truncate">
                            {participant.email}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {participant.is_online ? (
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                          ) : (
                            <div className="w-2 h-2 bg-ghost-300 rounded-full" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center">
                    <User className="h-6 w-6 text-ghost-300 mx-auto mb-2" />
                    <p className="font-mono text-xs text-ghost-500">
                      No participants yet
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Session Info */}
            <div className="border border-ghost-300 bg-white">
              <div className="px-4 py-3 border-b border-ghost-300 bg-ghost-50">
                <h2 className="font-mono text-sm font-semibold text-purple-900 uppercase flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Session Info
                </h2>
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <div className="font-mono text-xs text-ghost-500 mb-1">
                    Session ID
                  </div>
                  <div className="font-mono text-xs text-ghost-700 bg-ghost-50 px-2 py-1 rounded flex items-center gap-2">
                    <span className="truncate">{session.id}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(session.id);
                        toast.success('Session ID copied');
                      }}
                      className="flex-shrink-0 p-1 hover:bg-ghost-200 rounded"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="font-mono text-xs text-ghost-500 mb-1">
                    Status
                  </div>
                  <div
                    className={cn(
                      'font-mono text-xs px-2 py-1 rounded inline-block',
                      isActive ? 'bg-green-50 text-green-700' : 'bg-ghost-100 text-ghost-600'
                    )}
                  >
                    {isActive ? 'Active' : 'Ended'}
                  </div>
                </div>

                <div>
                  <div className="font-mono text-xs text-ghost-500 mb-1">
                    Document Version
                  </div>
                  <div className="font-mono text-xs text-ghost-700">
                    Version {session.document?.version_number || 1}
                  </div>
                </div>

                <div>
                  <div className="font-mono text-xs text-ghost-500 mb-1">
                    Created
                  </div>
                  <div className="font-mono text-xs text-ghost-700">
                    {formatDate(session.created_at)}
                  </div>
                </div>

                {session.status === 'ended' && (
                  <div>
                    <div className="font-mono text-xs text-ghost-500 mb-1">
                      Ended
                    </div>
                    <div className="font-mono text-xs text-ghost-700">
                      {formatDate(session.updated_at)}
                    </div>
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
