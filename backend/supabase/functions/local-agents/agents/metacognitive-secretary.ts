import { MetacognitiveBaseAgent, MetacognitiveProcessingResult, LearningHistoryEntry as BaseLearningHistoryEntry, TaskHistoryEntry as BaseTaskHistoryEntry } from './metacognitive-base.ts';
import { ProcessingResult, Insight, AgentContext } from './base.ts';
import { MetacognitiveInsight, CalibrationResult } from './metacognitive.ts';
import { SupabaseClient } from '@supabase/supabase-js';

interface DocumentData {
  text?: string;
  content?: string;
  metadata?: Record<string, unknown>;
  type?: string;
  structure?: unknown;
  formats?: string[];
  languages?: string[];
  unknownElements?: unknown;
}

interface DocumentComponent {
  type: 'header' | 'section' | 'footer' | 'metadata';
  content: unknown;
  priority: number;
}

interface ProcessedComponent {
  processed: boolean;
  type: string;
  data: unknown;
  confidence?: number;
}

interface DocumentPattern {
  type: string;
  pattern: string;
  strength: number;
  features?: string[];
}

interface ExtractedData {
  headers: unknown[];
  sections: unknown[];
  footers: unknown[];
  metadata: Record<string, unknown>;
}

interface SecretaryTaskHistoryEntry extends BaseTaskHistoryEntry {
  id: string;
  dataType?: string | undefined;
  data?: unknown | undefined;
  context?: AgentContext | undefined;
  startState?: {
    confidence: number;
    strategy: string;
  } | undefined;
  endState?: {
    success: boolean;
    confidence: number;
    strategy?: string | undefined;
    insights: number;
  } | undefined;
  performance?: number | undefined;
}

interface SecretaryLearningHistoryEntry extends BaseLearningHistoryEntry {
  calibration: CalibrationResult;
  cognitiveLoad: number;
}

interface DocumentHeader {
  title?: string;
  date?: string;
  parties?: string[];
}

interface DocumentFooter {
  signatures?: string[];
  dates?: string[];
  metadata?: Record<string, unknown>;
}

interface ProcessedHeaderComponent extends ProcessedComponent {
  type: 'header';
  data: DocumentHeader;
}

interface ProcessedSectionComponent extends ProcessedComponent {
  type: 'section';
  data: {
    content: string;
    keywords: string[];
    entities: string[];
  };
}

interface ProcessedFooterComponent extends ProcessedComponent {
  type: 'footer';
  data: DocumentFooter & {
    references?: string[];
  };
}

interface ProcessedMetadataComponent extends ProcessedComponent {
  type: 'metadata';
  data: unknown;
}


export class MetacognitiveSecretaryAgent extends MetacognitiveBaseAgent {
  private learningHistory: SecretaryLearningHistoryEntry[] = [];
  private taskHistory: SecretaryTaskHistoryEntry[] = [];
  private currentLearningRate: number = 0.1;

  constructor(supabase: SupabaseClient, enterpriseId: string) {
    super(supabase, enterpriseId, 'metacognitive_secretary');
  }

  get agentType() {
    return 'metacognitive_secretary';
  }

  get capabilities() {
    return [
      'document_processing',
      'data_extraction',
      'metadata_generation',
      'categorization',
      'ocr_analysis',
      'metacognitive_monitoring',
      'strategy_optimization',
    ];
  }

  protected initializeStrategies(): void {
    this.availableStrategies = [
      {
        name: 'structured_extraction',
        type: 'analytical',
        complexity: 0.8,
        expectedAccuracy: 0.9,
        expectedSpeed: 0.3,
        contextualFit: 0.9,
      },
      {
        name: 'pattern_matching',
        type: 'heuristic',
        complexity: 0.5,
        expectedAccuracy: 0.8,
        expectedSpeed: 0.8,
        contextualFit: 0.7,
      },
      {
        name: 'quick_scan',
        type: 'intuitive',
        complexity: 0.3,
        expectedAccuracy: 0.7,
        expectedSpeed: 0.95,
        contextualFit: 0.6,
      },
      {
        name: 'adaptive_processing',
        type: 'hybrid',
        complexity: 0.6,
        expectedAccuracy: 0.85,
        expectedSpeed: 0.6,
        contextualFit: 0.8,
      },
    ];
  }

