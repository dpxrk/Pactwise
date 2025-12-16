/**
 * Donna AI Feedback Loop Manager
 *
 * Manages the complete lifecycle of recommendation tracking:
 * - Tracking recommendation shown events
 * - Recording user responses
 * - Tracking implementation status
 * - Recording outcomes
 * - Triggering learning updates
 *
 * All data is anonymized to prevent cross-enterprise data leakage.
 */

import { createAdminClient } from '../../_shared/supabase.ts';

// ============================================================================
// TYPES
// ============================================================================

export type RecommendationType =
  | 'pattern'
  | 'best_practice'
  | 'q_learning'
  | 'bandit'
  | 'insight'
  | 'market_intelligence';

export type UserResponse =
  | 'accepted'
  | 'rejected'
  | 'modified'
  | 'ignored'
  | 'deferred';

export type ImplementationStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'abandoned'
  | 'partial';

export type OutcomeStatus =
  | 'success'
  | 'partial_success'
  | 'failure'
  | 'neutral'
  | 'unknown';

export interface RecommendationContext {
  /** Category like 'contract_review', 'vendor_selection', 'budget_planning' */
  category: string;
  /** Anonymized industry category */
  industry?: string;
  /** Size category: 'small', 'medium', 'large', 'enterprise' */
  sizeCategory?: 'small' | 'medium' | 'large' | 'enterprise';
}

export interface RecommendationData {
  type: RecommendationType;
  content: Record<string, unknown>;
  confidenceScore?: number;
  predictedOutcome?: string;
  sourcePatternId?: string;
  sourceBestPracticeId?: string;
}

export interface TrackingRecord {
  id: string;
  recommendationType: RecommendationType;
  context: RecommendationContext;
  shownAt: Date;
  userResponse?: UserResponse;
  responseAt?: Date;
  implementationStatus: ImplementationStatus;
  outcomeStatus?: OutcomeStatus;
  feedbackScore?: number;
}

export interface FeedbackEvent {
  eventType: string;
  eventData: Record<string, unknown>;
  timestamp: Date;
}

// ============================================================================
// FEEDBACK LOOP MANAGER
// ============================================================================

export class FeedbackLoopManager {
  private supabase = createAdminClient();

