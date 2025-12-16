/**
 * Learning Feedback Processor
 *
 * Processes feedback data and updates Donna's learning models:
 * - Q-value updates based on outcome vs prediction delta
 * - Pattern confidence Bayesian updates
 * - Best practice success rate weighted averaging
 * - Automatic pattern deprecation (confidence < 0.3, 10+ samples)
 * - Automatic pattern promotion (confidence > 0.8, 5+ samples)
 */

import { createAdminClient } from '../../_shared/supabase.ts';
import type {
  RecommendationType,
  OutcomeStatus,
  UserResponse,
} from './feedback-loop.ts';

// ============================================================================
// TYPES
// ============================================================================

export interface FeedbackRecord {
  id: string;
  recommendationType: RecommendationType;
  sourcePatternId?: string;
  sourceBestPracticeId?: string;
  contextCategory: string;
  userResponse?: UserResponse;
  outcomeStatus?: OutcomeStatus;
  outcomeValue?: number;
  confidenceScore?: number;
  feedbackScore?: number;
  predictedOutcome?: string;
}

export interface LearningUpdate {
  updateType: string;
  sourceRecommendationId: string;
  targetPatternId?: string;
  targetBestPracticeId?: string;
  previousValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
  updateReason: string;
  sampleCount: number;
}

export interface ProcessingResult {
  processedCount: number;
  updatesApplied: number;
  patternsPromoted: number;
  patternsDeprecated: number;
  bestPracticesUpdated: number;
  qValuesUpdated: number;
  errors: string[];
}

// ============================================================================
// LEARNING CONSTANTS
// ============================================================================

const LEARNING_CONFIG = {
  // Q-learning parameters
  qLearningRate: 0.1,
  qDiscountFactor: 0.99,

  // Pattern confidence thresholds
  patternPromotionThreshold: 0.8,
  patternDeprecationThreshold: 0.3,
  patternMinSamplesForPromotion: 5,
  patternMinSamplesForDeprecation: 10,

  // Best practice thresholds
  bestPracticePromotionThreshold: 0.8,
  bestPracticeMinSamples: 5,

  // Bayesian update parameters
  bayesianPriorStrength: 2, // How much to weight prior vs new evidence

  // Processing limits
  batchSize: 100,
  maxRetries: 3,
};

// ============================================================================
// LEARNING FEEDBACK PROCESSOR
// ============================================================================

export class LearningFeedbackProcessor {
  private supabase = createAdminClient();

