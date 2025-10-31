/**
 * Local Agent Tools - Expose local agents as tools for LLM agents
 *
 * This bridges the LLM agents (strategic) with local agents (tactical)
 */

import { Tool, ToolContext } from './agent-tools.ts';

// ==================== Secretary Agent Tools ====================

export const SECRETARY_EXTRACT_DATA: Tool = {
  name: 'secretary_extract_data',
  description: 'Use Secretary Agent to extract structured data from documents. Fast and accurate for standard document processing.',
  parameters: {
    type: 'object',
    properties: {
      document_text: {
        type: 'string',
        description: 'Document text to process',
      },
      extraction_type: {
        type: 'string',
        enum: ['contract_metadata', 'vendor_info', 'financial_terms', 'dates'],
        description: 'Type of data to extract',
      },
    },
    required: ['document_text', 'extraction_type'],
  },
  category: 'agent',
  execute: async (params, context) => {
    // Call local Secretary Agent
    const { data, error } = await context.supabase.functions.invoke(
      'local-agents',
      {
        body: {
          agent: 'secretary',
          action: 'extract_data',
          payload: {
            text: params.document_text,
            type: params.extraction_type,
          },
        },
      }
    );

    if (error) throw error;
    return data;
  },
};

export const SECRETARY_CLASSIFY_DOCUMENT: Tool = {
  name: 'secretary_classify_document',
  description: 'Use Secretary Agent to classify document type. Very fast and accurate for standard document types.',
  parameters: {
    type: 'object',
    properties: {
      document_text: {
        type: 'string',
        description: 'Document text to classify',
      },
    },
    required: ['document_text'],
  },
  category: 'agent',
  execute: async (params, context) => {
    const { data, error } = await context.supabase.functions.invoke(
      'local-agents',
      {
        body: {
          agent: 'secretary',
          action: 'classify_document',
          payload: { text: params.document_text },
        },
      }
    );

    if (error) throw error;
    return data;
  },
};

// ==================== Financial Agent Tools ====================

export const FINANCIAL_ANALYZE_TERMS: Tool = {
  name: 'financial_analyze_terms',
  description: 'Use Financial Agent to analyze payment terms, pricing, and financial implications. No LLM cost - uses rule-based analysis.',
  parameters: {
    type: 'object',
    properties: {
      contract_id: {
        type: 'string',
        description: 'Contract ID to analyze',
      },
      financial_data: {
        type: 'object',
        description: 'Financial data extracted from contract',
      },
    },
    required: ['contract_id'],
  },
  category: 'agent',
  execute: async (params, context) => {
    const { data, error } = await context.supabase.functions.invoke(
      'local-agents',
      {
        body: {
          agent: 'financial',
          action: 'analyze_terms',
          payload: {
            contract_id: params.contract_id,
            data: params.financial_data,
          },
        },
      }
    );

    if (error) throw error;
    return data;
  },
};

export const FINANCIAL_CALCULATE_TCO: Tool = {
  name: 'financial_calculate_tco',
  description: 'Use Financial Agent to calculate Total Cost of Ownership. Fast, deterministic calculation.',
  parameters: {
    type: 'object',
    properties: {
      initial_cost: {
        type: 'number',
        description: 'Initial/upfront cost',
      },
      recurring_costs: {
        type: 'array',
        description: 'Array of recurring costs with periods',
      },
      term_years: {
        type: 'number',
        description: 'Contract term in years',
      },
      discount_rate: {
        type: 'number',
        description: 'Discount rate for NPV calculation',
      },
    },
    required: ['initial_cost', 'recurring_costs', 'term_years'],
  },
  category: 'agent',
  execute: async (params, context) => {
    const { data, error } = await context.supabase.functions.invoke(
      'local-agents',
      {
        body: {
          agent: 'financial',
          action: 'calculate_tco',
          payload: params,
        },
      }
    );

    if (error) throw error;
    return data;
  },
};

// ==================== Legal Agent (Local - Rule-Based) Tools ====================

