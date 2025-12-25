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

  // Contract Templates
  templates: () => [...queryKeys.all, "templates"] as const,
  template: (id: string) => [...queryKeys.templates(), id] as const,
  templateList: (filters?: Record<string, unknown>) =>
    [...queryKeys.templates(), "list", filters] as const,
  templateVersions: (id: string) => [...queryKeys.templates(), id, "versions"] as const,
  templateStats: () => [...queryKeys.templates(), "stats"] as const,

  // Approval Matrix
  approvals: () => [...queryKeys.all, "approvals"] as const,
  approvalMatrix: (id: string) => [...queryKeys.approvals(), "matrix", id] as const,
  approvalMatrixList: (filters?: Record<string, unknown>) =>
    [...queryKeys.approvals(), "matrices", "list", filters] as const,
  approvalRule: (id: string) => [...queryKeys.approvals(), "rule", id] as const,
  pendingApprovals: (filters?: Record<string, unknown>) =>
    [...queryKeys.approvals(), "pending", filters] as const,
  routingHistory: (filters?: Record<string, unknown>) =>
    [...queryKeys.approvals(), "history", filters] as const,
  delegations: () => [...queryKeys.approvals(), "delegations"] as const,
  approvalStats: () => [...queryKeys.approvals(), "stats"] as const,

  // Document Diff/Versions
  documentVersions: (filters?: Record<string, unknown>) => [...queryKeys.all, "documentVersions", filters] as const,
  documentVersion: (id: string) => [...queryKeys.all, "documentVersions", id] as const,
  documentVersionList: (contractId: string, filters?: Record<string, unknown>) =>
    [...queryKeys.all, "documentVersions", "list", contractId, filters] as const,
  documentComparison: (sourceId: string, targetId: string) =>
    [...queryKeys.all, "documentVersions", "compare", sourceId, targetId] as const,
  documentChanges: (filters?: Record<string, unknown>) =>
    [...queryKeys.all, "documentVersions", "changes", filters] as const,
  documentComments: (filters?: Record<string, unknown>) =>
    [...queryKeys.all, "documentVersions", "comments", filters] as const,
  documentCommentThreads: (versionId: string) =>
    [...queryKeys.all, "documentVersions", "threads", versionId] as const,
  versionStats: (contractId: string) =>
    [...queryKeys.all, "documentVersions", "stats", contractId] as const,
  commentStats: (versionId: string) =>
    [...queryKeys.all, "documentVersions", "commentStats", versionId] as const,
  redlineSessions: (contractId: string) => [...queryKeys.all, "documentVersions", "redline", contractId] as const,
  redlineSession: (id: string) => [...queryKeys.all, "documentVersions", "redlineSession", id] as const,

  // Obligations
  obligations: () => [...queryKeys.all, "obligations"] as const,
  obligation: (id: string) => [...queryKeys.obligations(), id] as const,
  obligationList: (filters?: Record<string, unknown>) =>
    [...queryKeys.obligations(), "list", filters] as const,
  obligationCalendar: (year: number, month: number) =>
    [...queryKeys.obligations(), "calendar", year, month] as const,
  obligationDependencies: (id: string) =>
    [...queryKeys.obligations(), id, "dependencies"] as const,
  obligationStats: () => [...queryKeys.obligations(), "stats"] as const,

  // Compliance
  compliance: () => [...queryKeys.all, "compliance"] as const,
  complianceFrameworks: () => [...queryKeys.compliance(), "frameworks"] as const,
  complianceFramework: (id: string) => [...queryKeys.complianceFrameworks(), id] as const,
  complianceRules: (filters?: Record<string, unknown>) =>
    [...queryKeys.compliance(), "rules", filters] as const,
  complianceRule: (id: string) => [...queryKeys.complianceRules(), id] as const,
  complianceChecks: (filters?: Record<string, unknown>) =>
    [...queryKeys.compliance(), "checks", filters] as const,
  complianceCheck: (id: string) => [...queryKeys.complianceChecks(), id] as const,
  complianceIssues: (filters?: Record<string, unknown>) =>
    [...queryKeys.compliance(), "issues", filters] as const,
  complianceIssue: (id: string) => [...queryKeys.complianceIssues(), id] as const,
  complianceCertifications: () => [...queryKeys.compliance(), "certifications"] as const,
  complianceStats: () => [...queryKeys.compliance(), "stats"] as const,

  // Risk Assessment
  risk: () => [...queryKeys.all, "risk"] as const,
  riskAssessment: (id: string) => [...queryKeys.risk(), "assessment", id] as const,
  riskAssessments: (filters?: Record<string, unknown>) =>
    [...queryKeys.risk(), "assessments", filters] as const,
  riskAssessmentList: (filters?: Record<string, unknown>) =>
    [...queryKeys.risk(), "assessments", "list", filters] as const,
  contractRisk: (contractId: string) =>
    [...queryKeys.risk(), "contract", contractId] as const,
  riskFactors: (enterpriseId: string) => [...queryKeys.risk(), "factors", enterpriseId] as const,
  riskHistory: (contractId: string) => [...queryKeys.risk(), "history", contractId] as const,
  riskThresholds: (enterpriseId: string) => [...queryKeys.risk(), "thresholds", enterpriseId] as const,
  riskAlerts: (filters?: Record<string, unknown>) => [...queryKeys.risk(), "alerts", filters] as const,
  riskStats: () => [...queryKeys.risk(), "stats"] as const,

  // Clause Conflicts
  clauseConflicts: (filters?: Record<string, unknown>) => [...queryKeys.all, "clauseConflicts", filters] as const,
  clauseConflict: (id: string) => [...queryKeys.all, "clauseConflicts", id] as const,
  clauseConflictList: (filters?: Record<string, unknown>) =>
    [...queryKeys.all, "clauseConflicts", "list", filters] as const,
  enterpriseClauseConflicts: (filters?: Record<string, unknown>) =>
    [...queryKeys.all, "clauseConflicts", "enterprise", filters] as const,
  contractConflicts: (contractId: string) =>
    [...queryKeys.all, "clauseConflicts", "contract", contractId] as const,
  clauseCategories: (enterpriseId: string) =>
    [...queryKeys.all, "clauseConflicts", "categories", enterpriseId] as const,
  clauseDefinitions: (filters?: Record<string, unknown>) =>
    [...queryKeys.all, "clauseConflicts", "definitions", filters] as const,
  conflictRules: (enterpriseId: string) =>
    [...queryKeys.all, "clauseConflicts", "rules", enterpriseId] as const,
  compatibilityMatrix: (enterpriseId: string) =>
    [...queryKeys.all, "clauseConflicts", "matrix", enterpriseId] as const,
  conflictHistory: (conflictId: string) =>
    [...queryKeys.all, "clauseConflicts", "history", conflictId] as const,
  conflictStats: () => [...queryKeys.all, "clauseConflicts", "stats"] as const,

  // Temporal Analysis
  temporal: () => [...queryKeys.all, "temporal"] as const,
  temporalMetrics: (filters?: Record<string, unknown>) =>
    [...queryKeys.temporal(), "metrics", filters] as const,
  temporalTimeSeries: (filters?: Record<string, unknown>) =>
    [...queryKeys.temporal(), "timeSeries", filters] as const,
  temporalTrends: (filters?: Record<string, unknown>) =>
    [...queryKeys.temporal(), "trends", filters] as const,
  temporalPatterns: (filters?: Record<string, unknown>) =>
    [...queryKeys.temporal(), "patterns", filters] as const,
  temporalPredictions: (filters?: Record<string, unknown>) =>
    [...queryKeys.temporal(), "predictions", filters] as const,
  temporalForecast: (filters?: Record<string, unknown>) =>
    [...queryKeys.temporal(), "forecast", filters] as const,
  renewalPredictions: (filters?: Record<string, unknown>) =>
    [...queryKeys.temporal(), "renewalPredictions", filters] as const,
  temporalAlerts: (filters?: Record<string, unknown>) =>
    [...queryKeys.temporal(), "alerts", filters] as const,
  temporalAnomalies: (filters?: Record<string, unknown>) =>
    [...queryKeys.temporal(), "anomalies", filters] as const,
  temporalLifecycleEvents: (contractId: string) =>
    [...queryKeys.temporal(), "lifecycle", contractId] as const,
  temporalDashboard: (enterpriseId: string) =>
    [...queryKeys.temporal(), "dashboard", enterpriseId] as const,
  temporalStats: () => [...queryKeys.temporal(), "stats"] as const,

  // Spend Analytics
  spend: () => [...queryKeys.all, "spend"] as const,
  spendRecord: (id: string) => [...queryKeys.spend(), id] as const,
  spendList: (filters?: Record<string, unknown>) =>
    [...queryKeys.spend(), "list", filters] as const,
  spendCategories: () => [...queryKeys.spend(), "categories"] as const,
  spendAggregations: (filters?: Record<string, unknown>) =>
    [...queryKeys.spend(), "aggregations", filters] as const,
  spendSavings: (filters?: Record<string, unknown>) =>
    [...queryKeys.spend(), "savings", filters] as const,
  spendStats: () => [...queryKeys.spend(), "stats"] as const,

  // Vendor Scorecards
  scorecards: () => [...queryKeys.all, "scorecards"] as const,
  scorecard: (id: string) => [...queryKeys.scorecards(), id] as const,
  scorecardList: (filters?: Record<string, unknown>) =>
    [...queryKeys.scorecards(), "list", filters] as const,
  scorecardTemplates: () => [...queryKeys.scorecards(), "templates"] as const,
  scorecardTemplate: (id: string) => [...queryKeys.scorecardTemplates(), id] as const,
  vendorScorecard: (vendorId: string) =>
    [...queryKeys.scorecards(), "vendor", vendorId] as const,
  vendorPerformanceHistory: (vendorId: string) =>
    [...queryKeys.scorecards(), "history", vendorId] as const,
  scorecardStats: () => [...queryKeys.scorecards(), "stats"] as const,

  // Donna Feedback
  donna: () => [...queryKeys.all, "donna"] as const,
  donnaFeedback: () => [...queryKeys.donna(), "feedback"] as const,
  donnaRecommendation: (id: string) => [...queryKeys.donna(), "recommendation", id] as const,
  donnaRecommendations: (filters?: Record<string, unknown>) =>
    [...queryKeys.donna(), "recommendations", filters] as const,
  donnaPendingRecommendations: (filters?: Record<string, unknown>) =>
    [...queryKeys.donna(), "pending", filters] as const,
  donnaFeedbackHistory: (filters?: Record<string, unknown>) =>
    [...queryKeys.donna(), "history", filters] as const,
  donnaLearningMetrics: (filters?: Record<string, unknown>) =>
    [...queryKeys.donna(), "learning", filters] as const,
  donnaDashboard: (enterpriseId: string) =>
    [...queryKeys.donna(), "dashboard", enterpriseId] as const,
  donnaQualityMetrics: (filters?: Record<string, unknown>) =>
    [...queryKeys.donna(), "quality", filters] as const,
  donnaStats: () => [...queryKeys.donna(), "stats"] as const,
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

  // Contract Templates
  createTemplate: ["createTemplate"] as const,
  updateTemplate: ["updateTemplate"] as const,
  deleteTemplate: ["deleteTemplate"] as const,
  publishTemplate: ["publishTemplate"] as const,
  archiveTemplate: ["archiveTemplate"] as const,
  createTemplateSection: ["createTemplateSection"] as const,
  updateTemplateSection: ["updateTemplateSection"] as const,
  deleteTemplateSection: ["deleteTemplateSection"] as const,
  createTemplateVariable: ["createTemplateVariable"] as const,
  updateTemplateVariable: ["updateTemplateVariable"] as const,
  deleteTemplateVariable: ["deleteTemplateVariable"] as const,
  renderTemplate: ["renderTemplate"] as const,

  // Approval Matrix
  createApprovalMatrix: ["createApprovalMatrix"] as const,
  updateApprovalMatrix: ["updateApprovalMatrix"] as const,
  deleteApprovalMatrix: ["deleteApprovalMatrix"] as const,
  createApprovalRule: ["createApprovalRule"] as const,
  updateApprovalRule: ["updateApprovalRule"] as const,
  deleteApprovalRule: ["deleteApprovalRule"] as const,
  createDelegation: ["createDelegation"] as const,
  deleteDelegation: ["deleteDelegation"] as const,
  submitApprovalDecision: ["submitApprovalDecision"] as const,

  // Document Versions
  createDocumentVersion: ["createDocumentVersion"] as const,
  uploadVersion: ["uploadVersion"] as const,
  compareVersions: ["compareVersions"] as const,
  createDocumentComment: ["createDocumentComment"] as const,
  updateDocumentComment: ["updateDocumentComment"] as const,
  deleteDocumentComment: ["deleteDocumentComment"] as const,
  resolveDocumentComment: ["resolveDocumentComment"] as const,
  resolveComment: ["resolveComment"] as const,
  reviewDocumentChange: ["reviewDocumentChange"] as const,
  reviewChange: ["reviewChange"] as const,
  bulkReviewChanges: ["bulkReviewChanges"] as const,
  createRedlineSession: ["createRedlineSession"] as const,
  completeRedlineSession: ["completeRedlineSession"] as const,
  cancelRedlineSession: ["cancelRedlineSession"] as const,

  // Obligations
  createObligation: ["createObligation"] as const,
  updateObligation: ["updateObligation"] as const,
  deleteObligation: ["deleteObligation"] as const,
  completeObligation: ["completeObligation"] as const,
  escalateObligation: ["escalateObligation"] as const,
  addObligationDependency: ["addObligationDependency"] as const,
  removeObligationDependency: ["removeObligationDependency"] as const,
  assignObligation: ["assignObligation"] as const,

  // Compliance
  enableFramework: ["enableFramework"] as const,
  disableFramework: ["disableFramework"] as const,
  createComplianceRule: ["createComplianceRule"] as const,
  updateComplianceRule: ["updateComplianceRule"] as const,
  deleteComplianceRule: ["deleteComplianceRule"] as const,
  runComplianceCheck: ["runComplianceCheck"] as const,
  createComplianceIssue: ["createComplianceIssue"] as const,
  updateComplianceIssue: ["updateComplianceIssue"] as const,
  resolveComplianceIssue: ["resolveComplianceIssue"] as const,
  addCertification: ["addCertification"] as const,
  renewCertification: ["renewCertification"] as const,

  // Risk Assessment
  createRiskAssessment: ["createRiskAssessment"] as const,
  updateRiskAssessment: ["updateRiskAssessment"] as const,
  createMitigation: ["createMitigation"] as const,
  updateMitigation: ["updateMitigation"] as const,
  deleteMitigation: ["deleteMitigation"] as const,
  completeMitigation: ["completeMitigation"] as const,
  acknowledgeRiskAlert: ["acknowledgeRiskAlert"] as const,
  requestRiskAnalysis: ["requestRiskAnalysis"] as const,

  // Clause Conflicts
  resolveConflict: ["resolveConflict"] as const,
  acceptConflict: ["acceptConflict"] as const,
  createConflictRule: ["createConflictRule"] as const,
  updateConflictRule: ["updateConflictRule"] as const,
  deleteConflictRule: ["deleteConflictRule"] as const,

  // Temporal Analysis
  acknowledgeAlert: ["acknowledgeAlert"] as const,
  acknowledgeTemporalAlert: ["acknowledgeTemporalAlert"] as const,
  resolveAlert: ["resolveAlert"] as const,
  resolveTemporalAlert: ["resolveTemporalAlert"] as const,
  dismissAlert: ["dismissAlert"] as const,
  dismissTemporalAlert: ["dismissTemporalAlert"] as const,
  resolveAnomaly: ["resolveAnomaly"] as const,
  requestPredictionAnalysis: ["requestPredictionAnalysis"] as const,

  // Spend Analytics
  createSpendRecord: ["createSpendRecord"] as const,
  updateSpendRecord: ["updateSpendRecord"] as const,
  deleteSpendRecord: ["deleteSpendRecord"] as const,
  createSpendCategory: ["createSpendCategory"] as const,
  updateSpendCategory: ["updateSpendCategory"] as const,
  recordSavings: ["recordSavings"] as const,

  // Vendor Scorecards
  createScorecardTemplate: ["createScorecardTemplate"] as const,
  updateScorecardTemplate: ["updateScorecardTemplate"] as const,
  deleteScorecardTemplate: ["deleteScorecardTemplate"] as const,
  createScorecard: ["createScorecard"] as const,
  updateScorecardMetric: ["updateScorecardMetric"] as const,
  completeScorecard: ["completeScorecard"] as const,
  approveScorecard: ["approveScorecard"] as const,
  createActionItem: ["createActionItem"] as const,
  updateActionItem: ["updateActionItem"] as const,

  // Donna Feedback
  submitFeedback: ["submitFeedback"] as const,
  submitDonnaFeedback: ["submitDonnaFeedback"] as const,
  updateImplementation: ["updateImplementation"] as const,
  updateDonnaImplementation: ["updateDonnaImplementation"] as const,
  recordOutcome: ["recordOutcome"] as const,
  recordDonnaOutcome: ["recordDonnaOutcome"] as const,
  dismissRecommendation: ["dismissRecommendation"] as const,
  dismissDonnaRecommendation: ["dismissDonnaRecommendation"] as const,
  requestDonnaRecommendations: ["requestDonnaRecommendations"] as const,
  triggerDonnaLearning: ["triggerDonnaLearning"] as const,
  acceptDonnaRecommendation: ["acceptDonnaRecommendation"] as const,
} as const;