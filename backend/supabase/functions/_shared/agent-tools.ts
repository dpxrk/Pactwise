/**
 * Agent Tool System - State-of-the-art tool registry and execution
 *
 * Provides agents with a comprehensive arsenal of tools for:
 * - Database operations
 * - Web search and scraping
 * - Document processing
 * - Calculations and analysis
 * - External API integrations
 * - Multi-agent collaboration
 * - Local agent integration (hybrid architecture)
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { registerLocalAgentTools } from './local-agent-tools.ts';

// ==================== Tool Definitions ====================

// Tool parameter schema type
export interface ToolParameterSchema {
  type: string;
  description: string;
  enum?: string[];
  items?: ToolParameterSchema;
}

// Tool parameters definition
export interface ToolParameters {
  type: 'object';
  properties: Record<string, ToolParameterSchema>;
  required: string[];
}

// Tool execution result
export interface ToolExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
}

// Base tool interface
export interface Tool<TParams = Record<string, unknown>, TResult = unknown> {
  name: string;
  description: string;
  parameters: ToolParameters;
  category: 'database' | 'search' | 'calculation' | 'external' | 'agent' | 'document' | 'analysis';
  execute: (params: TParams, context: ToolContext) => Promise<TResult>;
}

export interface ToolContext {
  supabase: SupabaseClient;
  enterpriseId: string;
  userId: string;
  agentId: string;
  taskId?: string;
}

// ==================== Tool Registry ====================

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  constructor() {
    this.registerDefaultTools();
    registerLocalAgentTools(this); // Register local agents as tools for hybrid architecture
  }

  registerTool(tool: Tool) {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  getToolsByCategory(category: string): Tool[] {
    return this.getAllTools().filter(t => t.category === category);
  }

  /**
   * Format tools for Claude's function calling API
   */
  getToolDefinitionsForClaude(): Array<{
    name: string;
    description: string;
    input_schema: ToolParameters;
  }> {
    return this.getAllTools().map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters,
    }));
  }

  /**
   * Execute a tool with given parameters
   */
  async executeTool(
    toolName: string,
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ToolExecutionResult> {
    const tool = this.getTool(toolName);
    if (!tool) {
      return {
        success: false,
        error: `Tool '${toolName}' not found`,
      };
    }

    try {
      const result = await tool.execute(params, context);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private registerDefaultTools() {
    // Database Tools
    this.registerTool(DATABASE_QUERY_TOOL);
    this.registerTool(GET_CONTRACT_TOOL);
    this.registerTool(GET_VENDOR_TOOL);
    this.registerTool(SEARCH_CONTRACTS_TOOL);
    this.registerTool(SEARCH_VENDORS_TOOL);
    this.registerTool(CREATE_INSIGHT_TOOL);
    this.registerTool(UPDATE_CONTRACT_SCORE_TOOL);

    // Search & Research Tools
    this.registerTool(WEB_SEARCH_TOOL);
    this.registerTool(LEGAL_DATABASE_SEARCH_TOOL);
    this.registerTool(MARKET_DATA_TOOL);

    // Calculation Tools
    this.registerTool(FINANCIAL_CALCULATOR_TOOL);
    this.registerTool(RISK_CALCULATOR_TOOL);
    this.registerTool(STATISTICS_TOOL);

    // Document Tools
    this.registerTool(EXTRACT_TEXT_TOOL);
    this.registerTool(COMPARE_DOCUMENTS_TOOL);
    this.registerTool(GENERATE_REPORT_TOOL);

    // Agent Collaboration Tools
    this.registerTool(CALL_AGENT_TOOL);
    this.registerTool(CREATE_SUBTASK_TOOL);
    this.registerTool(GET_AGENT_MEMORY_TOOL);
    this.registerTool(STORE_AGENT_MEMORY_TOOL);

    // Analysis Tools
    this.registerTool(SENTIMENT_ANALYSIS_TOOL);
    this.registerTool(ENTITY_EXTRACTION_TOOL);
    this.registerTool(CLASSIFY_TEXT_TOOL);

    // Note: Local Agent Tools are registered via registerLocalAgentTools()
    // called in constructor after default tools are registered
  }
}

// ==================== Database Tools ====================

// Type definitions for tool parameters
interface DatabaseQueryParams {
  query: string;
}

interface GetContractParams {
  contract_id: string;
  include_clauses?: boolean;
}

interface GetVendorParams {
  vendor_id: string;
  include_contracts?: boolean;
  include_evaluations?: boolean;
}

const DATABASE_QUERY_TOOL: Tool<DatabaseQueryParams, unknown> = {
  name: 'database_query',
  description: 'Execute a safe, read-only SQL query on the database. Useful for complex data retrieval and analysis.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The SQL query to execute (SELECT only)',
      },
    },
    required: ['query'],
  },
  category: 'database',
  execute: async (params: DatabaseQueryParams, context: ToolContext) => {
    // Validate query is SELECT only
    const query = params.query.trim().toLowerCase();
    if (!query.startsWith('select')) {
      throw new Error('Only SELECT queries are allowed');
    }

    const { data, error } = await context.supabase.rpc('safe_query_execution', {
      query_text: params.query,
      enterprise_uuid: context.enterpriseId,
    });

    if (error) throw error;
    return data;
  },
};

