// ============================================================================
// CERTIFICATE HOOKS
// React Query hooks for PKI certificate management
// ============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { queryKeys, mutationKeys } from "@/lib/react-query-config";
import type {
  CertificateListItem,
  CertificateAuthority,
  UserCertificate,
  CADetail,
  UserCertificateDetail,
  CertificateStats,
  CertificateFilters,
} from "@/types/signature-management.types";
import { createClient } from "@/utils/supabase/client";

// Type assertion for tables not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = createClient() as any;

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch all certificates (CAs and user certificates) with optional filters
 */
export function useCertificateList(
  enterpriseId: string,
  filters?: CertificateFilters
) {
  return useQuery({
    queryKey: queryKeys.certificateList({ enterpriseId, ...filters }),
    queryFn: async () => {
      const results: CertificateListItem[] = [];

      // Fetch CAs if not filtering to user certs only
      if (!filters?.type || filters.type === "ca") {
        let caQuery = supabase
          .from("certificate_authorities")
          .select("id, name, subject_dn, valid_from, valid_until, status")
          .eq("enterprise_id", enterpriseId);

        if (filters?.status) {
          if (Array.isArray(filters.status)) {
            caQuery = caQuery.in("status", filters.status);
          } else {
            caQuery = caQuery.eq("status", filters.status);
          }
        }

        if (filters?.search) {
          caQuery = caQuery.ilike("name", `%${filters.search}%`);
        }

        const { data: cas, error: caError } = await caQuery;
        if (caError) throw caError;

        results.push(
          ...(cas || []).map((ca: CertificateAuthority) => ({
            id: ca.id,
            type: "ca" as const,
            subject_cn: (ca.subject_dn as unknown as Record<string, string>)?.CN || ca.name,
            status: ca.status,
            valid_from: ca.valid_from,
            valid_until: ca.valid_until,
          }))
        );
      }

      // Fetch user certificates if not filtering to CAs only
      if (!filters?.type || filters.type === "user") {
        let certQuery = supabase
          .from("certificates")
          .select(`
            id,
            subject_dn,
            email,
            valid_from,
            valid_until,
            status,
            fingerprint_sha256,
            ca:certificate_authorities!ca_id (
              id,
              name
            )
          `)
          .eq("enterprise_id", enterpriseId);

        if (filters?.status) {
          if (Array.isArray(filters.status)) {
            certQuery = certQuery.in("status", filters.status);
          } else {
            certQuery = certQuery.eq("status", filters.status);
          }
        }

        if (filters?.search) {
          certQuery = certQuery.or(
            `email.ilike.%${filters.search}%,subject_dn->>'CN'.ilike.%${filters.search}%`
          );
        }

        if (filters?.ca_id) {
          certQuery = certQuery.eq("ca_id", filters.ca_id);
        }

        if (filters?.expires_before) {
          certQuery = certQuery.lte("valid_until", filters.expires_before);
        }

        const { data: certs, error: certError } = await certQuery;
        if (certError) throw certError;

        results.push(
          ...(certs || []).map((cert: UserCertificate & { ca?: { id: string; name: string } }) => ({
            id: cert.id,
            type: "user" as const,
            subject_cn: (cert.subject_dn as unknown as Record<string, string>)?.CN || cert.email,
            email: cert.email,
            status: cert.status,
            valid_from: cert.valid_from,
            valid_until: cert.valid_until,
            issued_by: cert.ca?.name,
            fingerprint: cert.fingerprint_sha256?.slice(0, 16) + "...",
          }))
        );
      }

      // Sort by valid_until (expiring soonest first)
      return results.sort(
        (a, b) =>
          new Date(a.valid_until).getTime() - new Date(b.valid_until).getTime()
      );
    },
    enabled: !!enterpriseId,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch list of Certificate Authorities
 */
export function useCertificateAuthorities(enterpriseId: string) {
  return useQuery({
    queryKey: queryKeys.certificateAuthorities(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificate_authorities")
        .select("*")
        .eq("enterprise_id", enterpriseId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CertificateAuthority[];
    },
    enabled: !!enterpriseId,
  });
}

/**
 * Fetch single Certificate Authority with details
 */
export function useCertificateAuthority(caId: string) {
  return useQuery({
    queryKey: queryKeys.certificateAuthority(caId),
    queryFn: async () => {
      const { data: ca, error: caError } = await supabase
        .from("certificate_authorities")
        .select("*")
        .eq("id", caId)
        .single();

      if (caError) throw caError;

      // Get issued certificates
      const { data: certs, error: certError } = await supabase
        .from("certificates")
        .select("*")
        .eq("ca_id", caId)
        .order("created_at", { ascending: false });

      if (certError) throw certError;

      const issuedCerts = certs || [];

      return {
        ...ca,
        issued_certificates_count: issuedCerts.length,
        active_certificates_count: issuedCerts.filter(
          (c: UserCertificate) => c.status === "active"
        ).length,
        revoked_certificates_count: issuedCerts.filter(
          (c: UserCertificate) => c.status === "revoked"
        ).length,
        issued_certificates: issuedCerts,
      } as CADetail;
    },
    enabled: !!caId,
  });
}

/**
 * Fetch single user certificate with details
 */
export function useUserCertificate(certId: string) {
  return useQuery({
    queryKey: queryKeys.certificate(certId),
    queryFn: async () => {
      const { data: cert, error: certError } = await supabase
        .from("certificates")
        .select(`
          *,
          ca:certificate_authorities!ca_id (
            id,
            name,
            subject_dn
          )
        `)
        .eq("id", certId)
        .single();

      if (certError) throw certError;

      // Get signature count (how many times this cert was used)
      const { count: signatureCount, error: sigError } = await supabase
        .from("signature_events")
        .select("id", { count: "exact" })
        .eq("certificate_id", certId);

      if (sigError) throw sigError;

      // Get recent signatures
      const { data: recentSigs, error: recentError } = await supabase
        .from("signature_events")
        .select(`
          id,
          signature_request_id,
          created_at,
          signature_requests (
            id,
            title,
            contracts (
              title
            )
          )
        `)
        .eq("certificate_id", certId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (recentError) throw recentError;

      return {
        ...cert,
        ca: {
          id: cert.ca.id,
          name: cert.ca.name,
          subject_cn: cert.ca.subject_dn?.CN || cert.ca.name,
        },
        signature_count: signatureCount || 0,
        recent_signatures: (recentSigs || []).map(
          (sig: {
            id: string;
            signature_request_id: string;
            created_at: string;
            signature_requests?: {
              id: string;
              title: string;
              contracts?: { title: string };
            };
          }) => ({
            id: sig.id,
            signature_request_id: sig.signature_request_id,
            signed_at: sig.created_at,
            contract_title:
              sig.signature_requests?.contracts?.title ||
              sig.signature_requests?.title ||
              "Unknown",
          })
        ),
      } as UserCertificateDetail;
    },
    enabled: !!certId,
  });
}

/**
 * Fetch certificate statistics
 */
export function useCertificateStats(enterpriseId: string) {
  return useQuery({
    queryKey: queryKeys.certificateStats(),
    queryFn: async () => {
      const now = new Date();
      const thirtyDaysFromNow = new Date(
        now.getTime() + 30 * 24 * 60 * 60 * 1000
      );

      // Fetch CAs
      const { data: cas, error: caError } = await supabase
        .from("certificate_authorities")
        .select("id, status, valid_until")
        .eq("enterprise_id", enterpriseId);

      if (caError) throw caError;

      // Fetch user certificates
      const { data: certs, error: certError } = await supabase
        .from("certificates")
        .select("id, status, valid_until")
        .eq("enterprise_id", enterpriseId);

      if (certError) throw certError;

      const allCerts = [...(cas || []), ...(certs || [])];

      const stats: CertificateStats = {
        total_cas: (cas || []).length,
        active_cas: (cas || []).filter(
          (c: { status: string }) => c.status === "active"
        ).length,
        total_user_certs: (certs || []).length,
        active_user_certs: (certs || []).filter(
          (c: { status: string }) => c.status === "active"
        ).length,
        expired_certs: allCerts.filter(
          (c: { status: string }) => c.status === "expired"
        ).length,
        revoked_certs: allCerts.filter(
          (c: { status: string }) => c.status === "revoked"
        ).length,
        expiring_soon: allCerts.filter((c: { status: string; valid_until: string }) => {
          if (c.status !== "active") return false;
          const validUntil = new Date(c.valid_until);
          return validUntil > now && validUntil <= thirtyDaysFromNow;
        }).length,
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
 * Create a new Certificate Authority
 */
export function useCreateCA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.createCA,
    mutationFn: async (payload: {
      enterprise_id: string;
      name: string;
      subject_dn: Record<string, string>;
      validity_days: number;
    }) => {
      // In a real implementation, this would call an edge function
      // that generates the CA key pair and certificate
      const { data, error } = await supabase.functions.invoke("native-pki", {
        body: {
          action: "create_ca",
          enterprise_id: payload.enterprise_id,
          name: payload.name,
          subject_dn: payload.subject_dn,
          validity_days: payload.validity_days,
        },
      });

      if (error) throw error;
      return data as CertificateAuthority;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.certificates() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.certificateAuthorities(),
      });
      toast.success("Certificate Authority created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create CA: ${error.message}`);
    },
  });
}

/**
 * Revoke a Certificate Authority
 */
export function useRevokeCA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.revokeCA,
    mutationFn: async ({
      caId,
      reason,
    }: {
      caId: string;
      reason: string;
    }) => {
      const { data, error } = await supabase
        .from("certificate_authorities")
        .update({
          status: "revoked",
          revocation_reason: reason,
          revoked_at: new Date().toISOString(),
        })
        .eq("id", caId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.certificates() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.certificateAuthority(data.id),
      });
      toast.success("Certificate Authority revoked");
    },
    onError: (error) => {
      toast.error(`Failed to revoke CA: ${error.message}`);
    },
  });
}

/**
 * Issue a new user certificate
 */
export function useIssueCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.issueCertificate,
    mutationFn: async (payload: {
      ca_id: string;
      enterprise_id: string;
      email: string;
      subject_dn: Record<string, string>;
      user_id?: string;
      validity_days: number;
    }) => {
      // This would call an edge function that generates the certificate
      const { data, error } = await supabase.functions.invoke("native-pki", {
        body: {
          action: "issue_certificate",
          ...payload,
        },
      });

      if (error) throw error;
      return data as UserCertificate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.certificates() });
      toast.success("Certificate issued successfully");
    },
    onError: (error) => {
      toast.error(`Failed to issue certificate: ${error.message}`);
    },
  });
}

