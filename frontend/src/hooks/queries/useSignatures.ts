// ============================================================================
// SIGNATURE REQUEST HOOKS
// React Query hooks for signature request management
// ============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { queryKeys, mutationKeys } from "@/lib/react-query-config";
import type {
  SignatureRequestListItem,
  SignatureRequestDetail,
  SignatureRequest,
  SignatureStats,
  SignatureRequestFilters,
  CreateSignatureRequestPayload,
  AddSignatoryPayload,
} from "@/types/signature-management.types";
import { createClient } from "@/utils/supabase/client";

// Type assertion for tables not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = createClient() as any;

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch signature requests list with optional filters
 */
export function useSignatureRequestList(
  enterpriseId: string,
  filters?: SignatureRequestFilters
) {
  return useQuery({
    queryKey: queryKeys.signatureList({ enterpriseId, ...filters }),
    queryFn: async () => {
      let query = supabase
        .from("signature_requests")
        .select(`
          id,
          title,
          contract_id,
          status,
          signing_order,
          expires_at,
          created_at,
          created_by,
          contracts!inner (
            id,
            title
          ),
          signatories:signature_request_signatories (
            id,
            status
          ),
          users:created_by (
            id,
            raw_user_meta_data
          )
        `)
        .eq("enterprise_id", enterpriseId)
        .order("created_at", { ascending: false });

      // Apply filters
      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in("status", filters.status);
        } else {
          query = query.eq("status", filters.status);
        }
      }

      if (filters?.search) {
        query = query.ilike("title", `%${filters.search}%`);
      }

      if (filters?.contract_id) {
        query = query.eq("contract_id", filters.contract_id);
      }

      if (filters?.expires_before) {
        query = query.lte("expires_at", filters.expires_before);
      }

      if (filters?.expires_after) {
        query = query.gte("expires_at", filters.expires_after);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform to list item format
      return (data || []).map((item: Record<string, unknown>) => ({
        id: item.id,
        title: item.title,
        contract_id: item.contract_id,
        contract_title: (item.contracts as Record<string, unknown>)?.title || "Unknown",
        status: item.status,
        signatories_count: (item.signatories as unknown[])?.length || 0,
        signed_count: (item.signatories as Array<{ status: string }>)?.filter(
          (s) => s.status === "signed"
        ).length || 0,
        created_at: item.created_at,
        expires_at: item.expires_at,
        created_by: {
          id: item.created_by,
          name: ((item.users as Record<string, unknown>)?.raw_user_meta_data as Record<string, unknown>)?.full_name || "Unknown",
        },
      })) as SignatureRequestListItem[];
    },
    enabled: !!enterpriseId,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch single signature request with full details
 */
export function useSignatureRequest(requestId: string) {
  return useQuery({
    queryKey: queryKeys.signature(requestId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("signature_requests")
        .select(`
          *,
          contracts (
            id,
            title,
            contract_number
          ),
          signatories:signature_request_signatories (
            *,
            portal_token:external_access_tokens (
              id,
              token_type,
              status
            )
          ),
          events:signature_events (
            id,
            signatory_id,
            event_type,
            event_data,
            ip_address,
            user_agent,
            created_at
          )
        `)
        .eq("id", requestId)
        .single();

      if (error) throw error;

      return {
        ...data,
        contract: data.contracts,
        signatories: data.signatories || [],
        events: (data.events || []).sort(
          (a: { created_at: string }, b: { created_at: string }) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
      } as SignatureRequestDetail;
    },
    enabled: !!requestId,
  });
}

/**
 * Fetch signature statistics for the enterprise
 */
export function useSignatureStats(enterpriseId: string) {
  return useQuery({
    queryKey: queryKeys.signatureStats(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("signature_requests")
        .select("id, status, expires_at")
        .eq("enterprise_id", enterpriseId);

      if (error) throw error;

      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const stats: SignatureStats = {
        total: data?.length || 0,
        draft: data?.filter((r: { status: string }) => r.status === "draft").length || 0,
        pending: data?.filter((r: { status: string }) => r.status === "pending").length || 0,
        in_progress: data?.filter((r: { status: string }) => r.status === "in_progress").length || 0,
        completed: data?.filter((r: { status: string }) => r.status === "completed").length || 0,
        expired: data?.filter((r: { status: string }) => r.status === "expired").length || 0,
        declined: data?.filter((r: { status: string }) => r.status === "declined").length || 0,
        expiring_soon: data?.filter((r: { status: string; expires_at: string | null }) => {
          if (!r.expires_at || r.status === "completed" || r.status === "expired") return false;
          const expiresAt = new Date(r.expires_at);
          return expiresAt > now && expiresAt <= sevenDaysFromNow;
        }).length || 0,
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
 * Create a new signature request
 */
export function useCreateSignatureRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.createSignatureRequest,
    mutationFn: async (payload: CreateSignatureRequestPayload & { enterprise_id: string }) => {
      // Create the signature request
      const { data: request, error: requestError } = await supabase
        .from("signature_requests")
        .insert({
          enterprise_id: payload.enterprise_id,
          contract_id: payload.contract_id,
          title: payload.title,
          message: payload.message || null,
          signing_order: payload.signing_order,
          expires_at: payload.expires_at || null,
          status: "draft",
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // Add signatories
      if (payload.signatories.length > 0) {
        const { error: signatoryError } = await supabase
          .from("signature_request_signatories")
          .insert(
            payload.signatories.map((s) => ({
              signature_request_id: request.id,
              email: s.email,
              name: s.name,
              company: s.company || null,
              role: s.role || "signatory",
              order_index: s.order_index,
              status: "pending",
            }))
          );

        if (signatoryError) throw signatoryError;
      }

      return request as SignatureRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.signatures() });
      toast.success("Signature request created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create signature request: ${error.message}`);
    },
  });
}

/**
 * Send/activate a signature request (change status from draft to pending)
 */
export function useSendSignatureRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.updateSignatureRequest,
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase
        .from("signature_requests")
        .update({
          status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.signatures() });
      queryClient.invalidateQueries({ queryKey: queryKeys.signature(data.id) });
      toast.success("Signature request sent");
    },
    onError: (error) => {
      toast.error(`Failed to send signature request: ${error.message}`);
    },
  });
}

/**
 * Cancel a signature request
 */
export function useCancelSignatureRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.cancelSignatureRequest,
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase
        .from("signature_requests")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.signatures() });
      queryClient.invalidateQueries({ queryKey: queryKeys.signature(data.id) });
      toast.success("Signature request cancelled");
    },
    onError: (error) => {
      toast.error(`Failed to cancel signature request: ${error.message}`);
    },
  });
}