const GET_CONTRACT_TOOL: Tool<GetContractParams, unknown> = {
  name: 'get_contract',
  description: 'Retrieve detailed information about a specific contract by ID.',
  parameters: {
    type: 'object',
    properties: {
      contract_id: {
        type: 'string',
        description: 'UUID of the contract',
      },
      include_clauses: {
        type: 'boolean',
        description: 'Whether to include extracted clauses',
      },
    },
    required: ['contract_id'],
  },
  category: 'database',
  execute: async (params: GetContractParams, context: ToolContext) => {
    const { data: contract, error } = await context.supabase
      .from('contracts')
      .select('*')
      .eq('id', params.contract_id)
      .eq('enterprise_id', context.enterpriseId)
      .single();

    if (error) throw error;

    if (params.include_clauses) {
      const { data: clauses } = await context.supabase
        .from('contract_clauses')
        .select('*')
        .eq('contract_id', params.contract_id);

      return { ...contract, clauses };
    }

    return contract;
  },
};

interface VendorToolResult {
  [key: string]: unknown;
  contracts?: Array<{
    id: string;
    title: string;
    status: string;
    value: number | null;
    created_at: string;
  }>;
  evaluations?: unknown[];
}

const GET_VENDOR_TOOL: Tool<GetVendorParams, VendorToolResult> = {
  name: 'get_vendor',
  description: 'Retrieve detailed information about a vendor, including performance history.',
  parameters: {
    type: 'object',
    properties: {
      vendor_id: {
        type: 'string',
        description: 'UUID of the vendor',
      },
      include_contracts: {
        type: 'boolean',
        description: 'Whether to include contract history',
      },
      include_evaluations: {
        type: 'boolean',
        description: 'Whether to include past evaluations',
      },
    },
    required: ['vendor_id'],
  },
  category: 'database',
  execute: async (params: GetVendorParams, context: ToolContext): Promise<VendorToolResult> => {
    const { data: vendor, error } = await context.supabase
      .from('vendors')
      .select('*')
      .eq('id', params.vendor_id)
      .eq('enterprise_id', context.enterpriseId)
      .single();

    if (error) throw error;

    const result: VendorToolResult = { ...vendor };

    if (params.include_contracts) {
      const { data: contracts } = await context.supabase
        .from('contracts')
        .select('id, title, status, value, created_at')
        .eq('vendor_id', params.vendor_id);
      result.contracts = contracts || [];
    }

    if (params.include_evaluations) {
      const { data: evaluations } = await context.supabase
        .from('supplier_evaluations')
        .select('*')
        .eq('vendor_id', params.vendor_id)
        .order('evaluation_date', { ascending: false })
        .limit(5);
      result.evaluations = evaluations || [];
    }

    return result;
  },
};