/**
 * Revoke a user certificate
 */
export function useRevokeCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.revokeCertificate,
    mutationFn: async ({
      certId,
      reason,
    }: {
      certId: string;
      reason: string;
    }) => {
      const { data, error } = await supabase
        .from("certificates")
        .update({
          status: "revoked",
          revocation_reason: reason,
          revoked_at: new Date().toISOString(),
        })
        .eq("id", certId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.certificates() });
      queryClient.invalidateQueries({ queryKey: queryKeys.certificate(data.id) });
      toast.success("Certificate revoked");
    },
    onError: (error) => {
      toast.error(`Failed to revoke certificate: ${error.message}`);
    },
  });
}

/**
 * Download certificate (PEM format)
 */
export function useDownloadCertificate() {
  return useMutation({
    mutationFn: async (certId: string) => {
      const { data, error } = await supabase
        .from("certificates")
        .select("certificate_pem, email, subject_dn")
        .eq("id", certId)
        .single();

      if (error) throw error;

      // Create download
      const blob = new Blob([data.certificate_pem], {
        type: "application/x-pem-file",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.email || "certificate"}.pem`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return data;
    },
    onSuccess: () => {
      toast.success("Certificate downloaded");
    },
    onError: (error) => {
      toast.error(`Failed to download certificate: ${error.message}`);
    },
  });
}
