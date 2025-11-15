// Donna Terminal Type Definitions

export interface TerminalMessage {
  id: string;
  type: 'user_query' | 'system_response' | 'insight' | 'pattern' | 'recommendation' | 'error';
  timestamp: string;
  content: {
    message: string;
    insights?: Array<{
      type?: string;
      description?: string;
      data?: unknown;
      pattern_count?: number;
      industries?: string[];
    }>;
    recommendations?: string[];
    bestPractices?: Array<{
      title?: string;
      description?: string;
      success_rate?: number;
      usage_count?: number;
    }>;
    confidence?: number;
    metadata?: {
      patternCount?: number;
      industries?: string[];
      avgSavings?: number;
      successRate?: number;
    };
  };
  actions?: Array<{
    label: string;
    type: string;
    payload?: unknown;
  }>;
}

export interface TerminalQueryRequest {
  query: string;
  context?: {
    page?: string;
    entityType?: string;
    entityId?: string;
    userAction?: string;
  };
}

export interface TerminalQueryResponse {
  id: string;
  type: 'system_response' | 'insight' | 'error';
  content: {
    message: string;
    insights?: unknown[];
    recommendations?: string[];
    bestPractices?: unknown[];
    confidence?: number;
    metadata?: {
      patternCount?: number;
      industries?: string[];
      avgSavings?: number;
      successRate?: number;
    };
  };
  actions?: Array<{
    label: string;
    type: string;
    payload?: unknown;
  }>;
  timestamp: string;
}

export interface RealtimeMessage {
  type: 'insight' | 'pattern' | 'recommendation' | 'heartbeat';
  id: string;
  timestamp: string;
  data: {
    title?: string;
    description?: string;
    confidence?: number;
    category?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    metadata?: Record<string, unknown>;
    actionable?: boolean;
    actions?: Array<{
      label: string;
      type: string;
      payload?: unknown;
    }>;
  };
}

export interface DonnaTerminalState {
  messages: TerminalMessage[];
  isConnected: boolean;
  isTyping: boolean;
  unreadCount: number;
  error: string | null;
}

export interface DonnaTerminalActions {
  sendQuery: (query: string, context?: TerminalQueryRequest['context']) => Promise<void>;
  clearMessages: () => void;
  markAsRead: () => void;
  disconnect: () => void;
  reconnect: () => void;
}

export type UseDonnaTerminalReturn = DonnaTerminalState & DonnaTerminalActions;