  // Process without metacognition
  protected async processWithoutMetacognition(data: unknown, _context?: AgentContext): Promise<MetacognitiveProcessingResult> {
    // Simple document processing without metacognitive features
    const startTime = Date.now();
    const insights: Insight[] = [];
    const rulesApplied: string[] = ['basic_document_processing'];

    try {
      // Type guard for document data
      const docData = data as DocumentData;

      // Basic document processing logic
      const result = {
        text: docData.text || '',
        metadata: docData.metadata || {},
        type: docData.type || 'unknown',
      };

      return {
        success: true,
        data: result,
        result,
        insights,
        rulesApplied,
        confidence: 0.7,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        result: null,
        insights,
        rulesApplied,
        confidence: 0,
        processingTime: Date.now() - startTime,
        metadata: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  // Override process to add document-specific metacognitive features
  async process(data: unknown, context?: AgentContext): Promise<MetacognitiveProcessingResult> {
    const startTime = Date.now();

    // Track task for learning
    const taskId = this.generateTaskId();
    this.trackTask(taskId, data, context);

    // Metacognitive processing
    const result = await super.process(data, context);

    // Document-specific post-processing
    if (result.success && result.metacognitive) {
      // Analyze document processing patterns
      const documentInsights = await this.analyzeDocumentProcessingPatterns(
        data,
        result,
        Date.now() - startTime,
      );

      // Add document-specific insights
      result.metacognitive.insights.push(...documentInsights);
    }

    // Update task history with result
    this.updateTaskHistory(taskId, result);

    return result;
  }

  // Implement abstract methods from MetacognitiveBaseAgent
  protected decomposeAnalytically(data: unknown): DocumentComponent[] {
    const components: DocumentComponent[] = [];
    const docData = data as DocumentData;

    // Decompose by document sections
    if (docData.content) {
      // Header extraction
      components.push({
        type: 'header' as const,
        content: this.extractHeader(docData.content),
        priority: 1,
      });

      // Body sections
      const sections = this.extractSections(docData.content);
      components.push(...sections.map((section, idx) => ({
        type: 'section' as const,
        content: section,
        priority: 0.8 - (idx * 0.1),
      })));

      // Footer/signature extraction
      components.push({
        type: 'footer' as const,
        content: this.extractFooter(docData.content),
        priority: 0.7,
      });
    }

    // Metadata extraction
    if (docData.metadata) {
      components.push({
        type: 'metadata' as const,
        content: docData.metadata,
        priority: 0.9,
      });
    }

    return components;
  }

  protected async processComponent(component: unknown, _context?: AgentContext): Promise<ProcessedComponent> {
    const comp = component as DocumentComponent;

    switch (comp.type) {
      case 'header':
        return this.processHeader(comp.content as string);

      case 'section':
        return this.processSection(comp.content as string);

      case 'footer':
        return this.processFooter(comp.content as string);

      case 'metadata':
        return this.processMetadata(comp.content);

      default:
        return { processed: false, type: 'unknown', data: component };
    }
  }

  protected synthesizeResults(results: unknown[]): ProcessingResult {
    const insights: Insight[] = [];
    const extractedData: ExtractedData = {
      headers: [],
      sections: [],
      footers: [],
      metadata: {},
    };

    let overallConfidence = 0;
    let successCount = 0;

    for (const rawResult of results) {
      const result = rawResult as ProcessedComponent;
      if (result.processed) {
        successCount++;

        switch (result.type) {
          case 'header':
            extractedData.headers.push(result.data);
            break;
          case 'section':
            extractedData.sections.push(result.data);
            break;
          case 'footer':
            extractedData.footers.push(result.data);
            break;
          case 'metadata':
            extractedData.metadata = {
              ...extractedData.metadata,
              ...(result.data as Record<string, unknown>)
            };
            break;
        }

        overallConfidence += result.confidence || 0.5;
      }
    }

    // Calculate final confidence
    const confidence = results.length > 0 ?
      (overallConfidence / results.length) * (successCount / results.length) : 0;

    // Generate insights
    if (extractedData.headers.length > 0) {
      insights.push(this.createInsight(
        'header_extraction',
        'low',
        'Document Headers Extracted',
        `Successfully extracted ${extractedData.headers.length} headers`,
        undefined,
        { headers: extractedData.headers },
      ));
    }

    return {
      success: successCount > 0,
      data: extractedData,
      result: extractedData,
      insights,
      rulesApplied: ['analytical_decomposition', 'component_synthesis'],
      confidence,
      processingTime: Date.now() - this.startTime,
      metadata: {
        componentsProcessed: results.length,
        successfulComponents: successCount,
      },
    };
  }

  protected async applyHeuristics(data: unknown, _context?: AgentContext): Promise<ProcessingResult> {
    const insights: Insight[] = [];
    const rulesApplied: string[] = [];
    const docData = data as DocumentData;

    // Document type detection heuristic
    const documentType = this.detectDocumentType(docData);
    rulesApplied.push('document_type_heuristic');

    // Apply type-specific heuristics
    let result: ProcessingResult;
    let confidence = 0.7;

    switch (documentType) {
      case 'contract':
        result = await this.applyContractHeuristics(docData);
        rulesApplied.push('contract_heuristics');
        confidence = 0.85;
        break;

      case 'invoice':
        result = await this.applyInvoiceHeuristics(docData);
        rulesApplied.push('invoice_heuristics');
        confidence = 0.9;
        break;

      case 'report':
        result = await this.applyReportHeuristics(docData);
        rulesApplied.push('report_heuristics');
        confidence = 0.8;
        break;

      default:
        result = await this.applyGeneralHeuristics(docData);
        rulesApplied.push('general_heuristics');
        confidence = 0.6;
    }

    insights.push(this.createInsight(
      'heuristic_processing',
      'low',
      'Heuristic Processing Applied',
      `Document identified as ${documentType}, applied specific heuristics`,
      undefined,
      { documentType, heuristicsApplied: rulesApplied },
    ));

    return {
      success: true,
      data: result,
      result,
      insights,
      rulesApplied,
      confidence,
      processingTime: Date.now() - this.startTime,
    };
  }

  protected validateHeuristic(result: ProcessingResult): ProcessingResult {
    // Validate heuristic results
    const validationErrors: string[] = [];

    if (result.data) {
      // Check for required fields based on document type
      if (result.metadata?.documentType === 'contract') {
        const data = result.data as Record<string, unknown>;
        if (!data.parties) {validationErrors.push('Missing parties information');}
        if (!data.terms) {validationErrors.push('Missing terms');}
      }

      if (result.metadata?.documentType === 'invoice') {
        const data = result.data as Record<string, unknown>;
        if (!data.amount) {validationErrors.push('Missing amount');}
        if (!data.date) {validationErrors.push('Missing date');}
      }
    }

    // Adjust confidence based on validation
    const validationPenalty = validationErrors.length * 0.1;
    const adjustedConfidence = Math.max(0.1, result.confidence - validationPenalty);

    return {
      ...result,
      confidence: adjustedConfidence,
      metadata: {
        ...result.metadata,
        validationErrors,
        validated: true,
      },
    };
  }

  protected async matchPatterns(data: unknown, context?: AgentContext): Promise<DocumentPattern[]> {
    const patterns: DocumentPattern[] = [];
    const docData = data as DocumentData;

    // Document structure patterns
    const structurePattern = this.matchStructurePattern(docData);
    if (structurePattern) {
      patterns.push(structurePattern);
    }

    // Content patterns
    const contentPatterns = this.matchContentPatterns(docData);
    patterns.push(...contentPatterns);

    // Metadata patterns
    if (docData.metadata) {
      const metadataPattern = this.matchMetadataPattern(docData.metadata);
      if (metadataPattern) {
        patterns.push(metadataPattern);
      }
    }

    // Historical patterns from memory
    if (context?.memory) {
      const historicalPatterns = await this.matchHistoricalPatterns(docData, context.memory);
      patterns.push(...historicalPatterns);
    }

    return patterns;
  }

  protected intuitiveAssessment(patterns: unknown[]): ProcessingResult {
    // Quick intuitive assessment based on patterns
    const insights: Insight[] = [];
    let confidence = 0.5;
    const typedPatterns = patterns as DocumentPattern[];

    // Strong patterns increase confidence
    const strongPatterns = typedPatterns.filter((p: DocumentPattern) => p.strength > 0.8);
    confidence += strongPatterns.length * 0.1;

    // Consistent patterns increase confidence
    const patternTypes = new Set(typedPatterns.map((p: DocumentPattern) => p.type));
    if (patternTypes.size < typedPatterns.length / 2) {
      confidence += 0.1; // Many similar patterns
    }

    // Generate quick insights
    if (strongPatterns.length > 0) {
      insights.push(this.createInsight(
        'pattern_recognition',
        'medium',
        'Strong Patterns Detected',
        `Found ${strongPatterns.length} strong patterns indicating high confidence`,
        undefined,
        { patternCount: strongPatterns.length },
      ));
    }

    // Quick result based on dominant pattern
    const dominantPattern = typedPatterns.sort((a: DocumentPattern, b: DocumentPattern) => b.strength - a.strength)[0];
    const result = dominantPattern ? this.generateResultFromPattern(dominantPattern) : null;

    return {
      success: result !== null,
      data: result,
      result,
      insights,
      rulesApplied: ['intuitive_pattern_matching'],
      confidence: Math.min(0.9, confidence),
      processingTime: Date.now() - this.startTime,
      metadata: {
        patternsFound: typedPatterns.length,
        patternTypes: Array.from(patternTypes),
      },
    };
  }

  protected combineResults(result1: ProcessingResult, result2: ProcessingResult): ProcessingResult {
    // Combine intuitive and analytical results
    const combinedInsights = [...result1.insights, ...result2.insights];
    const combinedRules = [...new Set([...result1.rulesApplied, ...result2.rulesApplied])];

    // Weighted confidence combination
    const weight1 = result1.confidence;
    const weight2 = result2.confidence;
    const totalWeight = weight1 + weight2;

    const combinedConfidence = totalWeight > 0 ?
      (result1.confidence * weight1 + result2.confidence * weight2) / totalWeight : 0.5;

    // Merge results
    const mergedResult = this.mergeResults(result1.result, result2.result);

    return {
      success: result1.success || result2.success,
      data: mergedResult,
      result: mergedResult,
      insights: combinedInsights,
      rulesApplied: combinedRules,
      confidence: combinedConfidence,
      processingTime: Date.now() - this.startTime,
      metadata: {
        combinedFrom: ['intuitive', 'analytical'],
        result1Confidence: result1.confidence,
        result2Confidence: result2.confidence,
      },
    };
  }

  protected assessDataComplexity(data: DocumentData): number {
    let complexity = 0;

    // Size complexity
    if (data.content) {
      const contentLength = data.content.length;
      complexity += Math.min(0.3, contentLength / 10000);
    }

    // Structure complexity
    if (data.structure) {
      const depth = this.calculateStructureDepth(data.structure);
      complexity += Math.min(0.2, depth / 10);
    }

    // Format complexity
    if (data.formats && Array.isArray(data.formats)) {
      complexity += Math.min(0.2, data.formats.length / 5);
    }

    // Language complexity
    if (data.languages && data.languages.length > 1) {
      complexity += 0.2;
    }

    // Unknown elements
    if ('unknownElements' in data && data.unknownElements) {
      complexity += 0.1;
    }

    return Math.min(1, complexity);
  }

  protected async adjustLearningRate(adjustment: number): Promise<void> {
    this.currentLearningRate *= adjustment;

    // Keep learning rate in reasonable bounds
    this.currentLearningRate = Math.max(0.01, Math.min(0.5, this.currentLearningRate));

    // Log adjustment
    await this.supabase.from('agent_learning_adjustments').insert({
      agent_type: this.agentType,
      enterprise_id: this.enterpriseId,
      adjustment_factor: adjustment,
      new_learning_rate: this.currentLearningRate,
      timestamp: new Date().toISOString(),
    });
  }

  protected analyzeError(error: unknown): { type: string; context: string; recommendedStrategy: string; severity: string; recoverable: boolean } {
    const err = error as Error;
    const errorType = err.name || 'UnknownError';
    const errorMessage = err.message || 'No error message';

    // Classify error
    let recommendedStrategy = 'adaptive_processing';

    if (errorMessage.includes('timeout')) {
      recommendedStrategy = 'quick_scan';
    } else if (errorMessage.includes('parse') || errorMessage.includes('format')) {
      recommendedStrategy = 'structured_extraction';
    } else if (errorMessage.includes('memory') || errorMessage.includes('size')) {
      recommendedStrategy = 'pattern_matching';
    }

    return {
      type: errorType,
      context: errorMessage,
      recommendedStrategy,
      severity: 'medium',
      recoverable: true,
    };
  }

  // Document-specific helper methods
  private async analyzeDocumentProcessingPatterns(
    data: unknown,
    result: MetacognitiveProcessingResult,
    processingTime: number,
  ): Promise<MetacognitiveInsight[]> {
    const insights: MetacognitiveInsight[] = [];
    const docData = data as DocumentData;

    // Analyze processing efficiency
    const expectedTime = this.estimateProcessingTime(docData);
    const timeEfficiency = expectedTime / processingTime;

    if (timeEfficiency < 0.5) {
      insights.push({
        type: 'performance_prediction',
        description: 'Processing took longer than expected',
        impact: 0.6,
        recommendation: 'Consider using quick_scan strategy for similar documents',
      });
    } else if (timeEfficiency > 1.5) {
      insights.push({
        type: 'performance_prediction',
        description: 'Processing was faster than expected',
        impact: 0.3,
        recommendation: 'Current strategy is highly efficient for this document type',
      });
    }

    // Analyze extraction completeness
    if (result.result) {
      const completeness = this.assessExtractionCompleteness(result.result as Record<string, unknown>);
      if (completeness < 0.7) {
        insights.push({
          type: 'learning_opportunity',
          description: 'Incomplete data extraction detected',
          impact: 0.8,
          recommendation: 'Switch to structured_extraction for more thorough processing',
        });
      }
    }

    return insights;
  }

  private trackTask(taskId: string, data: unknown, context?: AgentContext): void {
    const docData = data as DocumentData;
    const docType = this.detectDocumentType(docData);
    const strategyName = this.currentCognitiveState?.activeStrategies[0] || 'unknown';

    const taskEntry: SecretaryTaskHistoryEntry = {
      id: taskId,
      timestamp: new Date(),
      type: docType,
      dataType: docType,
      data: data,
      context: context ?? undefined,
      duration: 0,
      success: false,
      strategyUsed: strategyName,
      startState: {
        confidence: this.currentCognitiveState?.confidence || 0.5,
        strategy: strategyName,
      },
    };

    this.taskHistory.push(taskEntry);
  }

  private updateTaskHistory(taskId: string, result: MetacognitiveProcessingResult): void {
    const task = this.taskHistory.find((t: SecretaryTaskHistoryEntry) => t.id === taskId);
    if (task) {
      const strategy = result.metacognitive?.strategyUsed.name;
      task.endState = {
        success: result.success,
        confidence: result.confidence,
        strategy: strategy !== undefined ? strategy : undefined,
        insights: result.insights.length,
      };
      task.performance = result.success ? result.confidence : 0;
      task.success = result.success;
      task.strategyUsed = strategy || 'unknown';
    }

    // Update learning history
    if (result.metacognitive) {
      this.learningHistory.push({
        taskId,
        timestamp: new Date(),
        strategy: result.metacognitive.strategyUsed.name,
        performance: result.success ? result.confidence : 0,
        outcome: result.success ? 'success' : 'failure',
        calibration: result.metacognitive.calibration,
        cognitiveLoad: result.metacognitive.cognitiveState.cognitiveLoad,
      });
    }
  }

  // Utility methods
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private extractHeader(content: string): string {
    // Simple header extraction - first 20% of content
    const headerLength = Math.floor(content.length * 0.2);
    return content.substring(0, headerLength);
  }

  private extractSections(content: string): string[] {
    // Simple section extraction - split by double newlines
    return content.split(/\n\n+/).filter(s => s.trim().length > 0);
  }

  private extractFooter(content: string): string {
    // Simple footer extraction - last 10% of content
    const footerStart = Math.floor(content.length * 0.9);
    return content.substring(footerStart);
  }

  private processHeader(content: string): ProcessedHeaderComponent {
    return {
      processed: true,
      type: 'header',
      data: {
        title: this.extractTitle(content),
        date: this.extractDate(content).join(', '),
        parties: this.extractParties(content),
      },
      confidence: 0.8,
    };
  }

  private processSection(content: string): ProcessedSectionComponent {
    return {
      processed: true,
      type: 'section',
      data: {
        content: content.trim(),
        keywords: this.extractKeywords(content),
        entities: this.extractEntities(content),
      },
      confidence: 0.7,
    };
  }

  private processFooter(content: string): ProcessedFooterComponent {
    return {
      processed: true,
      type: 'footer',
      data: {
        signatures: this.extractSignatures(content),
        dates: this.extractDates(content),
        references: this.extractReferences(content),
      },
      confidence: 0.75,
    };
  }

  private processMetadata(metadata: unknown): ProcessedMetadataComponent {
    return {
      processed: true,
      type: 'metadata',
      data: metadata,
      confidence: 0.9,
    };
  }

  private detectDocumentType(data: DocumentData): string {
    if (!data.content) {
      return 'unknown';
    }

    const content = data.content.toLowerCase();

    if (content.includes('agreement') || content.includes('contract')) {return 'contract';}
    if (content.includes('invoice') || content.includes('bill')) {return 'invoice';}
    if (content.includes('report') || content.includes('analysis')) {return 'report';}
    if (content.includes('proposal') || content.includes('quotation')) {return 'proposal';}

    return 'general';
  }

  private estimateProcessingTime(data: DocumentData): number {
    // Estimate based on content size and complexity
    const baseTime = 100; // ms
    const sizeFactor = data.content ? data.content.length / 1000 : 1;
    const complexityFactor = this.assessDataComplexity(data);

    return baseTime * (1 + sizeFactor * 0.1) * (1 + complexityFactor);
  }

  private assessExtractionCompleteness(result: Record<string, unknown>): number {
    let score = 0;
    let maxScore = 0;

    // Check headers
    maxScore += 1;
    if (result.headers && Array.isArray(result.headers) && result.headers.length > 0) {score += 1;}

    // Check sections
    maxScore += 1;
    if (result.sections && Array.isArray(result.sections) && result.sections.length > 0) {score += 1;}

    // Check metadata
    maxScore += 1;
    if (result.metadata && Object.keys(result.metadata).length > 0) {score += 1;}

    return maxScore > 0 ? score / maxScore : 0;
  }

  // Override parent methods
  protected getLearningHistory(): BaseLearningHistoryEntry[] {
    return this.learningHistory;
  }

  protected getTaskHistory(): BaseTaskHistoryEntry[] {
    return this.taskHistory;
  }

  // Pattern matching helpers
  private matchStructurePattern(_data: DocumentData): DocumentPattern {
    // Implement structure pattern matching
    return {
      type: 'structure',
      pattern: 'standard_document',
      strength: 0.7,
      features: ['header', 'body', 'footer'],
    };
  }

  private matchContentPatterns(_data: DocumentData): DocumentPattern[] {
    // Implement content pattern matching
    return [];
  }

  private matchMetadataPattern(_metadata: Record<string, unknown>): DocumentPattern | null {
    // Implement metadata pattern matching
    return null;
  }

  private async matchHistoricalPatterns(_data: DocumentData, _memory: unknown[]): Promise<DocumentPattern[]> {
    // Match against historical patterns in memory
    return [];
  }

  private generateResultFromPattern(pattern: DocumentPattern): unknown {
    // Generate result based on dominant pattern
    return {
      type: pattern.pattern,
      confidence: pattern.strength,
      extractedData: {},
    };
  }

  private mergeResults(result1: unknown, result2: unknown): unknown {
    // Merge two results intelligently
    if (!result1) {return result2;}
    if (!result2) {return result1;}

    return {
      ...result1,
      ...result2,
      merged: true,
    };
  }

  private calculateStructureDepth(_structure: unknown): number {
    // Calculate depth of document structure
    return 1;
  }

  // Extraction helpers (simplified implementations)
  private extractTitle(content: string): string {
    const lines = content.split('\n');
    return lines[0] || '';
  }

  private extractDate(content: string): string[] {
    const datePattern = /\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/g;
    return content.match(datePattern) || [];
  }

  private extractParties(_content: string): string[] {
    // Simplified party extraction
    return [];
  }

  private extractKeywords(content: string): string[] {
    // Simple keyword extraction
    const words = content.toLowerCase().split(/\s+/);
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at']);
    return words.filter(w => w.length > 3 && !stopWords.has(w)).slice(0, 10);
  }

  private extractEntities(_content: string): string[] {
    // Simplified entity extraction
    return [];
  }

  private extractSignatures(_content: string): string[] {
    // Simplified signature extraction
    return [];
  }

  private extractDates(content: string): string[] {
    return this.extractDate(content);
  }

  private extractReferences(_content: string): string[] {
    // Simplified reference extraction
    return [];
  }

  // Contract-specific heuristics
  private async applyContractHeuristics(_data: DocumentData): Promise<ProcessingResult> {
    const contractData = {
      documentType: 'contract' as const,
      parties: [] as string[],
      terms: [] as string[],
      dates: [] as string[],
      obligations: [] as string[],
    };

    return {
      success: true,
      data: contractData,
      result: contractData,
      insights: [],
      rulesApplied: ['contract_heuristics'],
      confidence: 0.85,
      processingTime: Date.now() - this.startTime,
    };
  }

  private async applyInvoiceHeuristics(_data: DocumentData): Promise<ProcessingResult> {
    const invoiceData = {
      documentType: 'invoice' as const,
      amount: 0,
      date: '',
      vendor: '',
      items: [] as unknown[],
    };

    return {
      success: true,
      data: invoiceData,
      result: invoiceData,
      insights: [],
      rulesApplied: ['invoice_heuristics'],
      confidence: 0.9,
      processingTime: Date.now() - this.startTime,
    };
  }

  private async applyReportHeuristics(_data: DocumentData): Promise<ProcessingResult> {
    const reportData = {
      documentType: 'report' as const,
      summary: '',
      findings: [] as string[],
      recommendations: [] as string[],
    };

    return {
      success: true,
      data: reportData,
      result: reportData,
      insights: [],
      rulesApplied: ['report_heuristics'],
      confidence: 0.8,
      processingTime: Date.now() - this.startTime,
    };
  }

  private async applyGeneralHeuristics(data: DocumentData): Promise<ProcessingResult> {
    const generalData = {
      documentType: 'general' as const,
      content: data.content,
      metadata: data.metadata,
    };

    return {
      success: true,
      data: generalData,
      result: generalData,
      insights: [],
      rulesApplied: ['general_heuristics'],
      confidence: 0.6,
      processingTime: Date.now() - this.startTime,
    };
  }
}