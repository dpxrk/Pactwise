/// <reference path="../../../types/global.d.ts" />

/**
 * Document Chunking Utility
 *
 * Splits documents into optimized chunks for RAG:
 * - Smart boundary detection (sentences, paragraphs)
 * - Configurable overlap for context preservation
 * - Token-aware splitting
 * - Metadata preservation
 */

// ==================== Types ====================

export interface ChunkOptions {
  /** Maximum tokens per chunk (default: 500) */
  maxTokens?: number;
  /** Overlap tokens between chunks (default: 50) */
  overlapTokens?: number;
  /** Preserve section boundaries (default: true) */
  preserveSections?: boolean;
  /** Include metadata in chunks (default: true) */
  includeMetadata?: boolean;
  /** Document type for specialized parsing */
  documentType?: 'contract' | 'legal' | 'general';
}

export interface Chunk {
  content: string;
  index: number;
  tokenCount: number;
  metadata: ChunkMetadata;
}

export interface ChunkMetadata {
  startChar: number;
  endChar: number;
  section?: string;
  pageNumber?: number;
  headings?: string[];
  containsTable?: boolean;
  containsList?: boolean;
}

export interface ChunkResult {
  chunks: Chunk[];
  totalChunks: number;
  totalTokens: number;
  averageTokensPerChunk: number;
  documentMetadata: {
    title?: string;
    sections?: string[];
    estimatedPages?: number;
  };
}

// ==================== Token Estimation ====================

/**
 * Estimate token count for text
 * Uses a conservative estimate of ~4 characters per token for English
 */