export const LEGAL_CHECK_CLAUSE_PRESENCE: Tool = {
  name: 'legal_check_clause_presence',
  description: 'Use local Legal Agent to check for presence of standard clauses. Fast pattern matching without LLM.',
  parameters: {
    type: 'object',
    properties: {
      contract_text: {
        type: 'string',
        description: 'Contract text to check',
      },
      contract_type: {
        type: 'string',
        description: 'Type of contract',
      },
      required_clauses: {
        type: 'array',
        description: 'List of required clauses to check for',
      },
    },
    required: ['contract_text', 'contract_type'],
  },
  category: 'agent',
  execute: async (params, context) => {
    const { data, error } = await context.supabase.functions.invoke(
      'local-agents',
      {
        body: {
          agent: 'legal',
          action: 'check_clauses',
          payload: {
            text: params.contract_text,
            contract_type: params.contract_type,
            required: params.required_clauses,
          },
        },
      }
    );

    if (error) throw error;
    return data;
  },
};

export const LEGAL_EXTRACT_TERMS: Tool = {
  name: 'legal_extract_terms',
  description: 'Use local Legal Agent to extract specific legal terms and conditions using regex patterns. Very fast.',
  parameters: {
    type: 'object',
    properties: {
      contract_text: {
        type: 'string',
        description: 'Contract text',
      },
      term_types: {
        type: 'array',
        description: 'Types of terms to extract (liability, termination, etc.)',
      },
    },
    required: ['contract_text', 'term_types'],
  },
  category: 'agent',
  execute: async (params, context) => {
    const { data, error } = await context.supabase.functions.invoke(
      'local-agents',
      {
        body: {
          agent: 'legal',
          action: 'extract_terms',
          payload: params,
        },
      }
    );

    if (error) throw error;
    return data;
  },
};

// ==================== Analytics Agent Tools ====================

export const ANALYTICS_CALCULATE_METRICS: Tool = {
  name: 'analytics_calculate_metrics',
  description: 'Use Analytics Agent to calculate contract or vendor metrics. Fast statistical calculations.',
  parameters: {
    type: 'object',
    properties: {
      metric_type: {
        type: 'string',
        enum: ['contract_performance', 'vendor_performance', 'spend_analysis', 'compliance_rate'],
        description: 'Type of metrics to calculate',
      },
      entity_id: {
        type: 'string',
        description: 'Contract or vendor ID',
      },
      time_period: {
        type: 'string',
        description: 'Time period for analysis (e.g., "90d", "1y")',
      },
    },
    required: ['metric_type', 'entity_id'],
  },
  category: 'agent',
  execute: async (params, context) => {
    const { data, error } = await context.supabase.functions.invoke(
      'local-agents',
      {
        body: {
          agent: 'analytics',
          action: 'calculate_metrics',
          payload: params,
        },
      }
    );

    if (error) throw error;
    return data;
  },
};

export const ANALYTICS_IDENTIFY_TRENDS: Tool = {
  name: 'analytics_identify_trends',
  description: 'Use Analytics Agent to identify trends in contract or vendor data. Statistical pattern detection.',
  parameters: {
    type: 'object',
    properties: {
      data_type: {
        type: 'string',
        enum: ['contracts', 'vendors', 'spend', 'compliance'],
        description: 'Type of data to analyze',
      },
      lookback_days: {
        type: 'number',
        description: 'Number of days to look back',
      },
    },
    required: ['data_type'],
  },
  category: 'agent',
  execute: async (params, context) => {
    const { data, error } = await context.supabase.functions.invoke(
      'local-agents',
      {
        body: {
          agent: 'analytics',
          action: 'identify_trends',
          payload: {
            type: params.data_type,
            lookback_days: params.lookback_days || 90,
            enterprise_id: context.enterpriseId,
          },
        },
      }
    );

    if (error) throw error;
    return data;
  },
};

// ==================== Vendor Agent Tools ====================

