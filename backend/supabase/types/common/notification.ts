// Notification and communication type definitions

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'unread' | 'read' | 'acknowledged' | 'dismissed';
  created_at: string;
  read_at?: string;
  acknowledged_at?: string;
  metadata?: NotificationMetadata;
  actions?: NotificationAction[];
}

export type NotificationType = 
  | 'contract_expiring'
  | 'contract_expired'
  | 'contract_renewal'
  | 'vendor_issue'
  | 'compliance_alert'
  | 'approval_required'
  | 'task_assigned'
  | 'risk_alert'
  | 'system_alert';

export interface NotificationMetadata {
  contractId?: string;
  vendorId?: string;
  taskId?: string;
  source?: string;
  category?: string;
  relatedItems?: RelatedItem[];
  [key: string]: unknown;
}

export interface RelatedItem {
  type: 'contract' | 'vendor' | 'task' | 'document';
  id: string;
  name?: string;
}

export interface NotificationAction {
  id: string;
  label: string;
  type: 'link' | 'api' | 'dismiss';
  url?: string;
  method?: string;
  payload?: Record<string, unknown>;
}

export interface NotificationPreference {
  userId: string;
  channel: 'email' | 'in_app' | 'sms' | 'slack';
  enabled: boolean;
  types: NotificationType[];
  schedule?: NotificationSchedule;
}

export interface NotificationSchedule {
  timezone: string;
  quietHours?: {
    start: string; // HH:mm format
    end: string;   // HH:mm format
  };
  workDays?: number[]; // 0-6, where 0 is Sunday
}

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  channel: 'email' | 'in_app' | 'sms' | 'slack';
  subject?: string;
  template: string;
  variables: string[];
  metadata?: Record<string, unknown>;
}

export interface NotificationBatch {
  id: string;
  type: NotificationType;
  recipients: NotificationRecipient[];
  template: string;
  data: Record<string, unknown>;
  scheduledAt?: string;
  sentAt?: string;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  results?: BatchResult[];
}

export interface NotificationRecipient {
  userId: string;
  email?: string;
  phone?: string;
  metadata?: Record<string, unknown>;
}

export interface BatchResult {
  recipientId: string;
  status: 'sent' | 'failed' | 'bounced';
  error?: string;
  sentAt?: string;
}

export interface EscalationRule {
  id: string;
  type: NotificationType;
  conditions: EscalationCondition[];
  actions: EscalationAction[];
  enabled: boolean;
}

export interface EscalationCondition {
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
  value: unknown;
}

export interface EscalationAction {
  type: 'notify' | 'assign' | 'create_task';
  target: string; // userId, role, or email
  delay?: number; // minutes
  template?: string;
}