/**
 * Resend signature request to pending signatories
 */
export function useResendSignatureRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.resendSignatureRequest,
    mutationFn: async (requestId: string) => {
      // This would typically call an edge function that sends emails
      // For now, we'll just update the "sent_at" on pending signatories
      const { data: signatories, error } = await supabase
        .from("signature_request_signatories")
        .update({ sent_at: new Date().toISOString() })
        .eq("signature_request_id", requestId)
        .eq("status", "pending")
        .select();

      if (error) throw error;
      return signatories;
    },
    onSuccess: (_, requestId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.signature(requestId) });
      toast.success("Reminders sent to pending signatories");
    },
    onError: (error) => {
      toast.error(`Failed to send reminders: ${error.message}`);
    },
  });
}

/**
 * Add a signatory to an existing request
 */
export function useAddSignatory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.addSignatory,
    mutationFn: async (payload: AddSignatoryPayload) => {
      // Get current max order index
      const { data: existing } = await supabase
        .from("signature_request_signatories")
        .select("order_index")
        .eq("signature_request_id", payload.signature_request_id)
        .order("order_index", { ascending: false })
        .limit(1)
        .single();

      const nextOrderIndex = payload.order_index ?? ((existing?.order_index || 0) + 1);

      const { data, error } = await supabase
        .from("signature_request_signatories")
        .insert({
          signature_request_id: payload.signature_request_id,
          email: payload.email,
          name: payload.name,
          company: payload.company || null,
          role: payload.role || "signatory",
          order_index: nextOrderIndex,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.signature(data.signature_request_id),
      });
      toast.success("Signatory added");
    },
    onError: (error) => {
      toast.error(`Failed to add signatory: ${error.message}`);
    },
  });
}

/**
 * Remove a signatory from a request
 */
export function useRemoveSignatory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.removeSignatory,
    mutationFn: async ({
      signatoryId,
      requestId,
    }: {
      signatoryId: string;
      requestId: string;
    }) => {
      const { error } = await supabase
        .from("signature_request_signatories")
        .delete()
        .eq("id", signatoryId);

      if (error) throw error;
      return { signatoryId, requestId };
    },
    onSuccess: ({ requestId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.signature(requestId) });
      toast.success("Signatory removed");
    },
    onError: (error) => {
      toast.error(`Failed to remove signatory: ${error.message}`);
    },
  });
}

/**
 * Generate portal link for external signatory
 */
export function useGeneratePortalLink() {
  return useMutation({
    mutationFn: async ({
      signatureRequestId,
      signatoryId,
      enterpriseId,
    }: {
      signatureRequestId: string;
      signatoryId: string;
      enterpriseId: string;
    }) => {
      // Generate a random token
      const token = crypto.randomUUID();
      const tokenHash = await hashToken(token);

      // Get signatory details
      const { data: signatory, error: signatoryError } = await supabase
        .from("signature_request_signatories")
        .select("email, name, company")
        .eq("id", signatoryId)
        .single();

      if (signatoryError) throw signatoryError;

      // Create access token
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      const { data: accessToken, error } = await supabase
        .from("external_access_tokens")
        .insert({
          enterprise_id: enterpriseId,
          token_hash: tokenHash,
          token_type: "sign",
          signature_request_id: signatureRequestId,
          party_email: signatory.email,
          party_name: signatory.name,
          party_company: signatory.company,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Update signatory with token reference
      await supabase
        .from("signature_request_signatories")
        .update({ portal_token_id: accessToken.id })
        .eq("id", signatoryId);

      // Return the portal URL (token is unhashed for the URL)
      return {
        url: `/portal/${token}`,
        token,
        expiresAt: expiresAt.toISOString(),
      };
    },
  });
}

// ============================================================================
// HELPERS
// ============================================================================

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