const SEARCH_CONTRACTS_TOOL: Tool = {
  name: 'search_contracts',
  description: 'Search and filter contracts based on various criteria.',
  parameters: {
    type: 'object',
    properties: {
      search_term: {
        type: 'string',
        description: 'Search term for title or content',
      },
      status: {
        type: 'string',
        enum: ['draft', 'active', 'expired', 'terminated'],
        description: 'Filter by status',
      },
      contract_type: {
        type: 'string',
        description: 'Filter by contract type',
      },
      vendor_id: {
        type: 'string',
        description: 'Filter by vendor',
      },
      min_value: {
        type: 'number',
        description: 'Minimum contract value',
      },
      limit: {
        type: 'number',
        description: 'Maximum results to return',
      },
    },
    required: [],
  },
  category: 'database',
  execute: async (params, context) => {
    let query = context.supabase
      .from('contracts')
      .select('*')
      .eq('enterprise_id', context.enterpriseId);

    if (params.search_term) {
      query = query.or(`title.ilike.%${params.search_term}%,description.ilike.%${params.search_term}%`);
    }
    if (params.status) query = query.eq('status', params.status);
    if (params.contract_type) query = query.eq('contract_type', params.contract_type);
    if (params.vendor_id) query = query.eq('vendor_id', params.vendor_id);
    if (params.min_value) query = query.gte('value', params.min_value);

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(params.limit || 20);

    if (error) throw error;
    return data;
  },
};

const SEARCH_VENDORS_TOOL: Tool = {
  name: 'search_vendors',
  description: 'Search and filter vendors based on various criteria.',
  parameters: {
    type: 'object',
    properties: {
      search_term: {
        type: 'string',
        description: 'Search term for vendor name',
      },
      category: {
        type: 'string',
        description: 'Filter by category',
      },
      status: {
        type: 'string',
        enum: ['active', 'inactive', 'pending', 'suspended'],
        description: 'Filter by status',
      },
      min_performance_score: {
        type: 'number',
        description: 'Minimum performance score (0-1)',
      },
      has_certification: {
        type: 'string',
        description: 'Must have this certification',
      },
      limit: {
        type: 'number',
        description: 'Maximum results to return',
      },
    },
    required: [],
  },
  category: 'database',
  execute: async (params, context) => {
    let query = context.supabase
      .from('vendors')
      .select('*')
      .eq('enterprise_id', context.enterpriseId);

    if (params.search_term) {
      query = query.ilike('name', `%${params.search_term}%`);
    }
    if (params.status) query = query.eq('status', params.status);
    if (params.category) query = query.contains('categories', [params.category]);
    if (params.min_performance_score) {
      query = query.gte('performance_score', params.min_performance_score);
    }
    if (params.has_certification) {
      query = query.contains('certifications', [params.has_certification]);
    }

    const { data, error } = await query
      .order('performance_score', { ascending: false })
      .limit(params.limit || 20);

    if (error) throw error;
    return data;
  },
};

