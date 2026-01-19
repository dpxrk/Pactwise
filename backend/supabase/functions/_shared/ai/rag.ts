/// <reference path="../../../types/global.d.ts" />

/**
 * RAG (Retrieval Augmented Generation) Orchestrator
 *
 * Coordinates the full RAG pipeline:
 * - Document ingestion and chunking
 * - Embedding generation and storage
 * - Semantic + keyword hybrid search
 * - Context assembly for LLM
 * - Citation tracking
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { DocumentChunker, ChunkResult, Chunk, createContractChunker, createDocumentChunker } from './chunking.ts';
import { EmbeddingService, createEmbeddingService } from './embeddings.ts';
import { getClaudeClient, ClaudeMessage, ClaudeRequestOptions } from './claude-client.ts';
import { getCostTracker } from './cost-tracker.ts';

// ==================== Types ====================

export interface RAGOptions {
  /** Maximum chunks to retrieve (default: 5) */
  topK?: number;
  /** Minimum similarity threshold (default: 0.7) */
  similarityThreshold?: number;
  /** Enable hybrid search - combines semantic + keyword (default: true) */
  hybridSearch?: boolean;
  /** Weight for semantic vs keyword search (0-1, default: 0.7 semantic) */
  semanticWeight?: number;
  /** Include citations in response (default: true) */
  includeCitations?: boolean;
  /** Maximum context tokens (default: 4000) */
  maxContextTokens?: number;
}

export interface RetrievedChunk {
  id: string;
  content: string;
  similarity: number;
  metadata: {
    documentId?: string;
    contractId?: string;
    section?: string;
    chunkIndex: number;
  };
}

export interface RAGResult {
  answer: string;
  retrievedChunks: RetrievedChunk[];
  citations: Citation[];
  usage: {
    inputTokens: number;
    outputTokens: number;
    embeddingTokens: number;
    totalCost: number;
  };
  metadata: {
    searchType: 'semantic' | 'hybrid';
    chunksRetrieved: number;
    contextTokens: number;
  };
}

export interface Citation {
  id: string;
  text: string;
  source: {
    documentId?: string;
    contractId?: string;
    section?: string;
    pageEstimate?: number;
  };
  relevance: number;
}

export interface IngestResult {
  documentId?: string;
  contractId?: string;
  chunksCreated: number;
  embeddingsGenerated: number;
  totalTokens: number;
  cost: number;
}

// ==================== RAG Pipeline ====================

export class RAGPipeline {
  private supabase: SupabaseClient;
  private enterpriseId: string;
  private embeddingService: EmbeddingService;
  private claudeClient = getClaudeClient();
  private chunker: DocumentChunker;

  constructor(
    supabase: SupabaseClient,
    enterpriseId: string,
    options?: { documentType?: 'contract' | 'general' },
  ) {
    this.supabase = supabase;
    this.enterpriseId = enterpriseId;
    this.embeddingService = createEmbeddingService({
      supabase,
      enterpriseId,
    });
    this.chunker = options?.documentType === 'contract'
      ? createContractChunker()
      : createDocumentChunker();
  }

  /**
   * Ingest a document into the RAG system
   */
  async ingest(
    text: string,
    options: {
      documentId?: string;
      contractId?: string;
      title?: string;
    } = {},
  ): Promise<IngestResult> {
    // Chunk the document
    const chunkResult = this.chunker.chunk(text);

    // Generate embeddings for all chunks
    const texts = chunkResult.chunks.map(c => c.content);
    const embeddingResult = await this.embeddingService.embedBatch(texts);

    // Store chunks with embeddings
    const chunkRecords = chunkResult.chunks.map((chunk, i) => ({
      document_id: options.documentId || null,
      contract_id: options.contractId || null,
      enterprise_id: this.enterpriseId,
      content: chunk.content,
      chunk_index: chunk.index,
      total_chunks: chunkResult.totalChunks,
      token_count: chunk.tokenCount,
      embedding: `[${embeddingResult.embeddings[i].join(',')}]`, // Format for pgvector
      metadata: {
        ...chunk.metadata,
        title: options.title,
      },
    }));

    // Batch insert
    const { error } = await this.supabase
      .from('document_chunks')
      .insert(chunkRecords);

    if (error) {
      throw new Error(`Failed to store chunks: ${error.message}`);
    }

    return {
      documentId: options.documentId,
      contractId: options.contractId,
      chunksCreated: chunkResult.totalChunks,
      embeddingsGenerated: embeddingResult.embeddings.length,
      totalTokens: embeddingResult.totalTokens,
      cost: embeddingResult.cost,
    };
  }

