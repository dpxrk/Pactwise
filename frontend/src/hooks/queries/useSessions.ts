// ============================================================================
// COLLABORATIVE SESSION HOOKS
// React Query hooks for collaborative editing sessions
// ============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { queryKeys, mutationKeys } from "@/lib/react-query-config";
import type {
  CollaborativeSessionListItem,
  CollaborativeSessionDetail,
  CollaborativeSession,
  SessionStats,
  SessionFilters,
  CreateSessionPayload,
  InviteParticipantPayload,
} from "@/types/signature-management.types";
import { createClient } from "@/utils/supabase/client";

// Type assertion for tables not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = createClient() as any;

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch collaborative sessions list with optional filters
 */
export function useSessionList(enterpriseId: string, filters?: SessionFilters) {
  return useQuery({
    queryKey: queryKeys.sessionList({ enterpriseId, ...filters }),
    queryFn: async () => {
      let query = supabase
        .from("collaborative_sessions")
        .select(`
          id,
          status,
          active_users,
          external_participants,
          created_at,
          updated_at,
          document_versions!inner (
            id,
            version_number,
            file_name,
            contract_id,
            contracts!inner (
              id,
              title
            )
          )
        `)
        .eq("enterprise_id", enterpriseId)
        .order("updated_at", { ascending: false });

      // Apply filters
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      if (filters?.contract_id) {
        query = query.eq("document_versions.contract_id", filters.contract_id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform to list item format
      return (data || []).map(
        (item: {
          id: string;
          status: string;
          active_users: string[];
          external_participants: string[];
          created_at: string;
          updated_at: string;
          document_versions: {
            id: string;
            version_number: number;
            file_name: string;
            contract_id: string;
            contracts: {
              id: string;
              title: string;
            };
          };
        }) => ({
          id: item.id,
          document_title:
            item.document_versions?.file_name ||
            `Version ${item.document_versions?.version_number}`,
          contract_id: item.document_versions?.contracts?.id,
          contract_title: item.document_versions?.contracts?.title || "Unknown",
          status: item.status,
          participant_count:
            (item.active_users?.length || 0) +
            (item.external_participants?.length || 0),
          created_at: item.created_at,
          updated_at: item.updated_at,
          created_by: {
            id: "", // Would need to add created_by to the table
            name: "Unknown",
          },
        })
      ) as CollaborativeSessionListItem[];
    },
    enabled: !!enterpriseId,
    staleTime: 30 * 1000, // Sessions change frequently
  });
}

/**
 * Fetch active sessions only
 */
export function useActiveSessions(enterpriseId: string) {
  return useSessionList(enterpriseId, { status: "active" });
}

/**
 * Fetch single session with full details
 */
export function useSession(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.session(sessionId),
    queryFn: async () => {
      const { data: session, error: sessionError } = await supabase
        .from("collaborative_sessions")
        .select(`
          *,
          document_versions (
            id,
            version_number,
            file_name,
            contract_id,
            contracts (
              id,
              title,
              contract_number
            )
          ),
          cursors:editing_cursors (
            id,
            user_id,
            external_party_email,
            user_name,
            color,
            anchor,
            head,
            last_active
          )
        `)
        .eq("id", sessionId)
        .single();

      if (sessionError) throw sessionError;

      // Get user details for active_users
      const userDetails: Array<{
        id: string;
        user_id: string | null;
        email: string;
        name: string;
        color: string;
        is_external: boolean;
        joined_at: string;
        last_active: string;
        is_online: boolean;
      }> = [];

      if (session.active_users?.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, email, raw_user_meta_data")
          .in("id", session.active_users);

        if (users) {
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          userDetails.push(
            ...users.map(
              (
                user: {
                  id: string;
                  email: string;
                  raw_user_meta_data?: { full_name?: string };
                },
                index: number
              ) => {
                const cursor = session.cursors?.find(
                  (c: { user_id: string }) => c.user_id === user.id
                );
                return {
                  id: user.id,
                  user_id: user.id,
                  email: user.email,
                  name: user.raw_user_meta_data?.full_name || user.email,
                  color: cursor?.color || getColorForIndex(index),
                  is_external: false,
                  joined_at: session.created_at,
                  last_active: cursor?.last_active || session.updated_at,
                  is_online: cursor
                    ? new Date(cursor.last_active) > fiveMinutesAgo
                    : false,
                };
              }
            )
          );
        }
      }

      // Add external participants
      if (session.external_participants?.length > 0) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        session.external_participants.forEach(
          (email: string, index: number) => {
            const cursor = session.cursors?.find(
              (c: { external_party_email: string }) =>
                c.external_party_email === email
            );
            userDetails.push({
              id: `external-${email}`,
              user_id: null,
              email,
              name: cursor?.user_name || email.split("@")[0],
              color:
                cursor?.color ||
                getColorForIndex(session.active_users?.length + index),
              is_external: true,
              joined_at: session.created_at,
              last_active: cursor?.last_active || session.updated_at,
              is_online: cursor
                ? new Date(cursor.last_active) > fiveMinutesAgo
                : false,
            });
          }
        );
      }

      // Get recent operations/changes (simplified - real implementation would parse Yjs ops)
      const { data: _recentOps } = await supabase
        .from("document_operations")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(20);

      return {
        ...session,
        document: session.document_versions
          ? {
              id: session.document_versions.id,
              version_number: session.document_versions.version_number,
              file_name: session.document_versions.file_name,
            }
          : null,
        contract: session.document_versions?.contracts
          ? {
              id: session.document_versions.contracts.id,
              title: session.document_versions.contracts.title,
              contract_number: session.document_versions.contracts.contract_number,
            }
          : null,
        participants: userDetails,
        recent_changes: [], // Would need to parse Yjs operations
      } as CollaborativeSessionDetail;
    },
    enabled: !!sessionId,
    refetchInterval: 10000, // Refetch every 10 seconds to update presence
  });
}