export function estimateTokens(text: string): number {
  // More accurate estimation based on common patterns
  const words = text.split(/\s+/).filter(Boolean);
  const avgCharsPerWord = text.length / Math.max(words.length, 1);

  // Adjust for punctuation and special characters
  const punctuationCount = (text.match(/[.,!?;:'"()\[\]{}]/g) || []).length;
  const numberCount = (text.match(/\d+/g) || []).length;

  // Base estimate: ~0.75 tokens per word + punctuation
  const estimate = Math.ceil(words.length * 0.75 + punctuationCount * 0.5 + numberCount * 0.5);

  // Apply bounds
  return Math.max(1, Math.min(estimate, Math.ceil(text.length / 2)));
}

// ==================== Text Splitting ====================

/**
 * Split text on sentence boundaries
 */
function splitOnSentences(text: string): string[] {
  // Handle common abbreviations that shouldn't split
  const protectedText = text
    .replace(/Mr\./g, 'Mr\u0001')
    .replace(/Mrs\./g, 'Mrs\u0001')
    .replace(/Ms\./g, 'Ms\u0001')
    .replace(/Dr\./g, 'Dr\u0001')
    .replace(/Prof\./g, 'Prof\u0001')
    .replace(/Inc\./g, 'Inc\u0001')
    .replace(/Ltd\./g, 'Ltd\u0001')
    .replace(/Corp\./g, 'Corp\u0001')
    .replace(/e\.g\./g, 'e\u0001g\u0001')
    .replace(/i\.e\./g, 'i\u0001e\u0001')
    .replace(/U\.S\./g, 'U\u0001S\u0001')
    .replace(/(\d+)\./g, '$1\u0001');

  // Split on sentence endings
  const sentences = protectedText.split(/(?<=[.!?])\s+/);

  // Restore protected periods
  return sentences.map(s => s.replace(/\u0001/g, '.'));
}

/**
 * Split text on paragraph boundaries
 */
function splitOnParagraphs(text: string): string[] {
  return text.split(/\n\s*\n/).filter(Boolean);
}

/**
 * Detect section headers in text
 */
function detectSections(text: string): string[] {
  const sections: string[] = [];

  // Common section header patterns
  const patterns = [
    /^#{1,6}\s+(.+)$/gm, // Markdown headers
    /^(?:ARTICLE|SECTION|CLAUSE)\s+\d+[.:]\s*(.+)/gim, // Legal sections
    /^(?:\d+\.)+\s+(.+)/gm, // Numbered sections
    /^[A-Z][A-Z\s]+$/gm, // ALL CAPS headers
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      sections.push(match[1] || match[0].trim());
    }
  }

  return [...new Set(sections)];
}

/**
 * Find the current section for a position in text
 */
function findCurrentSection(text: string, position: number): string | undefined {
  const beforeText = text.substring(0, position);
  const lines = beforeText.split('\n');

  // Search backwards for section header
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();

    // Check for section patterns
    if (/^#{1,6}\s+/.test(line)) {
      return line.replace(/^#+\s+/, '');
    }
    if (/^(?:ARTICLE|SECTION|CLAUSE)\s+\d+/i.test(line)) {
      return line;
    }
    if (/^[A-Z][A-Z\s]{2,}$/.test(line) && line.length < 100) {
      return line;
    }
  }

  return undefined;
}

// ==================== Document Chunker ====================

export class DocumentChunker {
  private options: Required<ChunkOptions>;

  constructor(options: ChunkOptions = {}) {
    this.options = {
      maxTokens: options.maxTokens || 500,
      overlapTokens: options.overlapTokens || 50,
      preserveSections: options.preserveSections ?? true,
      includeMetadata: options.includeMetadata ?? true,
      documentType: options.documentType || 'general',
    };
  }

  /**
   * Chunk a document into optimized pieces
   */
  chunk(text: string): ChunkResult {
    const cleanText = this.preprocess(text);
    const chunks: Chunk[] = [];
    let currentChunk = '';
    let currentStartChar = 0;
    let chunkIndex = 0;

    // Split strategy based on document type
    const segments = this.options.preserveSections
      ? this.splitPreservingSections(cleanText)
      : splitOnParagraphs(cleanText);

    for (const segment of segments) {
      const segmentTokens = estimateTokens(segment);

      // If single segment exceeds max, split it further
      if (segmentTokens > this.options.maxTokens) {
        // Flush current chunk first
        if (currentChunk) {
          chunks.push(this.createChunk(currentChunk, chunkIndex++, currentStartChar, cleanText));
          currentStartChar = cleanText.indexOf(currentChunk, currentStartChar) + currentChunk.length;
          currentChunk = '';
        }

        // Split large segment on sentences
        const subChunks = this.splitLargeSegment(segment, currentStartChar, cleanText);
        for (const subChunk of subChunks) {
          chunks.push({ ...subChunk, index: chunkIndex++ });
        }
        currentStartChar = currentStartChar + segment.length;
        continue;
      }

      const combinedTokens = estimateTokens(currentChunk + '\n\n' + segment);

      if (combinedTokens <= this.options.maxTokens) {
        // Add to current chunk
        currentChunk = currentChunk ? currentChunk + '\n\n' + segment : segment;
      } else {
        // Flush current chunk and start new one
        if (currentChunk) {
          chunks.push(this.createChunk(currentChunk, chunkIndex++, currentStartChar, cleanText));
          currentStartChar = cleanText.indexOf(currentChunk, currentStartChar) + currentChunk.length;
        }

        // Start new chunk with overlap
        if (chunks.length > 0 && this.options.overlapTokens > 0) {
          currentChunk = this.getOverlapText(chunks[chunks.length - 1].content) + '\n\n' + segment;
        } else {
          currentChunk = segment;
        }
      }
    }

    // Flush remaining content
    if (currentChunk.trim()) {
      chunks.push(this.createChunk(currentChunk, chunkIndex, currentStartChar, cleanText));
    }

    // Calculate statistics
    const totalTokens = chunks.reduce((sum, c) => sum + c.tokenCount, 0);

    return {
      chunks,
      totalChunks: chunks.length,
      totalTokens,
      averageTokensPerChunk: chunks.length > 0 ? Math.round(totalTokens / chunks.length) : 0,
      documentMetadata: {
        sections: detectSections(cleanText),
        estimatedPages: Math.ceil(cleanText.length / 3000), // ~3000 chars per page
      },
    };
  }

  /**
   * Chunk with specific context for contracts
   */
  chunkContract(text: string, contractTitle?: string): ChunkResult {
    const result = this.chunk(text);

    // Add contract-specific metadata
    if (contractTitle) {
      result.documentMetadata.title = contractTitle;
    }

    // Identify key contract sections
    const contractSections = [
      'Definitions',
      'Term',
      'Payment',
      'Termination',
      'Indemnification',
      'Limitation of Liability',
      'Confidentiality',
      'Intellectual Property',
      'Governing Law',
      'Dispute Resolution',
    ];

    const foundSections: string[] = [];
    for (const chunk of result.chunks) {
      for (const section of contractSections) {
        if (chunk.content.toLowerCase().includes(section.toLowerCase())) {
          foundSections.push(section);
          chunk.metadata.section = section;
        }
      }
    }

    result.documentMetadata.sections = [...new Set(foundSections)];

    return result;
  }

  // ==================== Private Methods ====================

  private preprocess(text: string): string {
    return text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\t/g, '    ') // Convert tabs to spaces
      .replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines
      .replace(/[ ]{2,}/g, ' ') // Collapse multiple spaces
      .trim();
  }

  private splitPreservingSections(text: string): string[] {
    const segments: string[] = [];
    const paragraphs = splitOnParagraphs(text);
    let currentSegment = '';
    let currentSection = '';

    for (const para of paragraphs) {
      const paraSection = findCurrentSection(text, text.indexOf(para)) || '';

      if (paraSection !== currentSection && currentSegment) {
        segments.push(currentSegment.trim());
        currentSegment = '';
      }

      currentSection = paraSection;
      currentSegment = currentSegment ? currentSegment + '\n\n' + para : para;
    }

    if (currentSegment.trim()) {
      segments.push(currentSegment.trim());
    }

    return segments;
  }

  private splitLargeSegment(segment: string, startChar: number, fullText: string): Chunk[] {
    const chunks: Chunk[] = [];
    const sentences = splitOnSentences(segment);
    let currentChunk = '';
    let localStartChar = startChar;

    for (const sentence of sentences) {
      const combined = currentChunk + (currentChunk ? ' ' : '') + sentence;

      if (estimateTokens(combined) <= this.options.maxTokens) {
        currentChunk = combined;
      } else {
        if (currentChunk) {
          chunks.push(this.createChunk(currentChunk, 0, localStartChar, fullText));
          localStartChar += currentChunk.length;
        }
        currentChunk = sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(this.createChunk(currentChunk, 0, localStartChar, fullText));
    }

    return chunks;
  }

  private createChunk(content: string, index: number, startChar: number, fullText: string): Chunk {
    const tokenCount = estimateTokens(content);

    const metadata: ChunkMetadata = {
      startChar,
      endChar: startChar + content.length,
    };

    if (this.options.includeMetadata) {
      metadata.section = findCurrentSection(fullText, startChar);
      metadata.containsTable = content.includes('|') && content.includes('\n|');
      metadata.containsList = /^[\s]*[-*]\s/m.test(content) || /^\s*\d+\.\s/m.test(content);
    }

    return {
      content: content.trim(),
      index,
      tokenCount,
      metadata,
    };
  }

  private getOverlapText(previousContent: string): string {
    const sentences = splitOnSentences(previousContent);
    let overlapText = '';
    let tokens = 0;

    // Take sentences from the end until we reach overlap target
    for (let i = sentences.length - 1; i >= 0 && tokens < this.options.overlapTokens; i--) {
      const sentenceTokens = estimateTokens(sentences[i]);
      overlapText = sentences[i] + (overlapText ? ' ' + overlapText : '');
      tokens += sentenceTokens;
    }

    return overlapText.trim();
  }
}

// ==================== Factory Functions ====================

/**
 * Create a chunker for contracts
 */
export function createContractChunker(options?: Partial<ChunkOptions>): DocumentChunker {
  return new DocumentChunker({
    maxTokens: 500,
    overlapTokens: 50,
    preserveSections: true,
    includeMetadata: true,
    documentType: 'contract',
    ...options,
  });
}

/**
 * Create a chunker for general documents
 */
export function createDocumentChunker(options?: Partial<ChunkOptions>): DocumentChunker {
  return new DocumentChunker({
    maxTokens: 500,
    overlapTokens: 50,
    preserveSections: true,
    includeMetadata: true,
    documentType: 'general',
    ...options,
  });
}

/**
 * Quick chunk function for simple use cases
 */
export function chunkText(text: string, options?: ChunkOptions): ChunkResult {
  return new DocumentChunker(options).chunk(text);
}