  /**
   * Query the RAG system with a question
   */
  async query(
    question: string,
    options: RAGOptions & {
      systemPrompt?: string;
      contractId?: string;
      documentId?: string;
    } = {},
  ): Promise<RAGResult> {
    const {
      topK = 5,
      similarityThreshold = 0.7,
      hybridSearch = true,
      semanticWeight = 0.7,
      includeCitations = true,
      maxContextTokens = 4000,
    } = options;

    // Generate embedding for the question
    const queryEmbedding = await this.embeddingService.embed(question);

    // Retrieve relevant chunks
    const chunks = await this.retrieve(
      queryEmbedding.embedding,
      {
        topK: topK * 2, // Retrieve more for re-ranking
        threshold: similarityThreshold,
        contractId: options.contractId,
        documentId: options.documentId,
        hybridQuery: hybridSearch ? question : undefined,
        semanticWeight,
      },
    );

    // Build context from chunks (respecting token limit)
    const { context, selectedChunks, tokenCount } = this.buildContext(
      chunks,
      maxContextTokens,
      topK,
    );

    // Generate answer with Claude
    const systemPrompt = options.systemPrompt || this.buildRAGSystemPrompt(includeCitations);
    const userPrompt = this.buildRAGUserPrompt(question, context, includeCitations);

    const response = await this.claudeClient.chat(
      [{ role: 'user', content: userPrompt }],
      {
        system: systemPrompt,
        temperature: 0.3,
        maxTokens: 2000,
      },
    );

    // Extract answer text
    const textContent = response.content.find(b => b.type === 'text');
    const answer = textContent?.type === 'text' ? textContent.text || '' : '';

    // Parse citations from answer if included
    const citations = includeCitations
      ? this.extractCitations(answer, selectedChunks)
      : [];

    // Track cost
    const tracker = getCostTracker(this.supabase, this.enterpriseId);
    const { cost } = await tracker.recordUsage(
      response.model,
      response.usage.inputTokens,
      response.usage.outputTokens,
      'rag_query',
      { contractId: options.contractId, documentId: options.documentId },
    );

    return {
      answer: this.cleanAnswer(answer),
      retrievedChunks: selectedChunks,
      citations,
      usage: {
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        embeddingTokens: queryEmbedding.tokenCount,
        totalCost: cost + this.embeddingService.calculateCost('text-embedding-3-small', queryEmbedding.tokenCount),
      },
      metadata: {
        searchType: hybridSearch ? 'hybrid' : 'semantic',
        chunksRetrieved: selectedChunks.length,
        contextTokens: tokenCount,
      },
    };
  }

  /**
   * Search for relevant chunks without generating an answer
   */
  async search(
    query: string,
    options: {
      topK?: number;
      threshold?: number;
      contractId?: string;
      documentId?: string;
      hybridSearch?: boolean;
    } = {},
  ): Promise<RetrievedChunk[]> {
    const queryEmbedding = await this.embeddingService.embed(query);

    return this.retrieve(queryEmbedding.embedding, {
      topK: options.topK || 10,
      threshold: options.threshold || 0.6,
      contractId: options.contractId,
      documentId: options.documentId,
      hybridQuery: options.hybridSearch ? query : undefined,
    });
  }

  /**
   * Delete all chunks for a document or contract
   */
  async deleteChunks(options: {
    documentId?: string;
    contractId?: string;
  }): Promise<number> {
    let query = this.supabase
      .from('document_chunks')
      .delete()
      .eq('enterprise_id', this.enterpriseId);

    if (options.documentId) {
      query = query.eq('document_id', options.documentId);
    }

    if (options.contractId) {
      query = query.eq('contract_id', options.contractId);
    }

    const { data, error } = await query.select('id');

    if (error) {
      throw new Error(`Failed to delete chunks: ${error.message}`);
    }

    return data?.length || 0;
  }

