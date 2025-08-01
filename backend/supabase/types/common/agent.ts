
export interface AgentContext {
  enterpriseId: string;
  sessionId: string;
  environment: Record<string, unknown>;
  permissions: string[];
  // Add other common context properties as needed
  [key: string]: any; // Allow for additional, less common context properties
}

export interface SecretaryAgentContext extends AgentContext {
  dataType: 'contract' | 'vendor' | 'document';
}

export interface FinancialAgentContext extends AgentContext {
  analysisType: 'contract' | 'budget';
}

export interface LegalAgentContext extends AgentContext {
  documentType?: 'contract';
  checkType?: 'compliance';
}

export interface NotificationsAgentContext extends AgentContext {
  notificationType: 'alert' | 'reminder' | 'digest';
}

export interface ManagerAgentContext extends AgentContext {
  // Manager agent context might be more dynamic, or could have specific properties
  // For now, we'll keep it flexible, but can refine later.
}
