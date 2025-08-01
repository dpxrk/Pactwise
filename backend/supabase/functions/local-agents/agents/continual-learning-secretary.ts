/**
 * Continual Learning Secretary Agent
 *
 * Secretary agent with continual learning capabilities that improves
 * document processing, pattern recognition, and user preferences over time.
 */

import { ContinualLearningBaseAgent } from './continual-learning-base.ts';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.ts';
import { z } from 'zod';

// Input/Output schemas
const DocumentProcessingInput = z.object({
  documentType: z.string(),
  content: z.string(),
  metadata: z.record(z.any()).optional(),
  userPreferences: z.record(z.any()).optional(),
});

const DocumentProcessingOutput = z.object({
  extractedData: z.record(z.any()),
  documentCategory: z.string(),
  suggestedActions: z.array(z.string()),
  confidence: z.number(),
  learningInsights: z.array(z.string()).optional(),
});

export class ContinualLearningSecretaryAgent extends ContinualLearningBaseAgent {
  get agentType() {
    return 'continual_secretary';
  }

  get capabilities() {
    return ['document_processing', 'pattern_learning', 'adaptive_response'];
  }

  async process(data: any, _context?: any): Promise<any> {
    // Main processing method implementation
    return {
      success: true,
      data: await this.processDocument(data),
      insights: [],
      rulesApplied: ['continual_learning'],
      confidence: 0.8,
      processingTime: Date.now(),
    };
  }
  private documentPatterns: Map<string, any> = new Map();
  private userPreferences: Map<string, any> = new Map();
  private processingStrategies: Map<string, any> = new Map();

  constructor(
    supabase: SupabaseClient<Database>,
    enterpriseId: string,
  ) {
    super(supabase, enterpriseId, {
      strategy: {
        name: 'Secretary-Optimized EWC',
        type: 'hybrid',
        hyperparameters: {
          lambda: 1500, // Higher regularization for stable document processing
          replayRatio: 0.15, // More replay for pattern retention
          compressionThreshold: 0.75,
          epochs: 15,
          batchSize: 16,
        },
      },
      performanceThresholds: {
        minRetention: 0.85, // Higher retention for consistency
        maxForgetting: 0.15,
        targetPlasticity: 0.8, // High adaptability to new document types
      },
    });
  }

  /**
   * Process document with continual learning
   */
  async processDocument(input: any): Promise<any> {
    const validated = DocumentProcessingInput.parse(input);

    // Start learning task for this document type
    await this.startLearningTask(
      `doc-${validated.documentType}-${Date.now()}`,
      `Processing ${validated.documentType} document`,
    );

    try {
      // Apply existing knowledge
      const existingKnowledge = await this.queryKnowledge(
        `document processing ${validated.documentType}`,
        validated.documentType,
      );

      // Process document using learned patterns
      const result = await this.processWithLearnedPatterns(
        validated,
        existingKnowledge,
      );

      // Record the experience
      await this.recordExperience(
        validated,
        result,
        this.calculateReward(result),
        this.calculateImportance(validated, result),
      );

      // Learn from user feedback if available
      if (validated.userPreferences) {
        await this.learnUserPreferences(validated.userPreferences);
      }

      // End learning task and get analysis
      const analysis = await this.endLearningTask();

      // Add learning insights to result
      if (analysis) {
        result.learningInsights = this.generateLearningInsights(analysis);
      }

      return DocumentProcessingOutput.parse(result);
    } catch (error) {
      // Still end the learning task
      await this.endLearningTask();
      throw error;
    }
  }

  /**
   * Learn from batch of documents
   */
  async learnFromDocumentBatch(documents: any[]): Promise<void> {
    await this.startLearningTask(
      `batch-learning-${Date.now()}`,
      `Learning from ${documents.length} documents`,
    );

    for (const doc of documents) {
      try {
        const validated = DocumentProcessingInput.parse(doc);
        const result = await this.processWithLearnedPatterns(validated, []);

        await this.recordExperience(
          validated,
          result,
          this.calculateReward(result),
          this.calculateImportance(validated, result),
        );
      } catch (error) {
        console.error('Error processing document in batch:', error);
      }
    }

    await this.endLearningTask();

    // Trigger consolidation after batch learning
    await this.consolidateKnowledge();
  }