/**
 * Fetch session statistics
 */
export function useSessionStats(enterpriseId: string) {
  return useQuery({
    queryKey: queryKeys.sessionStats(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collaborative_sessions")
        .select("id, status, active_users, external_participants, updated_at")
        .eq("enterprise_id", enterpriseId);

      if (error) throw error;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const sessions = data || [];

      const totalParticipants = sessions.reduce(
        (sum: number, s: { active_users?: string[]; external_participants?: string[] }) =>
          sum +
          (s.active_users?.length || 0) +
          (s.external_participants?.length || 0),
        0
      );

      const stats: SessionStats = {
        total: sessions.length,
        active: sessions.filter((s: { status: string }) => s.status === "active").length,
        ended_today: sessions.filter((s: { status: string; updated_at: string }) => {
          if (s.status !== "ended") return false;
          return new Date(s.updated_at) >= today;
        }).length,
        ended_this_week: sessions.filter((s: { status: string; updated_at: string }) => {
          if (s.status !== "ended") return false;
          return new Date(s.updated_at) >= weekAgo;
        }).length,
        average_participants:
          sessions.length > 0 ? totalParticipants / sessions.length : 0,
      };

      return stats;
    },
    enabled: !!enterpriseId,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new collaborative session
 */
export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.createSession,
    mutationFn: async (
      payload: CreateSessionPayload & { enterprise_id: string }
    ) => {
      const { data, error } = await supabase
        .from("collaborative_sessions")
        .insert({
          document_version_id: payload.document_version_id,
          enterprise_id: payload.enterprise_id,
          status: "active",
          active_users: payload.invited_users || [],
          external_participants: payload.invited_emails || [],
        })
        .select()
        .single();

      if (error) throw error;
      return data as CollaborativeSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions() });
      toast.success("Collaborative session created");
    },
    onError: (error) => {
      toast.error(`Failed to create session: ${error.message}`);
    },
  });
}

/**
 * Create a collaborative session from a contract
 * This handles creating a document version if needed
 */
export function useCreateSessionFromContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.createSession,
    mutationFn: async ({
      contract_id,
      enterprise_id,
      user_id,
    }: {
      contract_id: string;
      enterprise_id: string;
      user_id: string;
    }) => {
      // First, check if there's an existing active session for this contract
      const { data: existingSessions } = await supabase
        .from("collaborative_sessions")
        .select(`
          id,
          status,
          document_versions!inner (
            contract_id
          )
        `)
        .eq("enterprise_id", enterprise_id)
        .eq("status", "active")
        .eq("document_versions.contract_id", contract_id)
        .limit(1);

      if (existingSessions && existingSessions.length > 0) {
        // Return existing active session
        return { id: existingSessions[0].id, existing: true };
      }

      // Get the contract details to create a document version
      const { data: contract, error: contractError } = await supabase
        .from("contracts")
        .select("id, title, file_name, storage_id")
        .eq("id", contract_id)
        .single();

      if (contractError) throw contractError;

      // Check for existing document version or create new one
      let documentVersionId: string;

      const { data: existingVersions } = await supabase
        .from("document_versions")
        .select("id, version_number")
        .eq("contract_id", contract_id)
        .order("version_number", { ascending: false })
        .limit(1);

      if (existingVersions && existingVersions.length > 0) {
        // Use existing document version
        documentVersionId = existingVersions[0].id;
      } else {
        // Create new document version
        const { data: newVersion, error: versionError } = await supabase
          .from("document_versions")
          .insert({
            contract_id: contract_id,
            enterprise_id: enterprise_id,
            version_number: 1,
            file_name: contract.file_name || `${contract.title}.docx`,
            storage_id: contract.storage_id,
            created_by: user_id,
          })
          .select()
          .single();

        if (versionError) throw versionError;
        documentVersionId = newVersion.id;
      }

      // Create the collaborative session
      const { data: session, error: sessionError } = await supabase
        .from("collaborative_sessions")
        .insert({
          document_version_id: documentVersionId,
          enterprise_id: enterprise_id,
          status: "active",
          active_users: [user_id],
          external_participants: [],
        })
        .select()
        .single();

      if (sessionError) throw sessionError;
      return { id: session.id, existing: false };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions() });
      if (data.existing) {
        toast.info("Joined existing collaborative session");
      } else {
        toast.success("Collaborative session created");
      }
    },
    onError: (error) => {
      toast.error(`Failed to create session: ${error.message}`);
    },
  });
}