const CREATE_INSIGHT_TOOL: Tool = {
  name: 'create_insight',
  description: 'Create an actionable insight to notify users about important findings.',
  parameters: {
    type: 'object',
    properties: {
      insight_type: {
        type: 'string',
        description: 'Type of insight',
      },
      title: {
        type: 'string',
        description: 'Short title',
      },
      description: {
        type: 'string',
        description: 'Detailed description',
      },
      severity: {
        type: 'string',
        enum: ['critical', 'high', 'medium', 'low', 'info'],
        description: 'Severity level',
      },
      contract_id: {
        type: 'string',
        description: 'Related contract ID (optional)',
      },
      vendor_id: {
        type: 'string',
        description: 'Related vendor ID (optional)',
      },
      is_actionable: {
        type: 'boolean',
        description: 'Whether user action is required',
      },
    },
    required: ['insight_type', 'title', 'description', 'severity'],
  },
  category: 'database',
  execute: async (params, context) => {
    const { data, error } = await context.supabase
      .from('agent_insights')
      .insert({
        agent_id: context.agentId,
        insight_type: params.insight_type,
        title: params.title,
        description: params.description,
        severity: params.severity,
        confidence_score: 0.85,
        contract_id: params.contract_id,
        vendor_id: params.vendor_id,
        is_actionable: params.is_actionable || false,
        enterprise_id: context.enterpriseId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

const UPDATE_CONTRACT_SCORE_TOOL: Tool = {
  name: 'update_contract_score',
  description: 'Update contract scores and analysis results.',
  parameters: {
    type: 'object',
    properties: {
      contract_id: {
        type: 'string',
        description: 'Contract ID to update',
      },
      overall_score: {
        type: 'number',
        description: 'Overall score (0-100)',
      },
      grade: {
        type: 'string',
        description: 'Letter grade',
      },
      detailed_scores: {
        type: 'object',
        description: 'Detailed score breakdown',
      },
    },
    required: ['contract_id', 'overall_score'],
  },
  category: 'database',
  execute: async (params, context) => {
    const { data, error } = await context.supabase
      .from('contracts')
      .update({
        overall_score: params.overall_score,
        grade: params.grade,
        detailed_scores: params.detailed_scores,
        ai_analysis_completed: true,
        ai_analysis_date: new Date().toISOString(),
      })
      .eq('id', params.contract_id)
      .eq('enterprise_id', context.enterpriseId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// ==================== Search & Research Tools ====================

const WEB_SEARCH_TOOL: Tool = {
  name: 'web_search',
  description: 'Search the web for information. Useful for market research, vendor information, and current data.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query',
      },
      num_results: {
        type: 'number',
        description: 'Number of results to return (default: 5)',
      },
    },
    required: ['query'],
  },
  category: 'search',
  execute: async (params, _context) => {
    // Implement with actual search API (Serper, Brave Search, etc.)
    // For now, return placeholder
    return {
      query: params.query,
      results: [
        {
          title: 'Search result placeholder',
          url: 'https://example.com',
          snippet: 'This would contain actual search results from a search API',
        },
      ],
      message: 'Web search tool requires external API integration (Serper, Brave, etc.)',
    };
  },
};

const LEGAL_DATABASE_SEARCH_TOOL: Tool = {
  name: 'legal_database_search',
  description: 'Search legal databases for case law, precedents, and legal information.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Legal search query',
      },
      jurisdiction: {
        type: 'string',
        description: 'Legal jurisdiction (e.g., US, EU, UK)',
      },
      category: {
        type: 'string',
        enum: ['case_law', 'statutes', 'regulations', 'contracts'],
        description: 'Type of legal information',
      },
    },
    required: ['query'],
  },
  category: 'search',
  execute: async (params, _context) => {
    // Integrate with legal databases (LexisNexis API, Westlaw, etc.)
    return {
      query: params.query,
      jurisdiction: params.jurisdiction,
      message: 'Legal database search requires integration with legal research APIs',
    };
  },
};

const MARKET_DATA_TOOL: Tool = {
  name: 'market_data',
  description: 'Get market data, pricing intelligence, and industry benchmarks.',
  parameters: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        description: 'Product/service category',
      },
      metric: {
        type: 'string',
        enum: ['pricing', 'market_size', 'trends', 'competitors'],
        description: 'Type of market data',
      },
      region: {
        type: 'string',
        description: 'Geographic region',
      },
    },
    required: ['category', 'metric'],
  },
  category: 'search',
  execute: async (params, context) => {
    // Check internal market research table first
    const { data: research } = await context.supabase
      .from('market_research')
      .select('*')
      .eq('category', params.category)
      .eq('enterprise_id', context.enterpriseId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (research && research.research_data) {
      return {
        source: 'internal_database',
        data: research.research_data,
        created_at: research.created_at,
      };
    }

    return {
      message: 'No recent market data found. Consider running market research first.',
      category: params.category,
      metric: params.metric,
    };
  },
};

// ==================== Calculation Tools ====================

const FINANCIAL_CALCULATOR_TOOL: Tool = {
  name: 'financial_calculator',
  description: 'Perform financial calculations like NPV, IRR, ROI, TCO, etc.',
  parameters: {
    type: 'object',
    properties: {
      calculation_type: {
        type: 'string',
        enum: ['npv', 'irr', 'roi', 'tco', 'payback_period', 'present_value'],
        description: 'Type of calculation',
      },
      inputs: {
        type: 'object',
        description: 'Calculation inputs (varies by type)',
      },
    },
    required: ['calculation_type', 'inputs'],
  },
  category: 'calculation',
  execute: async (params, _context) => {
    const { calculation_type, inputs } = params;

    switch (calculation_type) {
      case 'npv': {
        const { cash_flows, discount_rate } = inputs;
        const npv = cash_flows.reduce((sum: number, cf: number, i: number) => {
          return sum + cf / Math.pow(1 + discount_rate, i);
        }, 0);
        return { npv, calculation_type };
      }

      case 'roi': {
        const { gain, cost } = inputs;
        const roi = ((gain - cost) / cost) * 100;
        return { roi: `${roi.toFixed(2)}%`, calculation_type };
      }

      case 'tco': {
        const { initial_cost, annual_costs, years } = inputs;
        const tco = initial_cost + annual_costs.reduce((sum: number, cost: number) => sum + cost, 0);
        return { tco, annual_average: tco / years, calculation_type };
      }

      default:
        throw new Error(`Unknown calculation type: ${calculation_type}`);
    }
  },
};