  /**
   * Process pending feedback records and update learning models
   */
  async processPendingFeedback(): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      processedCount: 0,
      updatesApplied: 0,
      patternsPromoted: 0,
      patternsDeprecated: 0,
      bestPracticesUpdated: 0,
      qValuesUpdated: 0,
      errors: [],
    };

    try {
      // Get records with outcomes that haven't been processed for learning
      const { data: records, error } = await this.supabase
        .from('donna_recommendation_tracking')
        .select('*')
        .not('outcome_status', 'is', null)
        .order('outcome_recorded_at', { ascending: true })
        .limit(LEARNING_CONFIG.batchSize);

      if (error) {
        throw new Error(`Failed to fetch feedback records: ${error.message}`);
      }

      if (!records || records.length === 0) {
        console.log('No pending feedback records to process');
        return result;
      }

      // Process each record
      for (const record of records) {
        try {
          await this.processRecord(record, result);
          result.processedCount++;
        } catch (recordError) {
          const errorMessage = recordError instanceof Error
            ? recordError.message
            : String(recordError);
          result.errors.push(`Record ${record.id}: ${errorMessage}`);
        }
      }

      // Run pattern maintenance (promotion/deprecation)
      await this.runPatternMaintenance(result);

      console.log('Feedback processing completed:', result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(`Processing error: ${errorMessage}`);
      return result;
    }
  }

  /**
   * Process a single feedback record
   */
  private async processRecord(
    record: Record<string, unknown>,
    result: ProcessingResult
  ): Promise<void> {
    const feedbackRecord: FeedbackRecord = {
      id: record.id as string,
      recommendationType: record.recommendation_type as RecommendationType,
      sourcePatternId: record.source_pattern_id as string | undefined,
      sourceBestPracticeId: record.source_best_practice_id as string | undefined,
      contextCategory: record.context_category as string,
      userResponse: record.user_response as UserResponse | undefined,
      outcomeStatus: record.outcome_status as OutcomeStatus | undefined,
      outcomeValue: record.outcome_value as number | undefined,
      confidenceScore: record.confidence_score as number | undefined,
      feedbackScore: record.feedback_score as number | undefined,
      predictedOutcome: record.predicted_outcome as string | undefined,
    };

    // Update based on recommendation type
    switch (feedbackRecord.recommendationType) {
      case 'pattern':
        if (feedbackRecord.sourcePatternId) {
          await this.updatePatternConfidence(feedbackRecord);
          result.updatesApplied++;
        }
        break;

      case 'best_practice':
        if (feedbackRecord.sourceBestPracticeId) {
          await this.updateBestPracticeRate(feedbackRecord);
          result.bestPracticesUpdated++;
        }
        break;

      case 'q_learning':
        await this.updateQValue(feedbackRecord);
        result.qValuesUpdated++;
        break;

      case 'bandit':
        await this.updateBanditArm(feedbackRecord);
        result.updatesApplied++;
        break;

      default:
        // For insight and market_intelligence, just record the feedback
        console.log(`Recorded feedback for ${feedbackRecord.recommendationType}`);
    }
  }

  /**
   * Update pattern confidence using Bayesian update
   */
  private async updatePatternConfidence(record: FeedbackRecord): Promise<void> {
    if (!record.sourcePatternId || record.feedbackScore === undefined) return;

    // Get current pattern data
    const { data: pattern, error: fetchError } = await this.supabase
      .from('donna_patterns')
      .select('id, confidence, total_observations')
      .eq('id', record.sourcePatternId)
      .single();

    if (fetchError || !pattern) {
      console.error('Pattern not found:', record.sourcePatternId);
      return;
    }

    // Bayesian update: weighted average of prior and new evidence
    const priorConfidence = pattern.confidence || 0.5;
    const priorObservations = pattern.total_observations || 0;
    const priorWeight = Math.min(priorObservations / LEARNING_CONFIG.bayesianPriorStrength, 10);

    const newConfidence = (priorConfidence * priorWeight + record.feedbackScore) / (priorWeight + 1);
    const newObservations = priorObservations + 1;

    // Update pattern
    const { error: updateError } = await this.supabase
      .from('donna_patterns')
      .update({
        confidence: newConfidence,
        total_observations: newObservations,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', record.sourcePatternId);

    if (updateError) {
      console.error('Failed to update pattern confidence:', updateError);
      return;
    }

    // Record learning update
    await this.recordLearningUpdate({
      updateType: 'pattern_confidence_update',
      sourceRecommendationId: record.id,
      targetPatternId: record.sourcePatternId,
      previousValue: { confidence: priorConfidence, observations: priorObservations },
      newValue: { confidence: newConfidence, observations: newObservations },
      updateReason: `Feedback score: ${record.feedbackScore.toFixed(3)}`,
      sampleCount: newObservations,
    });
  }

  /**
   * Update best practice success rate using weighted averaging
   */
  private async updateBestPracticeRate(record: FeedbackRecord): Promise<void> {
    if (!record.sourceBestPracticeId || record.outcomeStatus === undefined) return;

    const isSuccess = record.outcomeStatus === 'success' ||
      record.outcomeStatus === 'partial_success';

    // Get current best practice data
    const { data: bestPractice, error: fetchError } = await this.supabase
      .from('donna_best_practices')
      .select('id, success_rate, times_recommended')
      .eq('id', record.sourceBestPracticeId)
      .single();

    if (fetchError || !bestPractice) {
      console.error('Best practice not found:', record.sourceBestPracticeId);
      return;
    }

    const priorRate = bestPractice.success_rate || 0.5;
    const priorCount = bestPractice.times_recommended || 0;

    // Weighted average update
    const newCount = priorCount + 1;
    const successValue = isSuccess ? 1 : 0;
    const newRate = (priorRate * priorCount + successValue) / newCount;

    // Update best practice
    const { error: updateError } = await this.supabase
      .from('donna_best_practices')
      .update({
        success_rate: newRate,
        times_recommended: newCount,
        last_recommended: new Date().toISOString(),
      })
      .eq('id', record.sourceBestPracticeId);

    if (updateError) {
      console.error('Failed to update best practice rate:', updateError);
      return;
    }

    // Record learning update
    await this.recordLearningUpdate({
      updateType: 'best_practice_rate_update',
      sourceRecommendationId: record.id,
      targetBestPracticeId: record.sourceBestPracticeId,
      previousValue: { success_rate: priorRate, count: priorCount },
      newValue: { success_rate: newRate, count: newCount },
      updateReason: `Outcome: ${record.outcomeStatus}`,
      sampleCount: newCount,
    });
  }

  /**
   * Update Q-value based on outcome
   */
  private async updateQValue(record: FeedbackRecord): Promise<void> {
    if (record.feedbackScore === undefined) return;

    // Calculate reward from feedback score
    const reward = (record.feedbackScore - 0.5) * 2; // Map [0,1] to [-1,1]

    // Get current Q-value for this context/action
    const stateHash = this.hashContext(record.contextCategory);

    const { data: qEntry, error: fetchError } = await this.supabase
      .from('donna_q_table')
      .select('state_hash, action, q_value, visit_count')
      .eq('state_hash', stateHash)
      .eq('action', record.recommendationType)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Failed to fetch Q-value:', fetchError);
      return;
    }

    const currentQ = qEntry?.q_value || 0;
    const visitCount = qEntry?.visit_count || 0;

    // Q-value update: Q(s,a) = Q(s,a) + α * (r - Q(s,a))
    // Using feedback score as the reward
    const newQ = currentQ + LEARNING_CONFIG.qLearningRate * (reward - currentQ);
    const newVisitCount = visitCount + 1;

    // Upsert Q-value
    const { error: upsertError } = await this.supabase
      .from('donna_q_table')
      .upsert({
        state_hash: stateHash,
        action: record.recommendationType,
        q_value: newQ,
        visit_count: newVisitCount,
        last_updated: new Date().toISOString(),
      });

    if (upsertError) {
      console.error('Failed to update Q-value:', upsertError);
      return;
    }

    // Record learning update
    await this.recordLearningUpdate({
      updateType: 'q_value_update',
      sourceRecommendationId: record.id,
      previousValue: { q_value: currentQ, visits: visitCount },
      newValue: { q_value: newQ, visits: newVisitCount },
      updateReason: `Reward: ${reward.toFixed(3)} from feedback score ${record.feedbackScore.toFixed(3)}`,
      sampleCount: newVisitCount,
    });
  }

  /**
   * Update bandit arm statistics
   */
  private async updateBanditArm(record: FeedbackRecord): Promise<void> {
    const isSuccess = record.outcomeStatus === 'success' ||
      record.outcomeStatus === 'partial_success';

    // Get current arm data
    const { data: arm, error: fetchError } = await this.supabase
      .from('donna_bandit_arms')
      .select('id, arm_name, success_count, failure_count, play_count')
      .eq('arm_name', record.contextCategory)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Failed to fetch bandit arm:', fetchError);
      return;
    }

    const successCount = (arm?.success_count || 0) + (isSuccess ? 1 : 0);
    const failureCount = (arm?.failure_count || 0) + (isSuccess ? 0 : 1);
    const playCount = (arm?.play_count || 0) + 1;

    // Upsert arm data
    const { error: upsertError } = await this.supabase
      .from('donna_bandit_arms')
      .upsert({
        arm_name: record.contextCategory,
        success_count: successCount,
        failure_count: failureCount,
        play_count: playCount,
        average_reward: successCount / playCount,
        last_played: new Date().toISOString(),
      });

    if (upsertError) {
      console.error('Failed to update bandit arm:', upsertError);
      return;
    }

    // Record learning update
    await this.recordLearningUpdate({
      updateType: 'bandit_arm_update',
      sourceRecommendationId: record.id,
      previousValue: {
        success: arm?.success_count || 0,
        failure: arm?.failure_count || 0,
      },
      newValue: {
        success: successCount,
        failure: failureCount,
      },
      updateReason: `Outcome: ${isSuccess ? 'success' : 'failure'}`,
      sampleCount: playCount,
    });
  }

  /**
   * Run pattern maintenance: promote/deprecate patterns based on performance
   */
  private async runPatternMaintenance(result: ProcessingResult): Promise<void> {
    // Deprecate low-confidence patterns with enough samples
    const { data: lowConfidencePatterns } = await this.supabase
      .from('donna_patterns')
      .select('id, confidence, total_observations, is_active')
      .lt('confidence', LEARNING_CONFIG.patternDeprecationThreshold)
      .gte('total_observations', LEARNING_CONFIG.patternMinSamplesForDeprecation)
      .eq('is_active', true);

    for (const pattern of lowConfidencePatterns || []) {
      const { error } = await this.supabase
        .from('donna_patterns')
        .update({ is_active: false, deprecated_at: new Date().toISOString() })
        .eq('id', pattern.id);

      if (!error) {
        result.patternsDeprecated++;
        await this.recordLearningUpdate({
          updateType: 'pattern_deprecated',
          sourceRecommendationId: '',
          targetPatternId: pattern.id,
          previousValue: { is_active: true, confidence: pattern.confidence },
          newValue: { is_active: false, confidence: pattern.confidence },
          updateReason: `Confidence ${pattern.confidence.toFixed(3)} below threshold with ${pattern.total_observations} samples`,
          sampleCount: pattern.total_observations,
        });
      }
    }

    // Promote high-confidence patterns
    const { data: highConfidencePatterns } = await this.supabase
      .from('donna_patterns')
      .select('id, confidence, total_observations, is_promoted')
      .gte('confidence', LEARNING_CONFIG.patternPromotionThreshold)
      .gte('total_observations', LEARNING_CONFIG.patternMinSamplesForPromotion)
      .eq('is_promoted', false);

    for (const pattern of highConfidencePatterns || []) {
      const { error } = await this.supabase
        .from('donna_patterns')
        .update({ is_promoted: true, promoted_at: new Date().toISOString() })
        .eq('id', pattern.id);

      if (!error) {
        result.patternsPromoted++;
        await this.recordLearningUpdate({
          updateType: 'pattern_promoted',
          sourceRecommendationId: '',
          targetPatternId: pattern.id,
          previousValue: { is_promoted: false, confidence: pattern.confidence },
          newValue: { is_promoted: true, confidence: pattern.confidence },
          updateReason: `Confidence ${pattern.confidence.toFixed(3)} above threshold with ${pattern.total_observations} samples`,
          sampleCount: pattern.total_observations,
        });
      }
    }
  }

  /**
   * Record a learning update for transparency
   */
  private async recordLearningUpdate(update: LearningUpdate): Promise<void> {
    const { error } = await this.supabase
      .from('donna_learning_updates')
      .insert({
        update_type: update.updateType,
        source_recommendation_id: update.sourceRecommendationId || null,
        target_pattern_id: update.targetPatternId,
        target_best_practice_id: update.targetBestPracticeId,
        previous_value: update.previousValue,
        new_value: update.newValue,
        update_reason: update.updateReason,
        sample_count: update.sampleCount,
      });

    if (error) {
      console.error('Failed to record learning update:', error);
    }
  }

  /**
   * Hash a context string for Q-table lookup
   */
  private hashContext(context: string): string {
    // Simple hash for context (in production, use a proper hash function)
    let hash = 0;
    for (let i = 0; i < context.length; i++) {
      const char = context.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `ctx_${Math.abs(hash).toString(16)}`;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let processorInstance: LearningFeedbackProcessor | null = null;

export function getLearningFeedbackProcessor(): LearningFeedbackProcessor {
  if (!processorInstance) {
    processorInstance = new LearningFeedbackProcessor();
  }
  return processorInstance;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Process all pending feedback and update learning models
 */
export async function processPendingFeedback(): Promise<ProcessingResult> {
  return getLearningFeedbackProcessor().processPendingFeedback();
}