  /**
   * Get document processing recommendations
   */
  async getProcessingRecommendations(documentType: string): Promise<{
    bestPractices: string[];
    commonPatterns: any[];
    suggestedOptimizations: string[];
  }> {
    const knowledge = await this.queryKnowledge(
      `best practices ${documentType}`,
      documentType,
    );

    const patterns = this.documentPatterns.get(documentType) || [];
    const stats = await this.getLearningStats();

    return {
      bestPractices: this.extractBestPractices(knowledge),
      commonPatterns: patterns,
      suggestedOptimizations: this.generateOptimizations(documentType, stats),
    };
  }

  /**
   * Process document with learned patterns
   */
  private async processWithLearnedPatterns(
    input: z.infer<typeof DocumentProcessingInput>,
    knowledge: any[],
  ): Promise<any> {
    // Extract data based on learned patterns
    const extractedData = await this.extractDataWithKnowledge(
      input.content,
      input.documentType,
      knowledge,
    );

    // Categorize document
    const category = await this.categorizeDocument(
      input.content,
      input.documentType,
      extractedData,
    );

    // Generate suggested actions
    const suggestedActions = await this.generateSuggestedActions(
      category,
      extractedData,
      input.userPreferences,
    );

    // Calculate confidence based on knowledge certainty
    const confidence = this.calculateConfidence(knowledge, extractedData);

    return {
      extractedData,
      documentCategory: category,
      suggestedActions,
      confidence,
    };
  }

  /**
   * Extract data using knowledge
   */
  private async extractDataWithKnowledge(
    content: string,
    documentType: string,
    knowledge: any[],
  ): Promise<any> {
    const extracted: any = {};

    // Apply learned extraction patterns
    const patterns = knowledge
      .filter(k => k.type === 'pattern' || k.type === 'extraction')
      .sort((a, b) => b.importance - a.importance);

    for (const pattern of patterns) {
      if (pattern.extractionRules) {
        const results = await this.applyExtractionRules(
          content,
          pattern.extractionRules,
        );
        Object.assign(extracted, results);
      }
    }

    // Fallback to basic extraction
    if (Object.keys(extracted).length === 0) {
      extracted.rawContent = content;
      extracted.documentType = documentType;
      extracted.processedAt = new Date().toISOString();
    }

    return extracted;
  }

  /**
   * Apply extraction rules
   */
  private async applyExtractionRules(content: string, rules: any): Promise<any> {
    const results: any = {};

    // Simplified rule application
    if (rules.regex) {
      for (const [field, pattern] of Object.entries(rules.regex)) {
        const match = content.match(new RegExp(pattern as string, 'i'));
        if (match) {
          results[field] = match[1] || match[0];
        }
      }
    }

    if (rules.keywords) {
      results.detectedKeywords = rules.keywords.filter((kw: string) =>
        content.toLowerCase().includes(kw.toLowerCase()),
      );
    }

    return results;
  }

  /**
   * Categorize document
   */
  private async categorizeDocument(
    content: string,
    documentType: string,
    extractedData: any,
  ): Promise<string> {
    // Use learned categories
    const knownCategories = await this.queryKnowledge(
      'document categories',
      'categorization',
    );

    if (knownCategories.length > 0) {
      // Find best matching category
      const scores = knownCategories.map(cat => ({
        category: cat.concept,
        score: this.calculateCategoryScore(content, extractedData, cat),
      }));

      scores.sort((a, b) => b.score - a.score);

      if (scores[0].score > 0.7) {
        return scores[0].category;
      }
    }

    // Default categorization
    return `${documentType}_general`;
  }

