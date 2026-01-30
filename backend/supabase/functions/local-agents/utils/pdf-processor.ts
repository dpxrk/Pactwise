/**
 * PDF Processing Utility for Secretary Agent OCR
 *
 * Provides real PDF text extraction using pdf-parse library
 * with comprehensive confidence scoring and error handling.
 */

// Note: In Deno/Supabase Edge Functions, we use dynamic imports
// pdf-parse will be imported dynamically when needed

// =============================================================================
// TYPES
// =============================================================================

/**
 * Result of PDF text extraction
 */
export interface PdfExtractionResult {
  /** Extracted text content */
  text: string;
  /** Confidence score (0.0 - 1.0) */
  confidence: number;
  /** Quality score (0.0 - 1.0) */
  quality: number;
  /** Number of pages in the PDF */
  pageCount: number;
  /** Word count in extracted text */
  wordCount: number;
  /** Character count */
  charCount: number;
  /** Detected language (ISO 639-1 code) */
  language: string;
  /** Whether tables were detected */
  hasTables: boolean;
  /** Whether signatures were detected */
  hasSignatures: boolean;
  /** Whether the PDF appears to be scanned (image-based) */
  isScanned: boolean;
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Any warnings during extraction */
  warnings: string[];
  /** PDF metadata if available */
  metadata: PdfMetadata;
}

/**
 * PDF metadata from the document
 */
export interface PdfMetadata {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modificationDate?: string;
  isEncrypted: boolean;
  pageLayout?: string;
}

/**
 * Options for PDF processing
 */
export interface PdfProcessingOptions {
  /** Maximum pages to process (0 = all) */
  maxPages?: number;
  /** Minimum confidence threshold to accept result */
  minConfidence?: number;
  /** Whether to attempt table detection */
  detectTables?: boolean;
  /** Whether to attempt signature detection */
  detectSignatures?: boolean;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Language hint for better extraction */
  languageHint?: string;
}

/**
 * Raw result from pdf-parse library
 */
interface PdfParseResult {
  numpages: number;
  numrender: number;
  info: {
    Title?: string;
    Author?: string;
    Subject?: string;
    Creator?: string;
    Producer?: string;
    CreationDate?: string;
    ModDate?: string;
    IsAcroFormPresent?: boolean;
    IsXFAPresent?: boolean;
    [key: string]: unknown;
  };
  metadata: {
    _metadata?: Record<string, unknown>;
  } | null;
  text: string;
  version: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default processing options */
const DEFAULT_OPTIONS: Required<PdfProcessingOptions> = {
  maxPages: 0,
  minConfidence: 0.1,
  detectTables: true,
  detectSignatures: true,
  timeout: 60000,
  languageHint: 'en',
};

/** Confidence scoring thresholds */
const CONFIDENCE_THRESHOLDS = {
  /** Native PDF with clean, substantial text */
  NATIVE_CLEAN: 0.95,
  /** Native PDF with some issues */
  NATIVE_ISSUES: 0.75,
  /** Very short extraction */
  SHORT_TEXT: 0.50,
  /** Minimal extraction */
  MINIMAL: 0.30,
  /** Empty or failed extraction */
  EMPTY: 0.10,
  /** Scanned document (image-based) */
  SCANNED: 0.05,
};

/** Minimum characters for meaningful extraction */
const MIN_MEANINGFUL_CHARS = 100;

/** Characters per page estimate for native PDFs */
const CHARS_PER_PAGE_ESTIMATE = 3000;

// =============================================================================
// PDF PROCESSOR CLASS
// =============================================================================

/**
 * PDF Processor for text extraction
 *
 * Handles:
 * - Native PDF text extraction using pdf-parse
 * - Confidence scoring based on extraction quality
 * - Scanned PDF detection
 * - Table and signature detection
 * - Language detection
 */
export class PdfProcessor {
  private options: Required<PdfProcessingOptions>;