  // ==================== Private Methods ====================

  private async retrieve(
    queryEmbedding: number[],
    options: {
      topK: number;
      threshold: number;
      contractId?: string;
      documentId?: string;
      hybridQuery?: string;
      semanticWeight?: number;
    },
  ): Promise<RetrievedChunk[]> {
    // Semantic search using pgvector
    const { data: semanticResults, error } = await this.supabase.rpc(
      'search_document_chunks',
      {
        p_enterprise_id: this.enterpriseId,
        p_query_embedding: `[${queryEmbedding.join(',')}]`,
        p_match_threshold: options.threshold,
        p_match_count: options.topK,
        p_contract_id: options.contractId || null,
        p_document_id: options.documentId || null,
      },
    );

    if (error) {
      throw new Error(`Semantic search failed: ${error.message}`);
    }

    let chunks = (semanticResults || []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      content: r.content as string,
      similarity: r.similarity as number,
      metadata: {
        documentId: r.document_id as string | undefined,
        contractId: r.contract_id as string | undefined,
        section: (r.metadata as Record<string, unknown>)?.section as string | undefined,
        chunkIndex: r.chunk_index as number,
      },
    }));

    // Hybrid search: combine with keyword search
    if (options.hybridQuery) {
      const keywordResults = await this.keywordSearch(
        options.hybridQuery,
        options.topK,
        options.contractId,
        options.documentId,
      );

      chunks = this.mergeResults(
        chunks,
        keywordResults,
        options.semanticWeight || 0.7,
        options.topK,
      );
    }

    return chunks.slice(0, options.topK);
  }

  private async keywordSearch(
    query: string,
    topK: number,
    contractId?: string,
    documentId?: string,
  ): Promise<RetrievedChunk[]> {
    // Extract keywords
    const keywords = query
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 2)
      .slice(0, 10);

    if (keywords.length === 0) {
      return [];
    }

    // Build search query
    let dbQuery = this.supabase
      .from('document_chunks')
      .select('id, content, document_id, contract_id, chunk_index, metadata')
      .eq('enterprise_id', this.enterpriseId);

    if (contractId) {
      dbQuery = dbQuery.eq('contract_id', contractId);
    }

    if (documentId) {
      dbQuery = dbQuery.eq('document_id', documentId);
    }

    // Full-text search using content
    const searchPattern = keywords.join(' | ');
    dbQuery = dbQuery.textSearch('content', searchPattern, { type: 'websearch' });

    const { data, error } = await dbQuery.limit(topK);

    if (error) {
      // Fallback to ILIKE if full-text search fails
      const ilikPattern = `%${keywords[0]}%`;
      const { data: fallbackData } = await this.supabase
        .from('document_chunks')
        .select('id, content, document_id, contract_id, chunk_index, metadata')
        .eq('enterprise_id', this.enterpriseId)
        .ilike('content', ilikPattern)
        .limit(topK);

      return (fallbackData || []).map(r => ({
        id: r.id,
        content: r.content,
        similarity: 0.5, // Default score for keyword match
        metadata: {
          documentId: r.document_id,
          contractId: r.contract_id,
          section: r.metadata?.section,
          chunkIndex: r.chunk_index,
        },
      }));
    }

    return (data || []).map(r => ({
      id: r.id,
      content: r.content,
      similarity: 0.6, // Base score for keyword match
      metadata: {
        documentId: r.document_id,
        contractId: r.contract_id,
        section: r.metadata?.section,
        chunkIndex: r.chunk_index,
      },
    }));
  }

  private mergeResults(
    semantic: RetrievedChunk[],
    keyword: RetrievedChunk[],
    semanticWeight: number,
    topK: number,
  ): RetrievedChunk[] {
    const scoreMap = new Map<string, { chunk: RetrievedChunk; score: number }>();

    // Add semantic results
    for (const chunk of semantic) {
      scoreMap.set(chunk.id, {
        chunk,
        score: chunk.similarity * semanticWeight,
      });
    }

    // Merge keyword results
    const keywordWeight = 1 - semanticWeight;
    for (const chunk of keyword) {
      const existing = scoreMap.get(chunk.id);
      if (existing) {
        existing.score += chunk.similarity * keywordWeight;
      } else {
        scoreMap.set(chunk.id, {
          chunk,
          score: chunk.similarity * keywordWeight,
        });
      }
    }

    // Sort by combined score
    const merged = Array.from(scoreMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(({ chunk, score }) => ({
        ...chunk,
        similarity: score,
      }));

    return merged;
  }

  private buildContext(
    chunks: RetrievedChunk[],
    maxTokens: number,
    maxChunks: number,
  ): { context: string; selectedChunks: RetrievedChunk[]; tokenCount: number } {
    const selected: RetrievedChunk[] = [];
    let totalTokens = 0;

    for (const chunk of chunks) {
      // Estimate chunk tokens
      const chunkTokens = Math.ceil(chunk.content.length / 4);

      if (totalTokens + chunkTokens > maxTokens || selected.length >= maxChunks) {
        break;
      }

      selected.push(chunk);
      totalTokens += chunkTokens;
    }

    const context = selected
      .map((chunk, i) => `[Source ${i + 1}]\n${chunk.content}`)
      .join('\n\n---\n\n');

    return { context, selectedChunks: selected, tokenCount: totalTokens };
  }

  private buildRAGSystemPrompt(includeCitations: boolean): string {
    const base = `You are a helpful assistant that answers questions based on the provided context documents.

Your task:
1. Analyze the provided source documents carefully
2. Answer the question using ONLY information from the sources
3. If the sources don't contain enough information, say so clearly
4. Be precise and factual`;

    if (includeCitations) {
      return base + `
5. When you use information from a source, cite it using [Source N] format
6. Place citations immediately after the relevant information`;
    }

    return base;
  }

  private buildRAGUserPrompt(question: string, context: string, includeCitations: boolean): string {
    const citationInstruction = includeCitations
      ? '\n\nRemember to cite your sources using [Source N] format.'
      : '';

    return `Context documents:

${context}

---

Question: ${question}${citationInstruction}

Answer:`;
  }

  private extractCitations(answer: string, chunks: RetrievedChunk[]): Citation[] {
    const citations: Citation[] = [];
    const citationPattern = /\[Source (\d+)\]/g;
    const matches = answer.matchAll(citationPattern);

    const seenSources = new Set<number>();

    for (const match of matches) {
      const sourceNum = parseInt(match[1]) - 1;
      if (sourceNum >= 0 && sourceNum < chunks.length && !seenSources.has(sourceNum)) {
        seenSources.add(sourceNum);
        const chunk = chunks[sourceNum];
        citations.push({
          id: chunk.id,
          text: chunk.content.substring(0, 200) + (chunk.content.length > 200 ? '...' : ''),
          source: {
            documentId: chunk.metadata.documentId,
            contractId: chunk.metadata.contractId,
            section: chunk.metadata.section,
          },
          relevance: chunk.similarity,
        });
      }
    }

    return citations;
  }

  private cleanAnswer(answer: string): string {
    return answer
      .replace(/^(Answer:|Response:)\s*/i, '')
      .trim();
  }
}

// ==================== Factory Functions ====================

export function createRAGPipeline(
  supabase: SupabaseClient,
  enterpriseId: string,
  documentType?: 'contract' | 'general',
): RAGPipeline {
  return new RAGPipeline(supabase, enterpriseId, { documentType });
}

/**
 * Quick RAG query function
 */
export async function ragQuery(
  supabase: SupabaseClient,
  enterpriseId: string,
  question: string,
  options?: RAGOptions & { contractId?: string; documentId?: string },
): Promise<RAGResult> {
  const pipeline = createRAGPipeline(supabase, enterpriseId);
  return pipeline.query(question, options);
}