export const VENDOR_CALCULATE_RISK_SCORE: Tool = {
  name: 'vendor_calculate_risk_score',
  description: 'Use Vendor Agent to calculate vendor risk score based on multiple factors. Deterministic scoring algorithm.',
  parameters: {
    type: 'object',
    properties: {
      vendor_id: {
        type: 'string',
        description: 'Vendor ID',
      },
      include_history: {
        type: 'boolean',
        description: 'Include historical performance in calculation',
      },
    },
    required: ['vendor_id'],
  },
  category: 'agent',
  execute: async (params, context) => {
    const { data, error } = await context.supabase.functions.invoke(
      'local-agents',
      {
        body: {
          agent: 'vendor',
          action: 'calculate_risk',
          payload: {
            vendor_id: params.vendor_id,
            include_history: params.include_history !== false,
          },
        },
      }
    );

    if (error) throw error;
    return data;
  },
};

export const VENDOR_CHECK_COMPLIANCE: Tool = {
  name: 'vendor_check_compliance',
  description: 'Use Vendor Agent to check vendor compliance with requirements. Fast compliance verification.',
  parameters: {
    type: 'object',
    properties: {
      vendor_id: {
        type: 'string',
        description: 'Vendor ID',
      },
      compliance_checks: {
        type: 'array',
        description: 'List of compliance items to verify',
      },
    },
    required: ['vendor_id'],
  },
  category: 'agent',
  execute: async (params, context) => {
    const { data, error } = await context.supabase.functions.invoke(
      'local-agents',
      {
        body: {
          agent: 'vendor',
          action: 'check_compliance',
          payload: params,
        },
      }
    );

    if (error) throw error;
    return data;
  },
};

// ==================== Notifications Agent Tools ====================

export const NOTIFICATIONS_SEND_ALERT: Tool = {
  name: 'notifications_send_alert',
  description: 'Use Notifications Agent to send alerts to users. Handles multi-channel delivery.',
  parameters: {
    type: 'object',
    properties: {
      alert_type: {
        type: 'string',
        enum: ['contract_expiring', 'compliance_issue', 'vendor_risk', 'approval_needed'],
        description: 'Type of alert',
      },
      severity: {
        type: 'string',
        enum: ['info', 'warning', 'critical'],
        description: 'Alert severity',
      },
      recipients: {
        type: 'array',
        description: 'User IDs to notify',
      },
      message: {
        type: 'string',
        description: 'Alert message',
      },
      related_entity_id: {
        type: 'string',
        description: 'Related contract or vendor ID',
      },
    },
    required: ['alert_type', 'severity', 'message'],
  },
  category: 'agent',
  execute: async (params, context) => {
    const { data, error } = await context.supabase.functions.invoke(
      'local-agents',
      {
        body: {
          agent: 'notifications',
          action: 'send_alert',
          payload: {
            ...params,
            enterprise_id: context.enterpriseId,
            sent_by_agent: context.agentId,
          },
        },
      }
    );

    if (error) throw error;
    return data;
  },
};

// ==================== Registration Function ====================

export function registerLocalAgentTools(toolRegistry: any) {
  // Secretary Agent tools
  toolRegistry.registerTool(SECRETARY_EXTRACT_DATA);
  toolRegistry.registerTool(SECRETARY_CLASSIFY_DOCUMENT);

  // Financial Agent tools
  toolRegistry.registerTool(FINANCIAL_ANALYZE_TERMS);
  toolRegistry.registerTool(FINANCIAL_CALCULATE_TCO);

  // Legal Agent tools (local, rule-based)
  toolRegistry.registerTool(LEGAL_CHECK_CLAUSE_PRESENCE);
  toolRegistry.registerTool(LEGAL_EXTRACT_TERMS);

  // Analytics Agent tools
  toolRegistry.registerTool(ANALYTICS_CALCULATE_METRICS);
  toolRegistry.registerTool(ANALYTICS_IDENTIFY_TRENDS);

  // Vendor Agent tools
  toolRegistry.registerTool(VENDOR_CALCULATE_RISK_SCORE);
  toolRegistry.registerTool(VENDOR_CHECK_COMPLIANCE);

  // Notifications Agent tools
  toolRegistry.registerTool(NOTIFICATIONS_SEND_ALERT);
}