const RISK_CALCULATOR_TOOL: Tool = {
  name: 'risk_calculator',
  description: 'Calculate risk scores based on various factors.',
  parameters: {
    type: 'object',
    properties: {
      risk_factors: {
        type: 'object',
        description: 'Risk factors and their weights',
      },
      methodology: {
        type: 'string',
        enum: ['weighted_average', 'maximum', 'compound'],
        description: 'Risk calculation methodology',
      },
    },
    required: ['risk_factors'],
  },
  category: 'calculation',
  execute: async (params, _context) => {
    const { risk_factors, methodology = 'weighted_average' } = params;

    const factors = Object.entries(risk_factors) as [string, any][];

    let total_risk = 0;
    if (methodology === 'weighted_average') {
      const total_weight = factors.reduce((sum, [_, f]) => sum + (f.weight || 1), 0);
      total_risk = factors.reduce((sum, [_, f]) => {
        return sum + (f.score * (f.weight || 1));
      }, 0) / total_weight;
    } else if (methodology === 'maximum') {
      total_risk = Math.max(...factors.map(([_, f]) => f.score));
    } else if (methodology === 'compound') {
      total_risk = 1 - factors.reduce((prod, [_, f]) => prod * (1 - f.score), 1);
    }

    const risk_level = total_risk > 0.7 ? 'critical' :
                      total_risk > 0.5 ? 'high' :
                      total_risk > 0.3 ? 'medium' : 'low';

    return {
      total_risk_score: total_risk,
      risk_level,
      methodology,
      factor_breakdown: risk_factors,
    };
  },
};

const STATISTICS_TOOL: Tool = {
  name: 'statistics',
  description: 'Perform statistical calculations on datasets.',
  parameters: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['mean', 'median', 'std_dev', 'percentile', 'correlation'],
        description: 'Statistical operation',
      },
      data: {
        type: 'array',
        description: 'Dataset to analyze',
      },
      percentile: {
        type: 'number',
        description: 'Percentile value (for percentile operation)',
      },
    },
    required: ['operation', 'data'],
  },
  category: 'calculation',
  execute: async (params, _context) => {
    const { operation, data } = params;

    switch (operation) {
      case 'mean': {
        const mean = data.reduce((sum: number, val: number) => sum + val, 0) / data.length;
        return { mean, count: data.length };
      }

      case 'median': {
        const sorted = [...data].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const median = sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2
          : sorted[mid];
        return { median, count: data.length };
      }

      case 'std_dev': {
        const mean = data.reduce((sum: number, val: number) => sum + val, 0) / data.length;
        const variance = data.reduce((sum: number, val: number) =>
          sum + Math.pow(val - mean, 2), 0) / data.length;
        return { std_dev: Math.sqrt(variance), mean, count: data.length };
      }

      case 'percentile': {
        const sorted = [...data].sort((a, b) => a - b);
        const index = Math.ceil((params.percentile / 100) * sorted.length) - 1;
        return {
          percentile: params.percentile,
          value: sorted[index],
          count: data.length
        };
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  },
};

// ==================== Document Tools ====================

const EXTRACT_TEXT_TOOL: Tool = {
  name: 'extract_text',
  description: 'Extract text content from documents (PDF, DOCX, etc.).',
  parameters: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'Path to the document file',
      },
      format: {
        type: 'string',
        enum: ['plain', 'structured', 'markdown'],
        description: 'Output format',
      },
    },
    required: ['file_path'],
  },
  category: 'document',
  execute: async (params, context) => {
    // Download from Supabase Storage
    const { data, error } = await context.supabase.storage
      .from('contracts')
      .download(params.file_path);

    if (error) throw error;

    // Extract text (would use pdf-parse or similar)
    return {
      text: 'Document text extraction requires additional libraries',
      file_path: params.file_path,
      message: 'Implement with pdf-parse, mammoth, or similar libraries',
    };
  },
};