/**
 * Fetch sessions for a specific contract
 */
export function useContractSessions(enterpriseId: string, contractId: string) {
  return useSessionList(enterpriseId, { contract_id: contractId });
}

/**
 * End a collaborative session
 */
export function useEndSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.endSession,
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase
        .from("collaborative_sessions")
        .update({
          status: "ended",
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.session(data.id) });
      toast.success("Session ended");
    },
    onError: (error) => {
      toast.error(`Failed to end session: ${error.message}`);
    },
  });
}

/**
 * Invite a participant to a session
 */
export function useInviteParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.inviteParticipant,
    mutationFn: async (payload: InviteParticipantPayload) => {
      // Get current session
      const { data: session, error: fetchError } = await supabase
        .from("collaborative_sessions")
        .select("active_users, external_participants")
        .eq("id", payload.session_id)
        .single();

      if (fetchError) throw fetchError;

      const updates: {
        active_users?: string[];
        external_participants?: string[];
        updated_at: string;
      } = {
        updated_at: new Date().toISOString(),
      };

      if (payload.user_id) {
        // Internal user
        const currentUsers = session.active_users || [];
        if (!currentUsers.includes(payload.user_id)) {
          updates.active_users = [...currentUsers, payload.user_id];
        }
      } else if (payload.email) {
        // External participant
        const currentExternal = session.external_participants || [];
        if (!currentExternal.includes(payload.email)) {
          updates.external_participants = [...currentExternal, payload.email];
        }
      }

      const { data, error } = await supabase
        .from("collaborative_sessions")
        .update(updates)
        .eq("id", payload.session_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.session(data.id) });
      toast.success("Participant invited");
    },
    onError: (error) => {
      toast.error(`Failed to invite participant: ${error.message}`);
    },
  });
}

/**
 * Remove a participant from a session
 */
export function useRemoveParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.removeParticipant,
    mutationFn: async ({
      sessionId,
      userId,
      email,
    }: {
      sessionId: string;
      userId?: string;
      email?: string;
    }) => {
      // Get current session
      const { data: session, error: fetchError } = await supabase
        .from("collaborative_sessions")
        .select("active_users, external_participants")
        .eq("id", sessionId)
        .single();

      if (fetchError) throw fetchError;

      const updates: {
        active_users?: string[];
        external_participants?: string[];
        updated_at: string;
      } = {
        updated_at: new Date().toISOString(),
      };

      if (userId) {
        updates.active_users = (session.active_users || []).filter(
          (id: string) => id !== userId
        );
      } else if (email) {
        updates.external_participants = (
          session.external_participants || []
        ).filter((e: string) => e !== email);
      }

      const { data, error } = await supabase
        .from("collaborative_sessions")
        .update(updates)
        .eq("id", sessionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.session(data.id) });
      toast.success("Participant removed");
    },
    onError: (error) => {
      toast.error(`Failed to remove participant: ${error.message}`);
    },
  });
}

/**
 * Generate portal link for external participant
 */
export function useGenerateSessionPortalLink() {
  return useMutation({
    mutationFn: async ({
      sessionId,
      email,
      name,
      enterpriseId,
    }: {
      sessionId: string;
      email: string;
      name: string;
      enterpriseId: string;
    }) => {
      // Generate a random token
      const token = crypto.randomUUID();
      const tokenHash = await hashToken(token);

      // Create access token
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1); // 1 day expiry for sessions

      const { error } = await supabase
        .from("external_access_tokens")
        .insert({
          enterprise_id: enterpriseId,
          token_hash: tokenHash,
          token_type: "redline",
          redline_session_id: sessionId,
          party_email: email,
          party_name: name,
          expires_at: expiresAt.toISOString(),
        });

      if (error) throw error;

      return {
        url: `/portal/${token}`,
        token,
        expiresAt: expiresAt.toISOString(),
      };
    },
    onSuccess: () => {
      toast.success("Portal link generated");
    },
    onError: (error) => {
      toast.error(`Failed to generate link: ${error.message}`);
    },
  });
}

// ============================================================================
// HELPERS
// ============================================================================

function getColorForIndex(index: number): string {
  const colors = [
    "#ef4444",
    "#f97316",
    "#f59e0b",
    "#84cc16",
    "#22c55e",
    "#14b8a6",
    "#06b6d4",
    "#3b82f6",
    "#6366f1",
    "#8b5cf6",
    "#a855f7",
    "#d946ef",
    "#ec4899",
    "#f43f5e",
  ];
  return colors[index % colors.length];
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