  /**
   * Generate suggested actions
   */
  private async generateSuggestedActions(
    category: string,
    _extractedData: any,
    userPreferences?: any,
  ): Promise<string[]> {
    const actions: string[] = [];

    // Query learned action patterns
    const actionKnowledge = await this.queryKnowledge(
      `actions for ${category}`,
      'actions',
    );

    // Apply learned actions
    for (const knowledge of actionKnowledge) {
      if (knowledge.suggestedAction) {
        actions.push(knowledge.suggestedAction);
      }
    }

    // Apply user preference-based actions
    if (userPreferences) {
      const prefActions = this.generatePreferenceBasedActions(
        category,
        userPreferences,
      );
      actions.push(...prefActions);
    }

    // Default actions if none found
    if (actions.length === 0) {
      actions.push('Review document', 'File in appropriate folder');
    }

    return Array.from(new Set(actions)); // Remove duplicates
  }

  /**
   * Calculate reward for learning
   */
  private calculateReward(result: any): number {
    let reward = 0;

    // Reward for successful extraction
    if (result.extractedData && Object.keys(result.extractedData).length > 2) {
      reward += 0.5;
    }

    // Reward for high confidence
    if (result.confidence > 0.8) {
      reward += 0.3;
    }

    // Reward for actionable suggestions
    if (result.suggestedActions && result.suggestedActions.length > 0) {
      reward += 0.2;
    }

    return Math.min(1, reward);
  }

  /**
   * Calculate experience importance
   */
  private calculateImportance(input: any, _result: any): number {
    let importance = 0.5; // Base importance

    // Higher importance for new document types
    if (!this.documentPatterns.has(input.documentType)) {
      importance += 0.3;
    }

    // Higher importance for complex documents
    if (input.content.length > 1000) {
      importance += 0.1;
    }

    // Higher importance for user preference learning
    if (input.userPreferences) {
      importance += 0.1;
    }

    return Math.min(1, importance);
  }

  /**
   * Learn user preferences
   */
  private async learnUserPreferences(preferences: any): Promise<void> {
    for (const [key, value] of Object.entries(preferences)) {
      const existing = this.userPreferences.get(key) || { count: 0, values: [] };
      existing.count++;
      existing.values.push(value);

      // Keep only recent preferences
      if (existing.values.length > 100) {
        existing.values = existing.values.slice(-100);
      }

      this.userPreferences.set(key, existing);
    }
  }

  /**
   * Generate learning insights
   */
  private generateLearningInsights(analysis: any): string[] {
    const insights: string[] = [];

    if (analysis.knowledgeRetention > 0.9) {
      insights.push('Excellent retention of document processing patterns');
    }

    if (analysis.transferEfficiency > 0.7) {
      insights.push('Successfully applying knowledge across document types');
    }

    if (analysis.adaptationSpeed > 0.8) {
      insights.push('Rapidly adapting to new document formats');
    }

    for (const rec of analysis.recommendations) {
      if (rec.priority === 'high') {
        insights.push(`Recommendation: ${rec.description}`);
      }
    }

    return insights;
  }

  /**
   * Extract best practices from knowledge
   */
  private extractBestPractices(knowledge: any[]): string[] {
    return knowledge
      .filter(k => k.type === 'best_practice' || k.importance > 0.8)
      .map(k => k.concept || k.description)
      .filter(Boolean)
      .slice(0, 10);
  }

  /**
   * Generate optimization suggestions
   */
  private generateOptimizations(documentType: string, stats: any): string[] {
    const optimizations: string[] = [];

    if (stats.averageRetention < 0.8) {
      optimizations.push('Consider more frequent consolidation for this document type');
    }

    if (stats.crossTaskPatterns > 5) {
      optimizations.push('Leverage cross-document patterns for improved processing');
    }

    if (!this.processingStrategies.has(documentType)) {
      optimizations.push('Develop specialized processing strategy for this document type');
    }

    return optimizations;
  }