  constructor(options: PdfProcessingOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Extract text from a PDF buffer
   *
   * @param pdfBuffer - PDF file as Uint8Array or ArrayBuffer
   * @returns Extraction result with text, confidence, and metadata
   */
  async extractText(pdfBuffer: Uint8Array | ArrayBuffer): Promise<PdfExtractionResult> {
    const startTime = Date.now();
    const warnings: string[] = [];

    // Convert to Buffer if needed
    const buffer = pdfBuffer instanceof Uint8Array
      ? pdfBuffer
      : new Uint8Array(pdfBuffer);

    // Validate PDF signature
    if (!this.isValidPdf(buffer)) {
      return this.createEmptyResult(startTime, ['Invalid PDF file: missing PDF signature']);
    }

    try {
      // Dynamically import pdf-parse for Deno compatibility
      // In Supabase Edge Functions, use npm: specifier
      const pdfParse = await this.loadPdfParse();

      // Parse PDF with timeout
      const parseResult = await this.parseWithTimeout(pdfParse, buffer);

      // Process the result
      return this.processParseResult(parseResult, startTime, warnings);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      warnings.push(`PDF parsing error: ${errorMessage}`);

      // Check if it might be a scanned PDF
      if (this.mightBeScannedPdf(errorMessage)) {
        warnings.push('Document appears to be a scanned PDF (image-based). Text extraction requires OCR.');
        return this.createScannedPdfResult(startTime, warnings);
      }

      // Check for encryption
      if (this.isEncryptionError(errorMessage)) {
        warnings.push('PDF is encrypted or password-protected.');
        return this.createEncryptedPdfResult(startTime, warnings);
      }

      return this.createErrorResult(startTime, warnings, errorMessage);
    }
  }

  /**
   * Extract text from a PDF file fetched from a URL
   */
  async extractTextFromUrl(url: string): Promise<PdfExtractionResult> {
    const startTime = Date.now();
    const warnings: string[] = [];

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.options.timeout),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.includes('pdf') && !contentType.includes('octet-stream')) {
        warnings.push(`Unexpected content type: ${contentType}`);
      }