  /**
   * Track when a recommendation is shown to the user
   */
  async trackRecommendationShown(
    recommendation: RecommendationData,
    context: RecommendationContext
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from('donna_recommendation_tracking')
      .insert({
        recommendation_id: crypto.randomUUID(),
        recommendation_type: recommendation.type,
        source_pattern_id: recommendation.sourcePatternId,
        source_best_practice_id: recommendation.sourceBestPracticeId,
        context_category: context.category,
        context_industry: context.industry,
        context_size_category: context.sizeCategory,
        recommendation_content: recommendation.content,
        confidence_score: recommendation.confidenceScore,
        predicted_outcome: recommendation.predictedOutcome,
        shown_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to track recommendation shown:', error);
      throw new Error(`Failed to track recommendation: ${error.message}`);
    }

    // Record event
    await this.recordEvent(data.id, 'recommendation_shown', {
      recommendation_type: recommendation.type,
      confidence_score: recommendation.confidenceScore,
    });

    return data.id;
  }

  /**
   * Record user response to a recommendation
   */
  async recordUserResponse(
    trackingId: string,
    response: UserResponse,
    modificationNotes?: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('donna_recommendation_tracking')
      .update({
        user_response: response,
        response_at: new Date().toISOString(),
        user_modification_notes: modificationNotes,
      })
      .eq('id', trackingId);

    if (error) {
      console.error('Failed to record user response:', error);
      throw new Error(`Failed to record response: ${error.message}`);
    }

    await this.recordEvent(trackingId, 'user_responded', {
      response,
      modification_notes: modificationNotes,
    });

    // If rejected or ignored, we can trigger early learning
    if (response === 'rejected' || response === 'ignored') {
      await this.triggerLearningUpdate(trackingId, 'early_feedback');
    }
  }

  /**
   * Record implementation status changes
   */
  async recordImplementationStatus(
    trackingId: string,
    status: ImplementationStatus,
    progressNotes?: string
  ): Promise<void> {
    const updates: Record<string, unknown> = {
      implementation_status: status,
    };

    // Set appropriate timestamps
    if (status === 'in_progress') {
      updates.implementation_started_at = new Date().toISOString();
    } else if (status === 'completed' || status === 'abandoned' || status === 'partial') {
      updates.implementation_completed_at = new Date().toISOString();
    }

    const { error } = await this.supabase
      .from('donna_recommendation_tracking')
      .update(updates)
      .eq('id', trackingId);

    if (error) {
      console.error('Failed to record implementation status:', error);
      throw new Error(`Failed to record implementation: ${error.message}`);
    }

    const eventType = status === 'in_progress'
      ? 'implementation_started'
      : status === 'completed'
        ? 'implementation_completed'
        : status === 'abandoned'
          ? 'implementation_abandoned'
          : 'implementation_progress';

    await this.recordEvent(trackingId, eventType, {
      status,
      notes: progressNotes,
    });
  }

  /**
   * Record outcome of a recommendation
   */
  async recordOutcome(
    trackingId: string,
    outcome: {
      status: OutcomeStatus;
      value?: number;
      valueUnit?: string;
      notes?: string;
    }
  ): Promise<void> {
    const { error } = await this.supabase
      .from('donna_recommendation_tracking')
      .update({
        outcome_status: outcome.status,
        outcome_value: outcome.value,
        outcome_value_unit: outcome.valueUnit,
        outcome_notes: outcome.notes,
        outcome_recorded_at: new Date().toISOString(),
      })
      .eq('id', trackingId);

    if (error) {
      console.error('Failed to record outcome:', error);
      throw new Error(`Failed to record outcome: ${error.message}`);
    }

    await this.recordEvent(trackingId, 'outcome_measured', outcome);

    // Trigger learning update with the outcome
    await this.triggerLearningUpdate(trackingId, 'outcome_recorded');
  }

  /**
   * Get tracking record by ID
   */
  async getTrackingRecord(trackingId: string): Promise<TrackingRecord | null> {
    const { data, error } = await this.supabase
      .from('donna_recommendation_tracking')
      .select('*')
      .eq('id', trackingId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get tracking record: ${error.message}`);
    }

    return {
      id: data.id,
      recommendationType: data.recommendation_type,
      context: {
        category: data.context_category,
        industry: data.context_industry,
        sizeCategory: data.context_size_category,
      },
      shownAt: new Date(data.shown_at),
      userResponse: data.user_response,
      responseAt: data.response_at ? new Date(data.response_at) : undefined,
      implementationStatus: data.implementation_status,
      outcomeStatus: data.outcome_status,
      feedbackScore: data.feedback_score,
    };
  }

  /**
   * Get feedback events for a recommendation
   */
  async getEventHistory(trackingId: string): Promise<FeedbackEvent[]> {
    const { data, error } = await this.supabase
      .from('donna_feedback_events')
      .select('event_type, event_data, event_timestamp')
      .eq('recommendation_tracking_id', trackingId)
      .order('sequence_number', { ascending: true });

    if (error) {
      throw new Error(`Failed to get event history: ${error.message}`);
    }

    return (data || []).map(e => ({
      eventType: e.event_type,
      eventData: e.event_data,
      timestamp: new Date(e.event_timestamp),
    }));
  }

  /**
   * Get quality metrics for a time period
   */
  async getQualityMetrics(
    options: {
      bucketType?: 'hourly' | 'daily' | 'weekly';
      recommendationType?: RecommendationType;
      startTime?: Date;
      endTime?: Date;
      limit?: number;
    } = {}
  ): Promise<Record<string, unknown>[]> {
    let query = this.supabase
      .from('donna_feedback_quality_metrics')
      .select('*')
      .order('time_bucket', { ascending: false });

    if (options.bucketType) {
      query = query.eq('bucket_type', options.bucketType);
    }
    if (options.recommendationType) {
      query = query.eq('recommendation_type', options.recommendationType);
    }
    if (options.startTime) {
      query = query.gte('time_bucket', options.startTime.toISOString());
    }
    if (options.endTime) {
      query = query.lte('time_bucket', options.endTime.toISOString());
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get quality metrics: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Calculate summary metrics
   */
  async getSummaryMetrics(): Promise<{
    totalRecommendations: number;
    acceptanceRate: number;
    successRate: number;
    averageFeedbackScore: number;
    avgResponseTimeSeconds: number;
  }> {
    const { data, error } = await this.supabase
      .from('donna_recommendation_tracking')
      .select('user_response, outcome_status, feedback_score, time_to_response_seconds')
      .gte('shown_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

    if (error) {
      throw new Error(`Failed to get summary metrics: ${error.message}`);
    }

    const records = data || [];
    const totalRecommendations = records.length;

    if (totalRecommendations === 0) {
      return {
        totalRecommendations: 0,
        acceptanceRate: 0,
        successRate: 0,
        averageFeedbackScore: 0,
        avgResponseTimeSeconds: 0,
      };
    }

    const accepted = records.filter(r => r.user_response === 'accepted').length;
    const withOutcome = records.filter(r =>
      r.outcome_status && ['success', 'partial_success', 'failure'].includes(r.outcome_status)
    );
    const successes = records.filter(r => r.outcome_status === 'success').length;

    const feedbackScores = records.filter(r => r.feedback_score !== null).map(r => r.feedback_score);
    const responseTimes = records.filter(r => r.time_to_response_seconds !== null).map(r => r.time_to_response_seconds);

    return {
      totalRecommendations,
      acceptanceRate: totalRecommendations > 0 ? accepted / totalRecommendations : 0,
      successRate: withOutcome.length > 0 ? successes / withOutcome.length : 0,
      averageFeedbackScore: feedbackScores.length > 0
        ? feedbackScores.reduce((a, b) => a + b, 0) / feedbackScores.length
        : 0,
      avgResponseTimeSeconds: responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0,
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Record a feedback event
   */
  private async recordEvent(
    trackingId: string,
    eventType: string,
    eventData: Record<string, unknown>
  ): Promise<void> {
    const { error } = await this.supabase
      .from('donna_feedback_events')
      .insert({
        recommendation_tracking_id: trackingId,
        event_type: eventType,
        event_data: eventData,
      });

    if (error) {
      console.error('Failed to record feedback event:', error);
      // Don't throw - event recording is non-critical
    }
  }

  /**
   * Trigger learning update based on feedback
   */
  private async triggerLearningUpdate(
    trackingId: string,
    reason: string
  ): Promise<void> {
    // Record that we're triggering a learning update
    await this.recordEvent(trackingId, 'learning_update_triggered', { reason });

    // The actual learning processing is handled by LearningFeedbackProcessor
    // We just need to mark this recommendation as ready for processing
    // The processor runs on a schedule and picks up records with outcomes

    console.log(`Learning update triggered for ${trackingId}: ${reason}`);
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let feedbackLoopManager: FeedbackLoopManager | null = null;

export function getFeedbackLoopManager(): FeedbackLoopManager {
  if (!feedbackLoopManager) {
    feedbackLoopManager = new FeedbackLoopManager();
  }
  return feedbackLoopManager;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Track a recommendation being shown
 */
export async function trackRecommendationShown(
  recommendation: RecommendationData,
  context: RecommendationContext
): Promise<string> {
  return getFeedbackLoopManager().trackRecommendationShown(recommendation, context);
}

/**
 * Record user response
 */
export async function recordUserResponse(
  trackingId: string,
  response: UserResponse,
  modificationNotes?: string
): Promise<void> {
  return getFeedbackLoopManager().recordUserResponse(trackingId, response, modificationNotes);
}

/**
 * Record implementation status
 */
export async function recordImplementationStatus(
  trackingId: string,
  status: ImplementationStatus,
  progressNotes?: string
): Promise<void> {
  return getFeedbackLoopManager().recordImplementationStatus(trackingId, status, progressNotes);
}

/**
 * Record outcome
 */
export async function recordOutcome(
  trackingId: string,
  outcome: {
    status: OutcomeStatus;
    value?: number;
    valueUnit?: string;
    notes?: string;
  }
): Promise<void> {
  return getFeedbackLoopManager().recordOutcome(trackingId, outcome);
}