const COMPARE_DOCUMENTS_TOOL: Tool = {
  name: 'compare_documents',
  description: 'Compare two documents and identify differences.',
  parameters: {
    type: 'object',
    properties: {
      document1_id: {
        type: 'string',
        description: 'First document/contract ID',
      },
      document2_id: {
        type: 'string',
        description: 'Second document/contract ID',
      },
      comparison_type: {
        type: 'string',
        enum: ['full', 'terms', 'clauses', 'pricing'],
        description: 'Type of comparison',
      },
    },
    required: ['document1_id', 'document2_id'],
  },
  category: 'document',
  execute: async (params, context) => {
    const { data: doc1 } = await context.supabase
      .from('contracts')
      .select('*')
      .eq('id', params.document1_id)
      .single();

    const { data: doc2 } = await context.supabase
      .from('contracts')
      .select('*')
      .eq('id', params.document2_id)
      .single();

    return {
      document1: doc1,
      document2: doc2,
      message: 'Document comparison ready for AI analysis',
    };
  },
};

const GENERATE_REPORT_TOOL: Tool = {
  name: 'generate_report',
  description: 'Generate formatted reports from data.',
  parameters: {
    type: 'object',
    properties: {
      report_type: {
        type: 'string',
        enum: ['contract_analysis', 'vendor_performance', 'sourcing_summary', 'compliance'],
        description: 'Type of report',
      },
      data: {
        type: 'object',
        description: 'Report data',
      },
      format: {
        type: 'string',
        enum: ['json', 'markdown', 'html'],
        description: 'Output format',
      },
    },
    required: ['report_type', 'data'],
  },
  category: 'document',
  execute: async (params, _context) => {
    // Generate structured report
    return {
      report_type: params.report_type,
      generated_at: new Date().toISOString(),
      format: params.format || 'json',
      content: params.data,
    };
  },
};

// ==================== Agent Collaboration Tools ====================

const CALL_AGENT_TOOL: Tool = {
  name: 'call_agent',
  description: 'Call another specialized agent for help with a specific task.',
  parameters: {
    type: 'object',
    properties: {
      agent_type: {
        type: 'string',
        enum: ['legal', 'financial', 'sourcing', 'vendor', 'analytics', 'secretary'],
        description: 'Type of agent to call',
      },
      task: {
        type: 'string',
        description: 'Task description for the agent',
      },
      context: {
        type: 'object',
        description: 'Additional context for the agent',
      },
      priority: {
        type: 'number',
        description: 'Task priority (1-10)',
      },
    },
    required: ['agent_type', 'task'],
  },
  category: 'agent',
  execute: async (params, context) => {
    // Create subtask for another agent
    const { data, error } = await context.supabase
      .from('agent_tasks')
      .insert({
        agent_id: null, // Will be assigned to the requested agent type
        task_type: 'delegated_task',
        priority: params.priority || 5,
        status: 'pending',
        payload: {
          agent_type: params.agent_type,
          task: params.task,
          context: params.context,
          parent_task_id: context.taskId,
          delegated_by: context.agentId,
        },
        enterprise_id: context.enterpriseId,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      subtask_id: data.id,
      agent_type: params.agent_type,
      status: 'delegated',
      message: `Task delegated to ${params.agent_type} agent`,
    };
  },
};

const CREATE_SUBTASK_TOOL: Tool = {
  name: 'create_subtask',
  description: 'Break down complex task into smaller subtasks for parallel processing.',
  parameters: {
    type: 'object',
    properties: {
      subtasks: {
        type: 'array',
        description: 'Array of subtask descriptions',
      },
      dependencies: {
        type: 'object',
        description: 'Task dependencies (which must complete before others)',
      },
    },
    required: ['subtasks'],
  },
  category: 'agent',
  execute: async (params, context) => {
    const subtaskIds = [];

    for (const subtask of params.subtasks) {
      const { data } = await context.supabase
        .from('agent_tasks')
        .insert({
          agent_id: context.agentId,
          task_type: 'subtask',
          priority: 5,
          status: 'pending',
          payload: {
            description: subtask,
            parent_task_id: context.taskId,
            dependencies: params.dependencies,
          },
          enterprise_id: context.enterpriseId,
        })
        .select()
        .single();

      if (data) subtaskIds.push(data.id);
    }

    return {
      subtask_count: subtaskIds.length,
      subtask_ids: subtaskIds,
      message: 'Subtasks created and queued',
    };
  },
};

const GET_AGENT_MEMORY_TOOL: Tool = {
  name: 'get_agent_memory',
  description: 'Retrieve relevant information from agent memory system.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'What to search for in memory',
      },
      memory_type: {
        type: 'string',
        enum: ['short_term', 'long_term', 'episodic', 'semantic'],
        description: 'Type of memory to search',
      },
      limit: {
        type: 'number',
        description: 'Maximum memories to retrieve',
      },
    },
    required: ['query'],
  },
  category: 'agent',
  execute: async (params, context) => {
    const { data } = await context.supabase
      .from('agent_memory')
      .select('*')
      .eq('agent_id', context.agentId)
      .or(`memory_type.eq.${params.memory_type || 'long_term'}`)
      .order('importance_score', { ascending: false })
      .limit(params.limit || 5);

    return {
      memories: data || [],
      query: params.query,
      count: data?.length || 0,
    };
  },
};

