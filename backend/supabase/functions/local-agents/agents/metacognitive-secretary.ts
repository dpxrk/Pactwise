import { MetacognitiveBaseAgent, MetacognitiveProcessingResult } from './metacognitive-base.ts';
import { ProcessingResult, Insight, AgentContext } from './base.ts';
import { MetacognitiveInsight } from './metacognitive.ts';

export class MetacognitiveSecretaryAgent extends MetacognitiveBaseAgent {
  private learningHistory: any[] = [];
  private taskHistory: any[] = [];
  private currentLearningRate: number = 0.1;

  constructor(supabase: any, enterpriseId: string) {
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
  protected async processWithoutMetacognition(data: any, _context?: AgentContext): Promise<MetacognitiveProcessingResult> {
    // Simple document processing without metacognitive features
    const startTime = Date.now();
    const insights: Insight[] = [];
    const rulesApplied: string[] = ['basic_document_processing'];
    
    try {
      // Basic document processing logic
      const result = {
        text: data.text || '',
        metadata: data.metadata || {},
        type: data.type || 'unknown',
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
  async process(data: any, context?: AgentContext): Promise<MetacognitiveProcessingResult> {
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
  protected decomposeAnalytically(data: any): any[] {
    const components = [];

    // Decompose by document sections
    if (data.content) {
      // Header extraction
      components.push({
        type: 'header',
        content: this.extractHeader(data.content),
        priority: 1,
      });

      // Body sections
      const sections = this.extractSections(data.content);
      components.push(...sections.map((section, idx) => ({
        type: 'section',
        content: section,
        priority: 0.8 - (idx * 0.1),
      })));

      // Footer/signature extraction
      components.push({
        type: 'footer',
        content: this.extractFooter(data.content),
        priority: 0.7,
      });
    }

    // Metadata extraction
    if (data.metadata) {
      components.push({
        type: 'metadata',
        content: data.metadata,
        priority: 0.9,
      });
    }

    return components;
  }

  protected async processComponent(component: any, _context?: AgentContext): Promise<any> {
    switch (component.type) {
      case 'header':
        return this.processHeader(component.content);

      case 'section':
        return this.processSection(component.content);

      case 'footer':
        return this.processFooter(component.content);

      case 'metadata':
        return this.processMetadata(component.content);

      default:
        return { processed: false, data: component };
    }
  }

  protected synthesizeResults(results: any[]): ProcessingResult {
    const insights: Insight[] = [];
    const extractedData: any = {
      headers: [],
      sections: [],
      footers: [],
      metadata: {},
    };

    let overallConfidence = 0;
    let successCount = 0;

    for (const result of results) {
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
            extractedData.metadata = { ...extractedData.metadata, ...result.data };
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
      result: extractedData,
      insights,
      rulesApplied: ['analytical_decomposition', 'component_synthesis'],
      confidence,
      metadata: {
        componentsProcessed: results.length,
        successfulComponents: successCount,
      },
    };
  }

  protected async applyHeuristics(data: any, _context?: AgentContext): Promise<ProcessingResult> {
    const insights: Insight[] = [];
    const rulesApplied: string[] = [];

    // Document type detection heuristic
    const documentType = this.detectDocumentType(data);
    rulesApplied.push('document_type_heuristic');

    // Apply type-specific heuristics
    let result: any;
    let confidence = 0.7;

    switch (documentType) {
      case 'contract':
        result = await this.applyContractHeuristics(data);
        rulesApplied.push('contract_heuristics');
        confidence = 0.85;
        break;

      case 'invoice':
        result = await this.applyInvoiceHeuristics(data);
        rulesApplied.push('invoice_heuristics');
        confidence = 0.9;
        break;

      case 'report':
        result = await this.applyReportHeuristics(data);
        rulesApplied.push('report_heuristics');
        confidence = 0.8;
        break;

      default:
        result = await this.applyGeneralHeuristics(data);
        rulesApplied.push('general_heuristics');
        confidence = 0.6;
    }

    insights.push(this.createInsight(
      'heuristic_processing',
      'low',
      'Heuristic Processing Applied',
      `Document identified as ${documentType}, applied specific heuristics`,
      null,
      { documentType, heuristicsApplied: rulesApplied },
    ));

    return {
      success: true,
      result,
      insights,
      rulesApplied,
      confidence,
    };
  }

  protected validateHeuristic(result: ProcessingResult): ProcessingResult {
    // Validate heuristic results
    const validationErrors: string[] = [];

    if (result.data) {
      // Check for required fields based on document type
      if (result.metadata?.documentType === 'contract') {
        const data = result.data as any;
        if (!data.parties) {validationErrors.push('Missing parties information');}
        if (!data.terms) {validationErrors.push('Missing terms');}
      }

      if (result.metadata?.documentType === 'invoice') {
        const data = result.data as any;
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

  protected async matchPatterns(data: any, context?: AgentContext): Promise<any[]> {
    const patterns = [];

    // Document structure patterns
    const structurePattern = this.matchStructurePattern(data);
    if (structurePattern) {patterns.push(structurePattern);}

    // Content patterns
    const contentPatterns = this.matchContentPatterns(data);
    patterns.push(...contentPatterns);

    // Metadata patterns
    if (data.metadata) {
      const metadataPattern = this.matchMetadataPattern(data.metadata);
      if (metadataPattern) {patterns.push(metadataPattern);}
    }

    // Historical patterns from memory
    if (context?.memory) {
      const historicalPatterns = await this.matchHistoricalPatterns(data, context.memory);
      patterns.push(...historicalPatterns);
    }

    return patterns;
  }

  protected intuitiveAssessment(patterns: any[]): ProcessingResult {
    // Quick intuitive assessment based on patterns
    const insights: Insight[] = [];
    let confidence = 0.5;

    // Strong patterns increase confidence
    const strongPatterns = patterns.filter(p => p.strength > 0.8);
    confidence += strongPatterns.length * 0.1;

    // Consistent patterns increase confidence
    const patternTypes = new Set(patterns.map(p => p.type));
    if (patternTypes.size < patterns.length / 2) {
      confidence += 0.1; // Many similar patterns
    }

    // Generate quick insights
    if (strongPatterns.length > 0) {
      insights.push(this.createInsight(
        'pattern_recognition',
        'medium',
        'Strong Patterns Detected',
        `Found ${strongPatterns.length} strong patterns indicating high confidence`,
        null,
        { patternCount: strongPatterns.length },
      ));
    }

    // Quick result based on dominant pattern
    const dominantPattern = patterns.sort((a, b) => b.strength - a.strength)[0];
    const result = dominantPattern ? this.generateResultFromPattern(dominantPattern) : null;

    return {
      success: result !== null,
      result,
      insights,
      rulesApplied: ['intuitive_pattern_matching'],
      confidence: Math.min(0.9, confidence),
      metadata: {
        patternsFound: patterns.length,
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
      result: mergedResult,
      insights: combinedInsights,
      rulesApplied: combinedRules,
      confidence: combinedConfidence,
      metadata: {
        combinedFrom: ['intuitive', 'analytical'],
        result1Confidence: result1.confidence,
        result2Confidence: result2.confidence,
      },
    };
  }

  protected assessDataComplexity(data: { content?: string; structure?: unknown; metadata?: unknown }): number {
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
    if (data.unknownElements) {
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

  protected analyzeError(error: any): any {
    const errorType = error.name || 'UnknownError';
    const errorMessage = error.message || 'No error message';

    // Classify error
    let category = 'general';
    let recommendedStrategy = 'adaptive_processing';

    if (errorMessage.includes('timeout')) {
      category = 'performance';
      recommendedStrategy = 'quick_scan';
    } else if (errorMessage.includes('parse') || errorMessage.includes('format')) {
      category = 'parsing';
      recommendedStrategy = 'structured_extraction';
    } else if (errorMessage.includes('memory') || errorMessage.includes('size')) {
      category = 'resource';
      recommendedStrategy = 'pattern_matching';
    }

    return {
      type: errorType,
      category,
      context: {
        message: errorMessage,
        stack: error.stack,
      },
      recommendedStrategy,
    };
  }

  // Document-specific helper methods
  private async analyzeDocumentProcessingPatterns(
    data: any,
    result: MetacognitiveProcessingResult,
    processingTime: number,
  ): Promise<MetacognitiveInsight[]> {
    const insights: MetacognitiveInsight[] = [];

    // Analyze processing efficiency
    const expectedTime = this.estimateProcessingTime(data);
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
      const completeness = this.assessExtractionCompleteness(result.result);
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

  private trackTask(taskId: string, data: any, context?: AgentContext): void {
    this.taskHistory.push({
      id: taskId,
      timestamp: new Date().toISOString(),
      dataType: this.detectDocumentType(data),
      context,
      startState: {
        confidence: this.currentCognitiveState?.confidence || 0.5,
        strategy: this.currentCognitiveState?.activeStrategies[0] || 'unknown',
      },
    });
  }

  private updateTaskHistory(taskId: string, result: MetacognitiveProcessingResult): void {
    const task = this.taskHistory.find(t => t.id === taskId);
    if (task) {
      task.endState = {
        success: result.success,
        confidence: result.confidence,
        strategy: result.metacognitive?.strategyUsed.name,
        insights: result.insights.length,
      };
      task.performance = result.success ? result.confidence : 0;
    }

    // Update learning history
    if (result.metacognitive) {
      this.learningHistory.push({
        timestamp: new Date().toISOString(),
        strategy: result.metacognitive.strategyUsed.name,
        performance: result.success ? result.confidence : 0,
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

  private processHeader(content: string): any {
    return {
      processed: true,
      type: 'header',
      data: {
        title: this.extractTitle(content),
        date: this.extractDate(content),
        parties: this.extractParties(content),
      },
      confidence: 0.8,
    };
  }

  private processSection(content: string): any {
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

  private processFooter(content: string): any {
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

  private processMetadata(metadata: any): any {
    return {
      processed: true,
      type: 'metadata',
      data: metadata,
      confidence: 0.9,
    };
  }

  private detectDocumentType(data: any): string {
    if (!data.content) {return 'unknown';}

    const content = data.content.toLowerCase();

    if (content.includes('agreement') || content.includes('contract')) {return 'contract';}
    if (content.includes('invoice') || content.includes('bill')) {return 'invoice';}
    if (content.includes('report') || content.includes('analysis')) {return 'report';}
    if (content.includes('proposal') || content.includes('quotation')) {return 'proposal';}

    return 'general';
  }

  private estimateProcessingTime(data: { content?: string; structure?: unknown; metadata?: unknown }): number {
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
    if (result.headers && result.headers.length > 0) {score += 1;}

    // Check sections
    maxScore += 1;
    if (result.sections && result.sections.length > 0) {score += 1;}

    // Check metadata
    maxScore += 1;
    if (result.metadata && Object.keys(result.metadata).length > 0) {score += 1;}

    return maxScore > 0 ? score / maxScore : 0;
  }

  // Override parent methods
  protected getLearningHistory(): any[] {
    return this.learningHistory;
  }

  protected getTaskHistory(): any[] {
    return this.taskHistory;
  }

  // Pattern matching helpers
  private matchStructurePattern(_data: any): any {
    // Implement structure pattern matching
    return {
      type: 'structure',
      pattern: 'standard_document',
      strength: 0.7,
      features: ['header', 'body', 'footer'],
    };
  }

  private matchContentPatterns(_data: any): any[] {
    // Implement content pattern matching
    return [];
  }

  private matchMetadataPattern(_metadata: any): any {
    // Implement metadata pattern matching
    return null;
  }

  private async matchHistoricalPatterns(_data: any, _memory: any[]): Promise<any[]> {
    // Match against historical patterns in memory
    return [];
  }

  private generateResultFromPattern(pattern: any): any {
    // Generate result based on dominant pattern
    return {
      type: pattern.pattern,
      confidence: pattern.strength,
      extractedData: {},
    };
  }

  private mergeResults(result1: any, result2: any): any {
    // Merge two results intelligently
    if (!result1) {return result2;}
    if (!result2) {return result1;}

    return {
      ...result1,
      ...result2,
      merged: true,
    };
  }

  private calculateStructureDepth(_structure: any): number {
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

  private extractReferences(content: string): string[] {
    // Simplified reference extraction
    return [];
  }

  // Contract-specific heuristics
  private async applyContractHeuristics(data: any): Promise<any> {
    return {
      documentType: 'contract',
      parties: [],
      terms: [],
      dates: [],
      obligations: [],
    };
  }

  private async applyInvoiceHeuristics(data: any): Promise<any> {
    return {
      documentType: 'invoice',
      amount: 0,
      date: '',
      vendor: '',
      items: [],
    };
  }

  private async applyReportHeuristics(data: any): Promise<any> {
    return {
      documentType: 'report',
      summary: '',
      findings: [],
      recommendations: [],
    };
  }

  private async applyGeneralHeuristics(data: any): Promise<any> {
    return {
      documentType: 'general',
      content: data.content,
      metadata: data.metadata,
    };
  }
}