/// <reference path="../../../types/global.d.ts" />

/**
 * AI Module - State-of-the-Art AI Infrastructure
 *
 * This module provides enterprise-grade AI capabilities:
 * - Claude LLM integration with function calling
 * - Cost tracking and budget management
 * - Structured output validation
 * - RAG (Retrieval Augmented Generation)
 * - ReAct reasoning pattern
 * - Tool execution framework
 */

// ==================== Core Claude Client ====================
export {
  ClaudeClient,
  getClaudeClient,
  createClaudeClient,
  type ClaudeMessage,
  type ClaudeRequestOptions,
  type ClaudeResponse,
  type ClaudeTool,
  type ClaudeModel,
  type ContentBlock,
  type ToolUseBlock,
  type StreamEvent,
} from './claude-client.ts';

// ==================== Cost Tracking ====================
export {
  CostTracker,
  getCostTracker,
  type UsageRecord,
  type CostSummary,
  type BudgetConfig,
  type BudgetStatus,
} from './cost-tracker.ts';

// ==================== Tool Execution ====================
export {
  ToolExecutor,
  createToolExecutor,
  type ToolExecutionOptions,
  type ToolCallRecord,
  type AgentToolContext,
} from './tool-executor.ts';

// ==================== Structured Output ====================
export {
  StructuredOutputProcessor,
  getStructuredOutputProcessor,
  // Pre-defined schemas
  ContractAnalysisSchema,
  VendorAnalysisSchema,
  ClauseClassificationSchema,
  TaskPlanSchema,
  IntentClassificationSchema,
  // Types
  type ContractAnalysisOutput,
  type VendorAnalysisOutput,
  type ClauseClassificationOutput,
  type TaskPlanOutput,
  type IntentClassificationOutput,
  type StructuredOutputOptions,
  type StructuredOutputResult,
} from './structured-output.ts';

// ==================== Document Chunking ====================
export {
  DocumentChunker,
  createContractChunker,
  createDocumentChunker,
  chunkText,
  estimateTokens,
  type ChunkOptions,
  type Chunk,
  type ChunkMetadata,
  type ChunkResult,
} from './chunking.ts';

// ==================== Embeddings ====================
export {
  EmbeddingService,
  getEmbeddingService,
  createEmbeddingService,
  type EmbeddingOptions,
  type EmbeddingModel,
  type EmbeddingResult,
  type BatchEmbeddingResult,
} from './embeddings.ts';

// ==================== RAG Pipeline ====================
export {
  RAGPipeline,
  createRAGPipeline,
  ragQuery,
  type RAGOptions,
  type RAGResult,
  type RetrievedChunk,
  type Citation,
  type IngestResult,
} from './rag.ts';

// ==================== ReAct Pattern ====================
export {
  ReActAgent,
  createReActAgent,
  reactReason,
  type ThoughtStep,
  type ActionStep,
  type ObservationStep,
  type FinalAnswerStep,
  type ReActStep,
  type ReActResult,
  type ReActOptions,
} from './react.ts';

// ==================== Convenience Functions ====================

import { SupabaseClient } from '@supabase/supabase-js';
import { getClaudeClient } from './claude-client.ts';
import { createToolExecutor } from './tool-executor.ts';
import { getStructuredOutputProcessor } from './structured-output.ts';
import { createRAGPipeline } from './rag.ts';
import { createReActAgent } from './react.ts';
import { getCostTracker } from './cost-tracker.ts';

/**
 * Create a complete AI context for an agent
 */
export function createAIContext(
  supabase: SupabaseClient,
  enterpriseId: string,
  userId: string,
  agentId: string,
) {
  return {
    claude: getClaudeClient(),
    toolExecutor: createToolExecutor(supabase, enterpriseId, userId, agentId),
    structuredOutput: getStructuredOutputProcessor(),
    rag: createRAGPipeline(supabase, enterpriseId),
    react: createReActAgent(supabase, enterpriseId, userId, agentId),
    costTracker: getCostTracker(supabase, enterpriseId),
  };
}

/**
 * Check if AI features are available
 */
export function isAIConfigured(): boolean {
  const claude = getClaudeClient();
  return claude.isConfigured();
}

/**
 * Get AI feature flags
 */
export function getAIFeatures() {
  const claude = getClaudeClient();
  const openaiKey = Deno.env.get('OPENAI_API_KEY');

  return {
    llmEnabled: claude.isConfigured(),
    embeddingsEnabled: Boolean(openaiKey),
    ragEnabled: claude.isConfigured() && Boolean(openaiKey),
    toolsEnabled: claude.isConfigured(),
  };
}