const STORE_AGENT_MEMORY_TOOL: Tool = {
  name: 'store_agent_memory',
  description: 'Store important information in agent memory for future reference.',
  parameters: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'Information to store',
      },
      memory_type: {
        type: 'string',
        enum: ['short_term', 'long_term', 'episodic', 'semantic'],
        description: 'Type of memory',
      },
      importance_score: {
        type: 'number',
        description: 'Importance (0-1)',
      },
      tags: {
        type: 'array',
        description: 'Memory tags for retrieval',
      },
    },
    required: ['content', 'memory_type'],
  },
  category: 'agent',
  execute: async (params, context) => {
    const { data, error } = await context.supabase
      .from('agent_memory')
      .insert({
        agent_id: context.agentId,
        content: params.content,
        memory_type: params.memory_type,
        importance_score: params.importance_score || 0.5,
        tags: params.tags || [],
        enterprise_id: context.enterpriseId,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      memory_id: data.id,
      message: 'Memory stored successfully',
    };
  },
};

// ==================== Analysis Tools ====================

const SENTIMENT_ANALYSIS_TOOL: Tool = {
  name: 'sentiment_analysis',
  description: 'Analyze sentiment and tone of text.',
  parameters: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Text to analyze',
      },
    },
    required: ['text'],
  },
  category: 'analysis',
  execute: async (params, _context) => {
    // Placeholder - would integrate with sentiment API or model
    return {
      sentiment: 'neutral',
      confidence: 0.75,
      tone: 'professional',
      message: 'Sentiment analysis requires NLP model integration',
    };
  },
};

const ENTITY_EXTRACTION_TOOL: Tool = {
  name: 'entity_extraction',
  description: 'Extract named entities (people, organizations, locations, dates) from text.',
  parameters: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Text to extract entities from',
      },
      entity_types: {
        type: 'array',
        description: 'Types of entities to extract',
      },
    },
    required: ['text'],
  },
  category: 'analysis',
  execute: async (params, _context) => {
    // Placeholder - would integrate with NER model
    return {
      entities: [],
      message: 'Entity extraction requires NLP model integration',
    };
  },
};

const CLASSIFY_TEXT_TOOL: Tool = {
  name: 'classify_text',
  description: 'Classify text into predefined categories.',
  parameters: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Text to classify',
      },
      categories: {
        type: 'array',
        description: 'Possible categories',
      },
    },
    required: ['text', 'categories'],
  },
  category: 'analysis',
  execute: async (params, _context) => {
    // Placeholder - would use classification model
    return {
      category: params.categories[0],
      confidence: 0.7,
      message: 'Text classification requires ML model integration',
    };
  },
};

// Export singleton instance
export const toolRegistry = new ToolRegistry();
