import { QueryClient } from "@tanstack/react-query";

// Create a client with optimized defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 30 seconds
      staleTime: 30 * 1000,
      
      // Cache data for 5 minutes
      gcTime: 5 * 60 * 1000,
      
      // Retry failed requests 3 times with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Refetch on window focus
      refetchOnWindowFocus: false,
      
      // Don't refetch on reconnect by default
      refetchOnReconnect: "always",
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      
      // Show error notifications
      onError: (error) => {
        console.error("Mutation error:", error);
      },
    },
  },
});

// Query key factory for consistent key generation
export const queryKeys = {
  all: ["queries"] as const,
  
  contracts: () => [...queryKeys.all, "contracts"] as const,
  contract: (id: string) => [...queryKeys.contracts(), id] as const,
  contractList: (filters?: Record<string, unknown>) =>
    [...queryKeys.contracts(), "list", filters] as const,
  contractInfinite: (filters?: Record<string, unknown>) =>
    [...queryKeys.contracts(), "infinite", filters] as const,
  
  vendors: () => [...queryKeys.all, "vendors"] as const,
  vendor: (id: string) => [...queryKeys.vendors(), id] as const,
  vendorList: (filters?: Record<string, unknown>) =>
    [...queryKeys.vendors(), "list", filters] as const,
  vendorInfinite: (filters?: Record<string, unknown>) =>
    [...queryKeys.vendors(), "infinite", filters] as const,
  
  dashboard: () => [...queryKeys.all, "dashboard"] as const,
  dashboardMetrics: () => [...queryKeys.dashboard(), "metrics"] as const,
  dashboardActivity: () => [...queryKeys.dashboard(), "activity"] as const,
  
  analytics: () => [...queryKeys.all, "analytics"] as const,
  analyticsMetrics: (dateRange?: { start: Date; end: Date }) =>
    [...queryKeys.analytics(), "metrics", dateRange] as const,
  
  user: () => [...queryKeys.all, "user"] as const,
  userProfile: () => [...queryKeys.user(), "profile"] as const,
  userSettings: () => [...queryKeys.user(), "settings"] as const,

  // Intake Forms
  intakeForms: () => [...queryKeys.all, "intakeForms"] as const,
  intakeForm: (id: string) => [...queryKeys.intakeForms(), id] as const,
  intakeFormList: (filters?: Record<string, unknown>) =>
    [...queryKeys.intakeForms(), "list", filters] as const,

  // Intake Submissions
  intakeSubmissions: () => [...queryKeys.all, "intakeSubmissions"] as const,
  intakeSubmission: (id: string) => [...queryKeys.intakeSubmissions(), id] as const,
  intakeSubmissionList: (filters?: Record<string, unknown>) =>
    [...queryKeys.intakeSubmissions(), "list", filters] as const,
  intakeSubmissionsPending: () => [...queryKeys.intakeSubmissions(), "pending"] as const,

  // Intake Stats
  intakeStats: () => [...queryKeys.all, "intakeStats"] as const,

  // Signature Requests
  signatures: () => [...queryKeys.all, "signatures"] as const,
  signature: (id: string) => [...queryKeys.signatures(), id] as const,
  signatureList: (filters?: Record<string, unknown>) =>
    [...queryKeys.signatures(), "list", filters] as const,
  signatureStats: () => [...queryKeys.signatures(), "stats"] as const,

  // Certificates
  certificates: () => [...queryKeys.all, "certificates"] as const,
  certificate: (id: string) => [...queryKeys.certificates(), id] as const,
  certificateList: (filters?: Record<string, unknown>) =>
    [...queryKeys.certificates(), "list", filters] as const,
  certificateAuthorities: () => [...queryKeys.certificates(), "cas"] as const,
  certificateAuthority: (id: string) => [...queryKeys.certificateAuthorities(), id] as const,
  certificateStats: () => [...queryKeys.certificates(), "stats"] as const,

  // Collaborative Sessions
  sessions: () => [...queryKeys.all, "sessions"] as const,
  session: (id: string) => [...queryKeys.sessions(), id] as const,
  sessionList: (filters?: Record<string, unknown>) =>
    [...queryKeys.sessions(), "list", filters] as const,
  sessionStats: () => [...queryKeys.sessions(), "stats"] as const,
} as const;

// Mutation key factory
export const mutationKeys = {
  createContract: ["createContract"] as const,
  updateContract: ["updateContract"] as const,
  deleteContract: ["deleteContract"] as const,

  createVendor: ["createVendor"] as const,
  updateVendor: ["updateVendor"] as const,
  deleteVendor: ["deleteVendor"] as const,

  updateSettings: ["updateSettings"] as const,

  // Intake Forms
  createIntakeForm: ["createIntakeForm"] as const,
  updateIntakeForm: ["updateIntakeForm"] as const,
  deleteIntakeForm: ["deleteIntakeForm"] as const,
  publishIntakeForm: ["publishIntakeForm"] as const,
  archiveIntakeForm: ["archiveIntakeForm"] as const,

  // Intake Fields
  createIntakeField: ["createIntakeField"] as const,
  updateIntakeField: ["updateIntakeField"] as const,
  deleteIntakeField: ["deleteIntakeField"] as const,
  reorderIntakeFields: ["reorderIntakeFields"] as const,

  // Intake Submissions
  submitIntake: ["submitIntake"] as const,
  reviewSubmission: ["reviewSubmission"] as const,
  convertSubmission: ["convertSubmission"] as const,
  addSubmissionComment: ["addSubmissionComment"] as const,

  // Signature Requests
  createSignatureRequest: ["createSignatureRequest"] as const,
  updateSignatureRequest: ["updateSignatureRequest"] as const,
  cancelSignatureRequest: ["cancelSignatureRequest"] as const,
  resendSignatureRequest: ["resendSignatureRequest"] as const,
  addSignatory: ["addSignatory"] as const,
  removeSignatory: ["removeSignatory"] as const,

  // Certificates
  createCA: ["createCA"] as const,
  revokeCA: ["revokeCA"] as const,
  issueCertificate: ["issueCertificate"] as const,
  revokeCertificate: ["revokeCertificate"] as const,

  // Collaborative Sessions
  createSession: ["createSession"] as const,
  endSession: ["endSession"] as const,
  inviteParticipant: ["inviteParticipant"] as const,
  removeParticipant: ["removeParticipant"] as const,
} as const;