      const buffer = await response.arrayBuffer();
      return this.extractText(buffer);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      warnings.push(`URL fetch error: ${errorMessage}`);
      return this.createErrorResult(startTime, warnings, errorMessage);
    }
  }

  /**
   * Load pdf-parse library dynamically
   */
  private async loadPdfParse(): Promise<(buffer: Uint8Array) => Promise<PdfParseResult>> {
    try {
      // Try npm: specifier for Deno/Supabase Edge Functions
      // @ts-ignore - Dynamic import with npm specifier
      const pdfParse = await import('npm:pdf-parse@1.1.1');
      return pdfParse.default || pdfParse;
    } catch {
      try {
        // Fallback to regular import (for Node.js environments)
        // @ts-ignore - Dynamic import
        const pdfParse = await import('pdf-parse');
        return pdfParse.default || pdfParse;
      } catch {
        throw new Error(
          'pdf-parse library not available. Install with: npm install pdf-parse'
        );
      }
    }
  }

  /**
   * Parse PDF with timeout protection
   */
  private async parseWithTimeout(
    pdfParse: (buffer: Uint8Array) => Promise<PdfParseResult>,
    buffer: Uint8Array,
  ): Promise<PdfParseResult> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`PDF parsing timed out after ${this.options.timeout}ms`));
      }, this.options.timeout);

      pdfParse(buffer)
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Process the raw pdf-parse result into our structured format
   */
  private processParseResult(
    parseResult: PdfParseResult,
    startTime: number,
    warnings: string[],
  ): PdfExtractionResult {
    const text = this.cleanText(parseResult.text);
    const wordCount = this.countWords(text);
    const charCount = text.length;
    const pageCount = parseResult.numpages || 1;

    // Determine if this is a scanned PDF (image-based)
    const isScanned = this.detectScannedPdf(text, pageCount);
    if (isScanned) {
      warnings.push('Document appears to be scanned. Text extraction may be incomplete.');
    }

    // Calculate confidence
    const confidence = this.calculateConfidence(text, pageCount, isScanned, warnings);

    // Calculate quality score
    const quality = this.calculateQuality(text, pageCount, confidence);

    // Detect features
    const hasTables = this.options.detectTables && this.detectTables(text);
    const hasSignatures = this.options.detectSignatures && this.detectSignatures(text);

    // Detect language
    const language = this.detectLanguage(text);

    // Extract metadata
    const metadata = this.extractMetadata(parseResult);

    return {
      text,
      confidence,
      quality,
      pageCount,
      wordCount,
      charCount,
      language,
      hasTables,
      hasSignatures,
      isScanned,
      processingTimeMs: Date.now() - startTime,
      warnings,
      metadata,
    };
  }

  /**
   * Calculate confidence score based on extraction quality
   */
  private calculateConfidence(
    text: string,
    pageCount: number,
    isScanned: boolean,
    warnings: string[],
  ): number {
    // Scanned PDFs have very low confidence without actual OCR
    if (isScanned) {
      return CONFIDENCE_THRESHOLDS.SCANNED;
    }

    const charCount = text.length;

    // Empty extraction
    if (charCount === 0) {
      warnings.push('No text extracted from PDF');
      return CONFIDENCE_THRESHOLDS.EMPTY;
    }

    // Very short extraction (likely issues)
    if (charCount < MIN_MEANINGFUL_CHARS) {
      warnings.push(`Very short extraction: ${charCount} characters`);
      return CONFIDENCE_THRESHOLDS.SHORT_TEXT;
    }

    // Calculate expected characters based on page count
    const expectedChars = pageCount * CHARS_PER_PAGE_ESTIMATE;
    const extractionRatio = charCount / expectedChars;

    // Good extraction ratio indicates native PDF with text
    if (extractionRatio >= 0.5) {
      // Check for quality indicators
      const hasGoodStructure = this.hasGoodTextStructure(text);
      const hasLowArtifacts = this.hasLowArtifactRatio(text);

      if (hasGoodStructure && hasLowArtifacts) {
        return CONFIDENCE_THRESHOLDS.NATIVE_CLEAN;
      } else {
        if (!hasGoodStructure) {
          warnings.push('Text structure appears fragmented');
        }
        if (!hasLowArtifacts) {
          warnings.push('Text contains unusual characters (possible OCR artifacts)');
        }
        return CONFIDENCE_THRESHOLDS.NATIVE_ISSUES;
      }
    }

    // Low extraction ratio - might be partially scanned or have issues
    if (extractionRatio >= 0.1) {
      warnings.push('Partial text extraction - document may contain images');
      return CONFIDENCE_THRESHOLDS.NATIVE_ISSUES * extractionRatio * 2;
    }

    // Very low extraction
    warnings.push('Minimal text extraction - document may be mostly images');
    return CONFIDENCE_THRESHOLDS.MINIMAL;
  }

  /**
   * Calculate quality score
   */
  private calculateQuality(text: string, pageCount: number, confidence: number): number {
    let quality = confidence;

    // Adjust for text characteristics
    const hasGoodParagraphs = /\n\n/.test(text) || /\r\n\r\n/.test(text);
    const hasReasonableLineLength = this.hasReasonableLineLength(text);
    const hasPunctuation = /[.!?;:]/.test(text);

    if (hasGoodParagraphs) quality += 0.02;
    if (hasReasonableLineLength) quality += 0.02;
    if (hasPunctuation) quality += 0.01;

    // Penalize for issues
    const artifactRatio = this.calculateArtifactRatio(text);
    quality -= artifactRatio * 0.2;

    return Math.max(0.0, Math.min(1.0, quality));
  }

  /**
   * Detect if PDF is scanned (image-based)
   */
  private detectScannedPdf(text: string, pageCount: number): boolean {
    if (!text || text.length === 0) {
      return true;
    }

    // Very low text-to-page ratio suggests scanned document
    const charsPerPage = text.length / pageCount;
    if (charsPerPage < 50) {
      return true;
    }

    // High artifact ratio suggests OCR was attempted but failed
    const artifactRatio = this.calculateArtifactRatio(text);
    if (artifactRatio > 0.3) {
      return true;
    }

    return false;
  }

  /**
   * Check if text has good structure (sentences, paragraphs)
   */
  private hasGoodTextStructure(text: string): boolean {
    // Check for sentence-ending punctuation
    const sentenceEndings = (text.match(/[.!?]\s/g) || []).length;
    const words = this.countWords(text);

    // Expect at least 1 sentence per 20 words on average
    return sentenceEndings >= words / 20;
  }

  /**
   * Check if text has low artifact ratio
   */
  private hasLowArtifactRatio(text: string): boolean {
    return this.calculateArtifactRatio(text) < 0.05;
  }

  /**
   * Calculate ratio of non-standard characters
   */
  private calculateArtifactRatio(text: string): number {
    if (!text || text.length === 0) return 0;

    // Count non-printable and unusual characters
    const artifacts = text.match(/[^\x20-\x7E\n\r\t\u00A0-\u00FF]/g) || [];
    return artifacts.length / text.length;
  }

  /**
   * Check if text has reasonable line lengths
   */
  private hasReasonableLineLength(text: string): boolean {
    const lines = text.split(/\n/);
    if (lines.length < 3) return true;

    const avgLength = lines.reduce((sum, line) => sum + line.length, 0) / lines.length;
    return avgLength > 20 && avgLength < 200;
  }

  /**
   * Clean extracted text
   */
  private cleanText(text: string): string {
    if (!text) return '';

    return text
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove null bytes
      .replace(/\0/g, '')
      // Normalize multiple spaces
      .replace(/[ \t]+/g, ' ')
      // Normalize multiple newlines (keep paragraph breaks)
      .replace(/\n{3,}/g, '\n\n')
      // Trim
      .trim();
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    if (!text) return 0;
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Detect tables in text
   */
  private detectTables(text: string): boolean {
    const tablePatterns = [
      /\|.+\|.+\|/,           // Markdown-style tables
      /\t.+\t.+\t/,           // Tab-separated data
      /^\s*\d+\s+\d+\s+\d+/m, // Numeric columns
      /(?:total|amount|qty|quantity).*?\d+/i, // Table-like data
    ];

    return tablePatterns.some(pattern => pattern.test(text));
  }

  /**
   * Detect signatures in text
   */
  private detectSignatures(text: string): boolean {
    const signaturePatterns = [
      /_{10,}/,                    // Underlines for signatures
      /\[signature\]/i,            // Placeholder text
      /\/s\//,                     // Electronic signature indicator
      /sign(ed|ature)?.*?:/i,      // Signature labels
      /executed.*?by/i,            // Legal execution language
      /witness/i,                  // Witness sections
    ];

    return signaturePatterns.some(pattern => pattern.test(text));
  }

  /**
   * Detect language from text
   */
  private detectLanguage(text: string): string {
    if (!text || text.length < 50) {
      return this.options.languageHint || 'en';
    }

    const languagePatterns: Record<string, RegExp> = {
      en: /\b(the|and|of|to|in|is|for|with|that|this|have|from)\b/gi,
      es: /\b(el|la|de|que|y|en|un|por|con|para|los|las)\b/gi,
      fr: /\b(le|la|de|et|à|les|des|en|un|une|pour|dans)\b/gi,
      de: /\b(der|die|und|in|den|von|zu|das|mit|sich|ist)\b/gi,
      pt: /\b(o|a|de|que|e|do|da|em|um|para|com|os)\b/gi,
      it: /\b(il|di|che|e|la|un|in|per|non|con|del)\b/gi,
    };

    const scores: Record<string, number> = {};

    for (const [lang, pattern] of Object.entries(languagePatterns)) {
      const matches = text.match(pattern) || [];
      scores[lang] = matches.length;
    }

    // Find language with highest score
    let maxScore = 0;
    let detectedLang = this.options.languageHint || 'en';

    for (const [lang, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedLang = lang;
      }
    }

    return detectedLang;
  }

  /**
   * Extract metadata from PDF
   */
  private extractMetadata(parseResult: PdfParseResult): PdfMetadata {
    const info = parseResult.info || {};

    return {
      title: info.Title as string | undefined,
      author: info.Author as string | undefined,
      subject: info.Subject as string | undefined,
      creator: info.Creator as string | undefined,
      producer: info.Producer as string | undefined,
      creationDate: this.parseDate(info.CreationDate as string),
      modificationDate: this.parseDate(info.ModDate as string),
      isEncrypted: false, // Would be set if encryption detected
    };
  }

  /**
   * Parse PDF date format to ISO string
   */
  private parseDate(dateStr: string | undefined): string | undefined {
    if (!dateStr) return undefined;

    // PDF date format: D:YYYYMMDDHHmmSS+HH'mm'
    const match = dateStr.match(/D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/);
    if (match) {
      const [, year, month, day, hour = '00', min = '00', sec = '00'] = match;
      return `${year}-${month}-${day}T${hour}:${min}:${sec}Z`;
    }

    // Try parsing as regular date
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch {
      // Ignore parsing errors
    }

    return undefined;
  }

  /**
   * Check if buffer is a valid PDF (has PDF signature)
   */
  private isValidPdf(buffer: Uint8Array): boolean {
    // PDF files start with %PDF-
    if (buffer.length < 5) return false;

    const signature = String.fromCharCode(...buffer.slice(0, 5));
    return signature === '%PDF-';
  }

  /**
   * Check if error indicates scanned PDF
   */
  private mightBeScannedPdf(errorMessage: string): boolean {
    const scannedIndicators = [
      'no text',
      'empty',
      'image',
      'scan',
      'ocr required',
    ];

    const lowerError = errorMessage.toLowerCase();
    return scannedIndicators.some(indicator => lowerError.includes(indicator));
  }

  /**
   * Check if error indicates encryption
   */
  private isEncryptionError(errorMessage: string): boolean {
    const encryptionIndicators = [
      'encrypt',
      'password',
      'protected',
      'permission',
      'decrypt',
    ];

    const lowerError = errorMessage.toLowerCase();
    return encryptionIndicators.some(indicator => lowerError.includes(indicator));
  }

  /**
   * Create empty result for failed extraction
   */
  private createEmptyResult(startTime: number, warnings: string[]): PdfExtractionResult {
    return {
      text: '',
      confidence: CONFIDENCE_THRESHOLDS.EMPTY,
      quality: 0,
      pageCount: 0,
      wordCount: 0,
      charCount: 0,
      language: this.options.languageHint || 'en',
      hasTables: false,
      hasSignatures: false,
      isScanned: false,
      processingTimeMs: Date.now() - startTime,
      warnings,
      metadata: { isEncrypted: false },
    };
  }

  /**
   * Create result for scanned PDF
   */
  private createScannedPdfResult(startTime: number, warnings: string[]): PdfExtractionResult {
    return {
      text: '',
      confidence: CONFIDENCE_THRESHOLDS.SCANNED,
      quality: 0,
      pageCount: 0,
      wordCount: 0,
      charCount: 0,
      language: this.options.languageHint || 'en',
      hasTables: false,
      hasSignatures: false,
      isScanned: true,
      processingTimeMs: Date.now() - startTime,
      warnings,
      metadata: { isEncrypted: false },
    };
  }

  /**
   * Create result for encrypted PDF
   */
  private createEncryptedPdfResult(startTime: number, warnings: string[]): PdfExtractionResult {
    return {
      text: '',
      confidence: 0,
      quality: 0,
      pageCount: 0,
      wordCount: 0,
      charCount: 0,
      language: this.options.languageHint || 'en',
      hasTables: false,
      hasSignatures: false,
      isScanned: false,
      processingTimeMs: Date.now() - startTime,
      warnings,
      metadata: { isEncrypted: true },
    };
  }

  /**
   * Create result for error case
   */
  private createErrorResult(
    startTime: number,
    warnings: string[],
    _errorMessage: string,
  ): PdfExtractionResult {
    return {
      text: '',
      confidence: 0,
      quality: 0,
      pageCount: 0,
      wordCount: 0,
      charCount: 0,
      language: this.options.languageHint || 'en',
      hasTables: false,
      hasSignatures: false,
      isScanned: false,
      processingTimeMs: Date.now() - startTime,
      warnings,
      metadata: { isEncrypted: false },
    };
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Extract text from a PDF buffer using default options
 */
export async function extractTextFromPdf(
  pdfBuffer: Uint8Array | ArrayBuffer,
  options?: PdfProcessingOptions,
): Promise<PdfExtractionResult> {
  const processor = new PdfProcessor(options);
  return processor.extractText(pdfBuffer);
}

/**
 * Extract text from a PDF URL using default options
 */
export async function extractTextFromPdfUrl(
  url: string,
  options?: PdfProcessingOptions,
): Promise<PdfExtractionResult> {
  const processor = new PdfProcessor(options);
  return processor.extractTextFromUrl(url);
}

/**
 * Check if a buffer is a valid PDF
 */
export function isValidPdfBuffer(buffer: Uint8Array | ArrayBuffer): boolean {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.length < 5) return false;
  const signature = String.fromCharCode(...bytes.slice(0, 5));
  return signature === '%PDF-';
}

/**
 * Get confidence level label for a confidence score
 */
export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' | 'very_low' | 'failed' {
  if (confidence >= 0.9) return 'high';
  if (confidence >= 0.7) return 'medium';
  if (confidence >= 0.4) return 'low';
  if (confidence > 0) return 'very_low';
  return 'failed';
}
