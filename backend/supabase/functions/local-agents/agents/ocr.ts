import { BaseAgent, ProcessingResult, Insight, AgentContext } from './base.ts';

// OCR-specific context
interface OcrContext extends AgentContext {
  jobId?: string;
  userId?: string;
  documentId?: string;
}

// Input data interfaces
interface OcrJobData {
  jobId?: string;
  documentIds?: string[];
  documentId?: string;
  options?: OcrOptions;
  filePath?: string;
  fileContent?: Uint8Array;
}

interface OcrOptions {
  language?: string;
  detect_tables?: boolean;
  detect_signatures?: boolean;
  confidence_threshold?: number;
  auto_correct?: boolean;
}

interface OcrJobRecord {
  id: string;
  enterprise_id: string;
  job_name: string;
  document_ids: string[];
  total_documents: number;
  processed_documents: number;
  ocr_options: OcrOptions;
  status: string;
  results: OcrDocumentResult[];
  errors: Array<{document_id: string; error: string}>;
}

interface DocumentRecord {
  id: string;
  file_path: string | null;
  file_type: string;
  extracted_text: string | null;
  metadata: Record<string, unknown> | null;
}

interface OcrDocumentResult {
  document_id: string;
  extracted_text: string;
  confidence: number;
  language: string;
  page_count: number;
  word_count: number;
  has_tables: boolean;
  has_signatures: boolean;
  processing_time_ms: number;
}

interface ExtractedDataReview {
  id: string;
  document_id: string;
  extracted_data: Record<string, unknown>;
  confidence_scores: Record<string, number>;
  entity_highlights: EntityHighlights;
}

interface EntityHighlights {
  parties: Array<{text: string; position: {start: number; end: number}; confidence: number}>;
  dates: Array<{text: string; position: {start: number; end: number}; confidence: number; parsedDate?: string}>;
  amounts: Array<{text: string; position: {start: number; end: number}; confidence: number; value?: number}>;
  clauses: Array<{text: string; position: {start: number; end: number}; type: string; risk_level?: string}>;
  signatures: Array<{position: {start: number; end: number}; type: string}>;
}

export class OcrAgent extends BaseAgent {
  get agentType() {
    return 'ocr';
  }

  get capabilities() {
    return ['text_extraction', 'pdf_parsing', 'image_ocr', 'batch_processing', 'entity_detection', 'confidence_scoring'];
  }