  /**
   * Calculate category score
   */
  private calculateCategoryScore(content: string, extractedData: any, category: any): number {
    let score = 0;

    // Check for category keywords
    if (category.keywords) {
      const matchedKeywords = category.keywords.filter((kw: string) =>
        content.toLowerCase().includes(kw.toLowerCase()),
      );
      score += matchedKeywords.length / category.keywords.length * 0.5;
    }

    // Check extracted data patterns
    if (category.dataPatterns) {
      const matchedPatterns = Object.keys(extractedData).filter(key =>
        category.dataPatterns.includes(key),
      );
      score += matchedPatterns.length / category.dataPatterns.length * 0.5;
    }

    return score;
  }

  /**
   * Generate preference-based actions
   */
  private generatePreferenceBasedActions(_category: string, preferences: any): string[] {
    const actions: string[] = [];

    if (preferences.autoFile && preferences.fileLocation) {
      actions.push(`Auto-file to ${preferences.fileLocation}`);
    }

    if (preferences.notify && preferences.notifyUsers) {
      actions.push(`Notify ${preferences.notifyUsers.join(', ')}`);
    }

    if (preferences.extract && preferences.extractFields) {
      actions.push('Extract specified fields for database');
    }

    return actions;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(knowledge: any[], extractedData: any): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence with more relevant knowledge
    if (knowledge.length > 0) {
      const avgRelevance = knowledge.reduce((sum, k) => sum + (k.relevance || 0), 0) / knowledge.length;
      confidence += avgRelevance * 0.3;
    }

    // Higher confidence with more extracted data
    const extractedFields = Object.keys(extractedData).length;
    if (extractedFields > 5) {
      confidence += 0.2;
    }

    return Math.min(0.95, confidence); // Cap at 95%
  }

  /**
   * Compute query embedding for knowledge search
   */
  protected async computeQueryEmbedding(query: string): Promise<number[]> {
    // Simplified embedding computation
    const words = query.toLowerCase().split(/\s+/);
    const embedding = new Array(128).fill(0);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      for (let j = 0; j < word.length; j++) {
        const idx = (word.charCodeAt(j) + i) % 128;
        embedding[idx] += 1 / (i + 1);
      }
    }

    // Normalize
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / (norm + 1e-10));
  }

  /**
   * Apply knowledge item to situation
   */
  protected async applyKnowledgeItem(knowledge: any, situation: any): Promise<any> {
    // Apply the knowledge to process the document
    if (knowledge.extractionRules) {
      return this.applyExtractionRules(situation.content, knowledge.extractionRules);
    }

    if (knowledge.processingStrategy) {
      return this.applyProcessingStrategy(situation, knowledge.processingStrategy);
    }

    // Default application
    return {
      appliedKnowledge: knowledge.concept || knowledge.id,
      confidence: knowledge.importance || 0.5,
    };
  }

  /**
   * Apply processing strategy
   */
  private async applyProcessingStrategy(situation: any, strategy: any): Promise<any> {
    // Simplified strategy application
    return {
      extractedData: {
        documentType: situation.documentType,
        processedWith: strategy.name || 'learned_strategy',
      },
      documentCategory: strategy.category || 'general',
      suggestedActions: strategy.actions || ['Review processed document'],
      confidence: strategy.confidence || 0.7,
    };
  }

  /**
   * Get agent capabilities with learning status
   */
  async getCapabilities(): Promise<any> {
    const stats = await this.getLearningStats();

    return {
      capabilities: this.capabilities,
      continualLearning: {
        enabled: this.learningEnabled,
        totalTasksLearned: stats.totalTasks,
        knowledgeRetention: stats.averageRetention,
        documentPatternsLearned: this.documentPatterns.size,
        userPreferencesTracked: this.userPreferences.size,
        crossDocumentPatterns: stats.crossTaskPatterns,
      },
      specializedCapabilities: [
        'Adaptive document processing',
        'Pattern learning and recognition',
        'User preference adaptation',
        'Cross-document insight generation',
        'Continuous improvement without forgetting',
      ],
    };
  }
}