  async process(data: unknown, context?: AgentContext): Promise<ProcessingResult> {
    const rulesApplied: string[] = [];
    const insights: Insight[] = [];
    const ocrContext = context as OcrContext | undefined;
    const ocrData = data as OcrJobData;

    try {
      // Check permissions
      if (ocrContext?.userId) {
        const hasPermission = await this.checkUserPermission(ocrContext.userId, 'user');
        if (!hasPermission) {
          throw new Error('Insufficient permissions for OCR processing');
        }
      }

      // Determine processing mode
      if (ocrData.jobId) {
        return await this.processBatchJob(ocrData.jobId, ocrContext, rulesApplied, insights);
      } else if (ocrData.documentId) {
        return await this.processSingleDocument(ocrData.documentId, ocrData.options, ocrContext, rulesApplied, insights);
      } else if (ocrData.documentIds && ocrData.documentIds.length > 0) {
        return await this.processMultipleDocuments(ocrData.documentIds, ocrData.options, ocrContext, rulesApplied, insights);
      } else {
        throw new Error('No job ID or document IDs provided');
      }

    } catch (error) {
      return this.createResult(
        false,
        undefined,
        insights,
        rulesApplied,
        0,
        { error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  private async processBatchJob(
    jobId: string,
    context: OcrContext | undefined,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult> {
    rulesApplied.push('batch_job_processing');

    // Get job details
    const { data: job } = await this.supabase
      .from('ocr_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('enterprise_id', this.enterpriseId)
      .single();

    if (!job) {
      throw new Error('OCR job not found');
    }

    const jobRecord = job as OcrJobRecord;

    // Update job status to processing
    await this.supabase
      .from('ocr_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    const results: OcrDocumentResult[] = [];
    const errors: Array<{document_id: string; error: string}> = [];
    let totalProcessingTime = 0;

    // Process each document
    for (const documentId of jobRecord.document_ids) {
      try {
        const result = await this.processDocumentOcr(documentId, jobRecord.ocr_options);
        results.push(result);
        totalProcessingTime += result.processing_time_ms;

        // Update job progress
        await this.supabase
          .from('ocr_jobs')
          .update({
            processed_documents: results.length,
            processing_time_ms: totalProcessingTime,
          })
          .eq('id', jobId);

      } catch (error) {
        errors.push({
          document_id: documentId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Update job with final status
    const finalStatus = errors.length === jobRecord.document_ids.length ? 'failed' : 'completed';
    await this.supabase
      .from('ocr_jobs')
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        results,
        errors,
        processing_time_ms: totalProcessingTime,
      })
      .eq('id', jobId);

    // Generate insights
    if (errors.length > 0) {
      insights.push(this.createInsight(
        'ocr_errors',
        'medium',
        'OCR Processing Errors',
        `${errors.length} document(s) failed to process`,
        'Review error details and retry failed documents',
        { errors },
      ));
      rulesApplied.push('error_detection');
    }

    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / (results.length || 1);
    if (avgConfidence < 0.8) {
      insights.push(this.createInsight(
        'low_ocr_confidence',
        'medium',
        'Low OCR Confidence',
        `Average confidence: ${(avgConfidence * 100).toFixed(1)}%`,
        'Review extracted text for accuracy',
        { avgConfidence },
      ));
      rulesApplied.push('confidence_assessment');
    }

    return this.createResult(
      finalStatus === 'completed',
      {
        jobId,
        totalDocuments: jobRecord.total_documents,
        processedDocuments: results.length,
        failedDocuments: errors.length,
        avgConfidence,
        results,
        errors,
      },
      insights,
      rulesApplied,
      avgConfidence,
      { jobId, processingTimeMs: totalProcessingTime },
    );
  }

  private async processSingleDocument(
    documentId: string,
    options: OcrOptions | undefined,
    context: OcrContext | undefined,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult> {
    rulesApplied.push('single_document_ocr');

    const result = await this.processDocumentOcr(documentId, options || {});

    // Generate insights
    if (result.confidence < 0.7) {
      insights.push(this.createInsight(
        'low_confidence_extraction',
        'high',
        'Low Confidence OCR Extraction',
        `Confidence: ${(result.confidence * 100).toFixed(1)}% - Manual review recommended`,
        'Review and correct extracted text',
        { documentId, confidence: result.confidence },
      ));
      rulesApplied.push('low_confidence_detection');
    }

    if (result.has_handwriting) {
      insights.push(this.createInsight(
        'handwriting_detected',
        'medium',
        'Handwriting Detected',
        'Document contains handwritten text which may reduce accuracy',
        'Verify handwritten sections carefully',
        { documentId },
      ));
      rulesApplied.push('handwriting_detection');
    }

    // Store memory if context provided
    if (context?.userId) {
      await this.storeMemory(
        'ocr_processing',
        `Processed document ${documentId}: ${result.word_count} words, ${result.page_count} pages, confidence: ${(result.confidence * 100).toFixed(1)}%`,
        {
          documentId,
          confidence: result.confidence,
          wordCount: result.word_count,
          pageCount: result.page_count,
        },
        0.5,
      );
    }

    return this.createResult(
      true,
      result,
      insights,
      rulesApplied,
      result.confidence,
      { documentId },
    );
  }

  private async processMultipleDocuments(
    documentIds: string[],
    options: OcrOptions | undefined,
    context: OcrContext | undefined,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult> {
    rulesApplied.push('multi_document_ocr');

    const results: OcrDocumentResult[] = [];
    const errors: Array<{document_id: string; error: string}> = [];

    for (const documentId of documentIds) {
      try {
        const result = await this.processDocumentOcr(documentId, options || {});
        results.push(result);
      } catch (error) {
        errors.push({
          document_id: documentId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / (results.length || 1);

    return this.createResult(
      errors.length === 0,
      {
        totalDocuments: documentIds.length,
        processedDocuments: results.length,
        failedDocuments: errors.length,
        avgConfidence,
        results,
        errors,
      },
      insights,
      rulesApplied,
      avgConfidence,
    );
  }

  private async processDocumentOcr(
    documentId: string,
    options: OcrOptions,
  ): Promise<OcrDocumentResult> {
    const startTime = Date.now();

    // Get document
    const { data: document } = await this.supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('enterprise_id', this.enterpriseId)
      .single();

    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    const docRecord = document as DocumentRecord;

    // Create OCR result record
    const { data: ocrResult } = await this.supabase
      .from('ocr_results')
      .insert({
        enterprise_id: this.enterpriseId,
        ocr_job_id: null, // Will be set by batch job if applicable
        document_id: documentId,
        status: 'processing',
        ocr_engine: this.determineOcrEngine(docRecord.file_type),
      })
      .select()
      .single();

    try {
      // Perform OCR based on file type
      const extractionResult = await this.extractText(docRecord, options);

      // Update OCR result
      await this.supabase
        .from('ocr_results')
        .update({
          extracted_text: extractionResult.text,
          overall_confidence: extractionResult.confidence,
          quality_score: extractionResult.quality,
          detected_language: extractionResult.language,
          page_count: extractionResult.pageCount,
          word_count: extractionResult.wordCount,
          has_tables: extractionResult.hasTables,
          has_signatures: extractionResult.hasSignatures,
          has_handwriting: extractionResult.hasHandwriting,
          processing_time_ms: Date.now() - startTime,
          status: 'completed',
        })
        .eq('id', ocrResult.id);

      // Update document with extracted text
      await this.supabase
        .from('documents')
        .update({
          extracted_text: extractionResult.text,
          metadata: {
            ...docRecord.metadata,
            ocr_processed: true,
            ocr_confidence: extractionResult.confidence,
            ocr_engine: this.determineOcrEngine(docRecord.file_type),
            ocr_language: extractionResult.language,
            processed_at: new Date().toISOString(),
          },
        })
        .eq('id', documentId);

      // Create extracted data review entry with entity highlights
      const entityHighlights = this.extractEntitiesWithPositions(extractionResult.text);
      const extractedData = this.structureExtractedData(extractionResult.text, entityHighlights);

      await this.supabase
        .from('extracted_data_reviews')
        .upsert({
          enterprise_id: this.enterpriseId,
          document_id: documentId,
          extracted_data: extractedData,
          confidence_scores: this.calculateFieldConfidences(extractedData, extractionResult.confidence),
          entity_highlights: entityHighlights,
          extraction_quality_score: extractionResult.quality,
          total_fields: Object.keys(extractedData).length,
          status: extractionResult.confidence >= 0.9 ? 'auto_approved' : 'pending_review',
        }, {
          onConflict: 'document_id,ocr_job_id',
        });

      return {
        document_id: documentId,
        extracted_text: extractionResult.text,
        confidence: extractionResult.confidence,
        language: extractionResult.language,
        page_count: extractionResult.pageCount,
        word_count: extractionResult.wordCount,
        has_tables: extractionResult.hasTables,
        has_signatures: extractionResult.hasSignatures,
        processing_time_ms: Date.now() - startTime,
      };

    } catch (error) {
      // Update OCR result with error
      await this.supabase
        .from('ocr_results')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : String(error),
          processing_time_ms: Date.now() - startTime,
        })
        .eq('id', ocrResult.id);

      throw error;
    }
  }

  private determineOcrEngine(fileType: string): string {
    if (fileType === 'pdf' || fileType === 'application/pdf') {
      return 'pdf-parse';
    } else if (fileType.startsWith('image/')) {
      return 'tesseract';
    }
    return 'unknown';
  }

  private async extractText(
    document: DocumentRecord,
    options: OcrOptions,
  ): Promise<{
    text: string;
    confidence: number;
    quality: number;
    language: string;
    pageCount: number;
    wordCount: number;
    hasTables: boolean;
    hasSignatures: boolean;
    hasHandwriting: boolean;
  }> {
    // Check if already has extracted text
    if (document.extracted_text && document.extracted_text.length > 100) {
      return {
        text: document.extracted_text,
        confidence: 1.0,
        quality: 1.0,
        language: options.language || 'eng',
        pageCount: this.estimatePageCount(document.extracted_text),
        wordCount: this.countWords(document.extracted_text),
        hasTables: this.detectTables(document.extracted_text),
        hasSignatures: this.detectSignatures(document.extracted_text),
        hasHandwriting: false,
      };
    }

    // If no file path, cannot extract
    if (!document.file_path) {
      throw new Error('Document has no file path for OCR processing');
    }

    // For PDF files, use pdf-parse (would normally use actual library here)
    // For images, would use Tesseract.js or cloud OCR API
    // This is a simplified version that relies on existing extracted_text

    // In production, you would:
    // 1. Fetch file from storage
    // 2. Use pdf-parse for PDFs
    // 3. Use Tesseract.js or Google Cloud Vision for images
    // 4. Process and extract structured data

    // Placeholder implementation
    const text = document.extracted_text || '';
    const wordCount = this.countWords(text);
    const confidence = this.calculateConfidence(text, document.file_type);

    return {
      text,
      confidence,
      quality: confidence * 0.95, // Quality slightly lower than confidence
      language: options.language || this.detectLanguage(text),
      pageCount: this.estimatePageCount(text),
      wordCount,
      hasTables: options.detect_tables !== false && this.detectTables(text),
      hasSignatures: options.detect_signatures !== false && this.detectSignatures(text),
      hasHandwriting: false, // Would require image analysis
    };
  }

  private extractEntitiesWithPositions(text: string): EntityHighlights {
    const highlights: EntityHighlights = {
      parties: [],
      dates: [],
      amounts: [],
      clauses: [],
      signatures: [],
    };

    // Extract parties with positions
    const partyPatterns = [
      /between\s+(.+?)\s+(?:\(|and|,)/gi,
      /(?:vendor|client|party)[:\s]+(.+?)(?:\n|,)/gi,
    ];

    for (const pattern of partyPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        highlights.parties.push({
          text: match[1].trim(),
          position: { start: match.index, end: match.index + match[0].length },
          confidence: 0.85,
        });
      }
    }

    // Extract dates with positions
    const datePattern = /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}|[A-Za-z]+\s+\d{1,2},?\s+\d{4})\b/g;
    let match;
    while ((match = datePattern.exec(text)) !== null) {
      highlights.dates.push({
        text: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        confidence: 0.9,
        parsedDate: this.parseDate(match[0]),
      });
    }

    // Extract amounts with positions
    const amountPattern = /\$\s*([0-9,]+(?:\.[0-9]{2})?)/g;
    while ((match = amountPattern.exec(text)) !== null) {
      highlights.amounts.push({
        text: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        confidence: 0.95,
        value: parseFloat(match[1].replace(/,/g, '')),
      });
    }

    // Extract signature indicators
    const sigPatterns = [
      /_{10,}/g,
      /\[signature\]/gi,
      /\/s\//g,
    ];

    for (const pattern of sigPatterns) {
      while ((match = pattern.exec(text)) !== null) {
        highlights.signatures.push({
          position: { start: match.index, end: match.index + match[0].length },
          type: 'text_indicator',
        });
      }
    }

    return highlights;
  }

  private structureExtractedData(text: string, highlights: EntityHighlights): Record<string, unknown> {
    return {
      title: this.extractTitle(text),
      parties: highlights.parties.map(p => ({ name: p.text, confidence: p.confidence })),
      dates: {
        effectiveDate: highlights.dates.find(d => text.substring(Math.max(0, d.position.start - 50), d.position.start).toLowerCase().includes('effective'))?.parsedDate,
        expirationDate: highlights.dates.find(d => text.substring(Math.max(0, d.position.start - 50), d.position.start).toLowerCase().includes('expir'))?.parsedDate,
        allDates: highlights.dates.map(d => d.parsedDate),
      },
      amounts: highlights.amounts.map(a => ({ value: a.value, text: a.text, confidence: a.confidence })),
      documentType: this.classifyDocument(text),
      hasSignatures: highlights.signatures.length > 0,
      language: this.detectLanguage(text),
      wordCount: this.countWords(text),
    };
  }

  private calculateFieldConfidences(data: Record<string, unknown>, overallConfidence: number): Record<string, number> {
    const confidences: Record<string, number> = {};

    for (const key of Object.keys(data)) {
      // Higher confidence for structured fields
      if (key === 'amounts' || key === 'dates') {
        confidences[key] = Math.min(1.0, overallConfidence + 0.1);
      } else if (key === 'title') {
        confidences[key] = overallConfidence * 0.9;
      } else {
        confidences[key] = overallConfidence;
      }
    }

    return confidences;
  }

  private calculateConfidence(text: string, fileType: string): number {
    let confidence = 0.8; // Base confidence

    // PDF files generally have higher confidence
    if (fileType === 'pdf' || fileType === 'application/pdf') {
      confidence = 0.9;
    }

    // Reduce confidence for very short text
    if (text.length < 100) {
      confidence -= 0.3;
    } else if (text.length < 500) {
      confidence -= 0.1;
    }

    // Check for OCR artifacts that indicate low quality
    const artifacts = text.match(/[^\x20-\x7E\n\r\t]/g) || [];
    if (artifacts.length > text.length * 0.05) {
      confidence -= 0.2;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  // Utility methods (similar to SecretaryAgent)
  private extractTitle(content: string): string {
    const patterns = [
      /^([A-Z][A-Z\s]+)$/m,
      /(?:agreement|contract|memorandum)\s+(?:for|of|between)\s+(.+)/i,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) return match[1].trim();
    }

    const lines = content.split('\n').filter(l => l.trim());
    return lines[0]?.substring(0, 100) || 'Untitled Document';
  }

  private classifyDocument(text: string): string {
    const lowerText = text.toLowerCase();
    const typeKeywords: Record<string, string[]> = {
      contract: ['agreement', 'contract', 'terms and conditions'],
      invoice: ['invoice', 'bill', 'payment due'],
      proposal: ['proposal', 'quotation', 'offer'],
      certificate: ['certificate', 'certify', 'certification'],
    };

    for (const [type, keywords] of Object.entries(typeKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return type;
      }
    }

    return 'other';
  }

  private detectLanguage(text: string): string {
    // Simple language detection (same as SecretaryAgent)
    const languagePatterns = {
      en: /\b(the|and|of|to|in|is|for|with)\b/gi,
      es: /\b(el|la|de|que|y|en|un)\b/gi,
      fr: /\b(le|de|et|à|les|des)\b/gi,
    };

    const scores: Record<string, number> = {};
    for (const [lang, pattern] of Object.entries(languagePatterns)) {
      scores[lang] = (text.match(pattern) || []).length;
    }

    return Object.entries(scores).reduce((a, b) => (b[1] > a[1] ? b : a), ['en', 0])[0];
  }

  private estimatePageCount(content: string): number {
    return Math.max(1, Math.ceil(content.length / 3000));
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private detectTables(content: string): boolean {
    // Simple table detection
    const tableIndicators = [
      /\|.+\|/g, // Markdown tables
      /\t.+\t/g, // Tab-separated
      /(?:column|row|cell)/gi,
    ];

    return tableIndicators.some(pattern => pattern.test(content));
  }

  private detectSignatures(content: string): boolean {
    const signaturePatterns = [
      /_{10,}/,
      /\[signature\]/i,
      /\/s\//,
      /executed.*?by/i,
    ];

    return signaturePatterns.some(pattern => pattern.test(content));
  }

  private parseDate(dateStr: string): string | null {
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch {
      // Invalid date
    }
    return null;
  }
}
