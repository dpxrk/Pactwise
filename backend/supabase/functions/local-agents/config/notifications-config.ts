import { z } from 'zod';

/**
 * Notifications Agent Configuration System
 *
 * Provides enterprise-customizable thresholds for the Notifications Agent.
 * Configuration is loaded from database (enterprise_settings table) and cached.
 *
 * ## Categories
 * - Alert Severity Thresholds: Escalation timing for different severity levels
 * - Reminder Timing Thresholds: Advance notice periods for reminders
 * - Digest Settings: Aggregation timing and limits
 * - Rate Limiting: Notification volume controls
 * - Channel Selection Rules: Channel routing by severity
 * - Timeout & Retry Settings: Delivery reliability parameters
 * - Feature Flags: Toggle advanced features
 *
 * @module NotificationsConfig
 * @version 1.0.0
 */

// =============================================================================
// CONFIGURATION SCHEMA
// =============================================================================

/**
 * Zod schema for Notifications Agent configuration validation
 */
export const NotificationsConfigSchema = z.object({
  // ================================
  // ALERT SEVERITY THRESHOLDS
  // ================================

  /** Minutes before critical alerts escalate to next level */
  criticalEscalationMinutes: z.number()
    .min(1)
    .max(1440) // Max 24 hours
    .default(15),

  /** Minutes before high-severity alerts escalate */
  highEscalationMinutes: z.number()
    .min(1)
    .max(1440)
    .default(60),

  /** Minutes before medium-severity alerts escalate */
  mediumEscalationMinutes: z.number()
    .min(1)
    .max(1440)
    .default(240),

  /** Number of escalation levels for critical alerts */
  criticalEscalationLevels: z.number()
    .int()
    .min(1)
    .max(5)
    .default(3),

  /** Number of escalation levels for high-severity alerts */
  highEscalationLevels: z.number()
    .int()
    .min(1)
    .max(5)
    .default(2),

  // ================================
  // REMINDER TIMING THRESHOLDS
  // ================================

  /** Days threshold for urgent reminders (items due within this period) */
  urgentReminderDays: z.number()
    .int()
    .min(1)
    .max(7)
    .default(1),

  /** Days threshold for upcoming reminders */
  upcomingReminderDays: z.number()
    .int()
    .min(1)
    .max(30)
    .default(7),

  /** Days threshold for advance reminders */
  advanceReminderDays: z.number()
    .int()
    .min(7)
    .max(90)
    .default(30),

  /** Days overdue before escalating reminder to manager */
  overdueEscalationDays: z.number()
    .int()
    .min(1)
    .max(30)
    .default(3),

  /** Reminder frequency for urgent items (hours between reminders) */
  urgentReminderFrequencyHours: z.number()
    .min(1)
    .max(24)
    .default(4),

  /** Reminder frequency for overdue items (hours between reminders) */
  overdueReminderFrequencyHours: z.number()
    .min(4)
    .max(48)
    .default(24),

  // ================================
  // DIGEST SETTINGS
  // ================================

  /** Hour of day (0-23) to send daily digests */
  dailyDigestHour: z.number()
    .int()
    .min(0)
    .max(23)
    .default(8),

  /** Day of week (0=Sunday, 1=Monday, etc.) to send weekly digests */
  weeklyDigestDay: z.number()
    .int()
    .min(0)
    .max(6)
    .default(1), // Monday

  /** Day of month (1-28) to send monthly digests */
  monthlyDigestDay: z.number()
    .int()
    .min(1)
    .max(28)
    .default(1),

  /** Maximum items to include in a digest */
  maxItemsPerDigest: z.number()
    .int()
    .min(10)
    .max(200)
    .default(50),

  /** Maximum critical items before breaking out into separate notification */
  criticalItemBreakoutThreshold: z.number()
    .int()
    .min(1)
    .max(10)
    .default(3),

  /** Include charts/visualizations in executive digests */
  includeChartsInDigest: z.boolean()
    .default(true),

  /** Include trend analysis in digests */
  includeTrendAnalysis: z.boolean()
    .default(true),

  // ================================
  // RATE LIMITING
  // ================================

  /** Maximum alerts per user per hour */
  maxAlertsPerHour: z.number()
    .int()
    .min(1)
    .max(100)
    .default(10),

  /** Maximum reminders per user per day */
  maxRemindersPerDay: z.number()
    .int()
    .min(1)
    .max(100)
    .default(20),

  /** Alert volume threshold for fatigue detection (per day) */
  fatigueThresholdPerDay: z.number()
    .int()
    .min(5)
    .max(100)
    .default(15),

  /** Minimum time between similar notifications (minutes) */
  deduplicationWindowMinutes: z.number()
    .int()
    .min(1)
    .max(1440)
    .default(30),

  /** Enable automatic suppression of low-priority notifications during high volume */
  enableAutoSuppression: z.boolean()
    .default(true),

  /** Critical ratio threshold below which fatigue warning triggers */
  criticalRatioThreshold: z.number()
    .min(0.01)
    .max(0.5)
    .default(0.05),

  // ================================
  // CHANNEL SELECTION RULES
  // ================================

  /** Channels to use for critical alerts */
  criticalChannels: z.array(z.enum(['email', 'sms', 'in-app', 'slack', 'push', 'phone']))
    .min(1)
    .max(6)
    .default(['email', 'sms', 'phone']),

  /** Channels to use for high-severity alerts */
  highChannels: z.array(z.enum(['email', 'sms', 'in-app', 'slack', 'push', 'phone']))
    .min(1)
    .max(6)
    .default(['email', 'slack', 'push']),

  /** Default channels for standard notifications */
  defaultChannels: z.array(z.enum(['email', 'sms', 'in-app', 'slack', 'push', 'phone']))
    .min(1)
    .max(6)
    .default(['email', 'in-app']),

  /** Whether to respect user's channel preferences */
  respectUserPreferences: z.boolean()
    .default(true),

  /** Whether to require user opt-in for SMS/phone notifications */
  requireSmsOptIn: z.boolean()
    .default(true),

  /** Whether to require user opt-in for phone call notifications */
  requirePhoneOptIn: z.boolean()
    .default(true),

  // ================================
  // TIMEOUT & RETRY SETTINGS
  // ================================

  /** Timeout for notification delivery operations (milliseconds) */
  deliveryTimeoutMs: z.number()
    .min(5000)
    .max(120000)
    .default(30000),

  /** Timeout for database operations (milliseconds) */
  databaseTimeoutMs: z.number()
    .min(1000)
    .max(60000)
    .default(15000),

  /** Maximum retry attempts for failed delivery */
  maxRetryAttempts: z.number()
    .int()
    .min(1)
    .max(10)
    .default(3),

  /** Base delay for retry operations (milliseconds) */
  baseRetryDelayMs: z.number()
    .min(100)
    .max(5000)
    .default(1000),

  /** Maximum delay for retry operations (milliseconds) */
  maxRetryDelayMs: z.number()
    .min(1000)
    .max(30000)
    .default(10000),

  /** Jitter factor for retry delays (0-1) */
  retryJitterFactor: z.number()
    .min(0)
    .max(1)
    .default(0.2),

  // ================================
  // CACHING SETTINGS
  // ================================

  /** Cache TTL for configuration (seconds) */
  configCacheTtl: z.number()
    .min(60)
    .max(3600)
    .default(300),

  /** Cache TTL for routing rules (seconds) */
  routingRulesCacheTtl: z.number()
    .min(60)
    .max(3600)
    .default(600),

  /** Cache TTL for recipient lists (seconds) */
  recipientsCacheTtl: z.number()
    .min(30)
    .max(600)
    .default(120),

  // ================================
  // FEATURE FLAGS
  // ================================

  /** Enable smart notification routing using database function */
  enableSmartRouting: z.boolean()
    .default(true),

  /** Enable alert fatigue detection and recommendations */
  enableFatigueDetection: z.boolean()
    .default(true),

  /** Enable graceful degradation on errors */
  enableGracefulDegradation: z.boolean()
    .default(true),

  /** Enable notification aggregation for similar alerts */
  enableAggregation: z.boolean()
    .default(true),

  /** Enable automatic escalation for unacknowledged alerts */
  enableAutoEscalation: z.boolean()
    .default(true),

  /** Enable trend analysis in digests */
  enableTrendAnalysis: z.boolean()
    .default(true),

  /** Enable quiet hours respect for non-critical notifications */
  enableQuietHours: z.boolean()
    .default(true),

  /** Enable notification batching for efficiency */
  enableBatching: z.boolean()
    .default(true),

  // ================================
  // QUIET HOURS SETTINGS
  // ================================

  /** Start hour for quiet hours (0-23) */
  quietHoursStart: z.number()
    .int()
    .min(0)
    .max(23)
    .default(22),

  /** End hour for quiet hours (0-23) */
  quietHoursEnd: z.number()
    .int()
    .min(0)
    .max(23)
    .default(7),

  /** Minimum severity level to bypass quiet hours */
  quietHoursBypassSeverity: z.enum(['critical', 'high', 'medium', 'low'])
    .default('critical'),

  // ================================
  // AGGREGATION SETTINGS
  // ================================

  /** Minimum notifications before aggregation kicks in */
  aggregationMinCount: z.number()
    .int()
    .min(2)
    .max(20)
    .default(3),

  /** Time window for aggregation (minutes) */
  aggregationWindowMinutes: z.number()
    .int()
    .min(5)
    .max(1440)
    .default(60),

  /** Maximum items per aggregated notification */
  maxItemsPerAggregation: z.number()
    .int()
    .min(5)
    .max(50)
    .default(10),
});

// =============================================================================
// TYPES
// =============================================================================

export type NotificationsConfig = z.infer<typeof NotificationsConfigSchema>;

/**
 * Partial configuration for enterprise overrides
 */
export type NotificationsConfigOverride = Partial<NotificationsConfig>;

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

/**
 * Default Notifications Agent configuration
 */
export const DEFAULT_NOTIFICATIONS_CONFIG: NotificationsConfig = NotificationsConfigSchema.parse({});

// =============================================================================
// CONFIGURATION MANAGER
// =============================================================================

/**
 * Cache entry structure
 */
interface ConfigCacheEntry {
  config: NotificationsConfig;
  timestamp: number;
  enterpriseId: string;
}

/**
 * Notifications Configuration Manager
 *
 * Loads and caches enterprise-specific configuration from the database.
 * Falls back to defaults if no custom configuration exists.
 */
class NotificationsConfigManager {
  private static instance: NotificationsConfigManager;
  private cache: Map<string, ConfigCacheEntry> = new Map();
  private defaultConfig: NotificationsConfig = DEFAULT_NOTIFICATIONS_CONFIG;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): NotificationsConfigManager {
    if (!NotificationsConfigManager.instance) {
      NotificationsConfigManager.instance = new NotificationsConfigManager();
    }
    return NotificationsConfigManager.instance;
  }

  /**
   * Get configuration for an enterprise
   *
   * @param supabase - Supabase client instance
   * @param enterpriseId - Enterprise ID to get config for
   * @returns Merged configuration (defaults + enterprise overrides)
   */
  async getConfig(
    supabase: SupabaseQueryClient,
    enterpriseId: string,
  ): Promise<NotificationsConfig> {
    // Check cache first
    const cached = this.cache.get(enterpriseId);
    if (cached && this.isCacheValid(cached)) {
      return cached.config;
    }

    // Load from database
    const config = await this.loadFromDatabase(supabase, enterpriseId);

    // Cache the result
    this.cache.set(enterpriseId, {
      config,
      timestamp: Date.now(),
      enterpriseId,
    });

    return config;
  }

  /**
   * Get default configuration (no database lookup)
   */
  getDefaultConfig(): NotificationsConfig {
    return { ...this.defaultConfig };
  }

  /**
   * Check if a cache entry is still valid
   */
  private isCacheValid(entry: ConfigCacheEntry): boolean {
    const ttlMs = (entry.config.configCacheTtl || 300) * 1000;
    return Date.now() - entry.timestamp < ttlMs;
  }

  /**
   * Load configuration from database
   */
  private async loadFromDatabase(
    supabase: SupabaseQueryClient,
    enterpriseId: string,
  ): Promise<NotificationsConfig> {
    try {
      const { data, error } = await supabase
        .from('enterprise_settings')
        .select('value')
        .eq('enterprise_id', enterpriseId)
        .eq('key', 'notifications_agent_config')
        .single();

      if (error || !data) {
        // No custom config, return defaults
        return this.defaultConfig;
      }

      // Parse and validate the override configuration
      const override = data.value as NotificationsConfigOverride;
      return this.mergeConfig(override);
    } catch (error) {
      console.error('[NotificationsConfig] Failed to load config from database:', error);
      return this.defaultConfig;
    }
  }

  /**
   * Merge override configuration with defaults
   */
  private mergeConfig(override: NotificationsConfigOverride): NotificationsConfig {
    try {
      const merged = {
        ...this.defaultConfig,
        ...override,
      };

      // Validate merged config
      return NotificationsConfigSchema.parse(merged);
    } catch (error) {
      console.error('[NotificationsConfig] Invalid config override, using defaults:', error);
      return this.defaultConfig;
    }
  }

  /**
   * Clear cache for an enterprise (call when config is updated)
   */
  clearCache(enterpriseId?: string): void {
    if (enterpriseId) {
      this.cache.delete(enterpriseId);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Update the default configuration (for testing or global overrides)
   */
  setDefaultConfig(config: Partial<NotificationsConfig>): void {
    this.defaultConfig = NotificationsConfigSchema.parse({
      ...this.defaultConfig,
      ...config,
    });
  }
}

// =============================================================================
// HELPER TYPES
// =============================================================================

interface EnterpriseSettingsRow {
  value: unknown;
}

type SupabaseQueryClient = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        eq: (col: string, val: string) => {
          single: () => Promise<{ data: EnterpriseSettingsRow | null; error: Error | null }>;
        };
      };
    };
  };
};

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * Singleton config manager instance
 */
export const notificationsConfigManager = NotificationsConfigManager.getInstance();

/**
 * Get Notifications Agent configuration for an enterprise
 *
 * @param supabase - Supabase client instance
 * @param enterpriseId - Enterprise ID
 * @returns Configuration object
 */
export async function getNotificationsConfig(
  supabase: SupabaseQueryClient,
  enterpriseId: string,
): Promise<NotificationsConfig> {
  return notificationsConfigManager.getConfig(supabase, enterpriseId);
}

/**
 * Get default Notifications Agent configuration (no database lookup)
 */
export function getDefaultNotificationsConfig(): NotificationsConfig {
  return notificationsConfigManager.getDefaultConfig();
}

/**
 * Clear configuration cache
 */
export function clearNotificationsConfigCache(enterpriseId?: string): void {
  notificationsConfigManager.clearCache(enterpriseId);
}

// =============================================================================
// CONFIGURATION HELPERS - URGENCY
// =============================================================================

/**
 * Check if a reminder is urgent based on days until due
 *
 * @param daysUntilDue - Days remaining until due date
 * @param config - Notifications configuration
 * @returns Whether the reminder is considered urgent
 */
export function isUrgent(daysUntilDue: number, config: NotificationsConfig): boolean {
  return daysUntilDue >= 0 && daysUntilDue <= config.urgentReminderDays;
}

/**
 * Check if a reminder is upcoming based on days until due
 *
 * @param daysUntilDue - Days remaining until due date
 * @param config - Notifications configuration
 * @returns Whether the reminder is considered upcoming
 */
export function isUpcoming(daysUntilDue: number, config: NotificationsConfig): boolean {
  return daysUntilDue > config.urgentReminderDays && daysUntilDue <= config.upcomingReminderDays;
}

/**
 * Check if a reminder qualifies for advance notice
 *
 * @param daysUntilDue - Days remaining until due date
 * @param config - Notifications configuration
 * @returns Whether the reminder qualifies for advance notice
 */
export function isAdvanceNotice(daysUntilDue: number, config: NotificationsConfig): boolean {
  return daysUntilDue > config.upcomingReminderDays && daysUntilDue <= config.advanceReminderDays;
}

/**
 * Get the reminder category based on days until due
 *
 * @param daysUntilDue - Days remaining until due date (negative = overdue)
 * @param config - Notifications configuration
 * @returns Category of the reminder
 */
export function getReminderCategory(
  daysUntilDue: number,
  config: NotificationsConfig,
): 'overdue' | 'urgent' | 'upcoming' | 'advance' | 'future' {
  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue <= config.urgentReminderDays) return 'urgent';
  if (daysUntilDue <= config.upcomingReminderDays) return 'upcoming';
  if (daysUntilDue <= config.advanceReminderDays) return 'advance';
  return 'future';
}

// =============================================================================
// CONFIGURATION HELPERS - ESCALATION
// =============================================================================

/**
 * Check if an alert should escalate based on severity and time
 *
 * @param severity - Alert severity level
 * @param minutesSinceCreation - Minutes since the alert was created
 * @param config - Notifications configuration
 * @returns Whether the alert should escalate
 */
export function shouldEscalate(
  severity: 'critical' | 'high' | 'medium' | 'low',
  minutesSinceCreation: number,
  config: NotificationsConfig,
): boolean {
  if (!config.enableAutoEscalation) return false;

  switch (severity) {
    case 'critical':
      return minutesSinceCreation >= config.criticalEscalationMinutes;
    case 'high':
      return minutesSinceCreation >= config.highEscalationMinutes;
    case 'medium':
      return minutesSinceCreation >= config.mediumEscalationMinutes;
    default:
      return false;
  }
}

/**
 * Get escalation timeline for a severity level
 *
 * @param severity - Alert severity level
 * @param config - Notifications configuration
 * @returns Array of escalation level objects with timing
 */
export function getEscalationTimeline(
  severity: 'critical' | 'high' | 'medium' | 'low',
  config: NotificationsConfig,
): Array<{ level: number; afterMinutes: number; role: string }> {
  const levels: Array<{ level: number; afterMinutes: number; role: string }> = [];
  const roles = ['manager', 'director', 'executive', 'ceo', 'board'];

  let baseMinutes: number;
  let levelCount: number;

  switch (severity) {
    case 'critical':
      baseMinutes = config.criticalEscalationMinutes;
      levelCount = config.criticalEscalationLevels;
      break;
    case 'high':
      baseMinutes = config.highEscalationMinutes;
      levelCount = config.highEscalationLevels;
      break;
    case 'medium':
      baseMinutes = config.mediumEscalationMinutes;
      levelCount = 1;
      break;
    default:
      return levels;
  }

  for (let i = 0; i < levelCount; i++) {
    levels.push({
      level: i + 1,
      afterMinutes: baseMinutes * (i + 1),
      role: roles[Math.min(i, roles.length - 1)],
    });
  }

  return levels;
}

// =============================================================================
// CONFIGURATION HELPERS - FATIGUE ASSESSMENT
// =============================================================================

/**
 * Assess alert fatigue risk based on notification metrics
 *
 * @param metrics - Current notification metrics
 * @param config - Notifications configuration
 * @returns Fatigue assessment with level and recommendations
 */
export function assessFatigue(
  metrics: {
    totalVolume: number;
    criticalCount: number;
    suppressedCount: number;
    timeWindowHours?: number;
  },
  config: NotificationsConfig,
): {
  level: 'low' | 'medium' | 'high';
  description: string;
  recommendations: string[];
} {
  if (!config.enableFatigueDetection) {
    return {
      level: 'low',
      description: 'Fatigue detection disabled',
      recommendations: [],
    };
  }

  const recommendations: string[] = [];
  const timeWindowHours = metrics.timeWindowHours || 24;
  const volumePerDay = (metrics.totalVolume / timeWindowHours) * 24;
  const criticalRatio = metrics.totalVolume > 0 ? metrics.criticalCount / metrics.totalVolume : 0;
  const suppressionRatio = metrics.totalVolume > 0 ? metrics.suppressedCount / metrics.totalVolume : 0;

  let level: 'low' | 'medium' | 'high' = 'low';
  let description = 'Notification volume is manageable';

  // Check volume threshold
  if (volumePerDay > config.fatigueThresholdPerDay * 2) {
    level = 'high';
    description = 'Very high notification volume may cause alert fatigue';
    recommendations.push('Review and increase notification thresholds');
    recommendations.push('Enable notification aggregation');
  } else if (volumePerDay > config.fatigueThresholdPerDay) {
    level = 'medium';
    description = 'Moderate notification volume - monitor for fatigue';
    recommendations.push('Consider enabling notification batching');
  }

  // Check critical ratio
  if (criticalRatio < config.criticalRatioThreshold && metrics.totalVolume > 10) {
    if (level !== 'high') level = 'high';
    description = 'Too many non-critical alerts may desensitize users';
    recommendations.push('Review severity classifications');
    recommendations.push('Suppress or batch low-priority notifications');
  }

  // Check suppression ratio
  if (suppressionRatio < 0.1 && volumePerDay > config.fatigueThresholdPerDay) {
    recommendations.push('Consider suppressing more low-priority notifications');
  }

  return {
    level,
    description,
    recommendations,
  };
}

// =============================================================================
// CONFIGURATION HELPERS - CHANNEL SELECTION
// =============================================================================

/**
 * Get channels for a given severity level
 *
 * @param severity - Alert severity level
 * @param config - Notifications configuration
 * @returns Array of channels to use
 */
export function getChannelsForSeverity(
  severity: 'critical' | 'high' | 'medium' | 'low',
  config: NotificationsConfig,
): string[] {
  switch (severity) {
    case 'critical':
      return [...config.criticalChannels];
    case 'high':
      return [...config.highChannels];
    default:
      return [...config.defaultChannels];
  }
}

/**
 * Check if a notification is within quiet hours
 *
 * @param hour - Current hour (0-23)
 * @param config - Notifications configuration
 * @returns Whether we are in quiet hours
 */
export function isQuietHours(hour: number, config: NotificationsConfig): boolean {
  if (!config.enableQuietHours) return false;

  // Handle overnight quiet hours (e.g., 22:00 to 07:00)
  if (config.quietHoursStart > config.quietHoursEnd) {
    return hour >= config.quietHoursStart || hour < config.quietHoursEnd;
  }

  // Handle same-day quiet hours
  return hour >= config.quietHoursStart && hour < config.quietHoursEnd;
}

/**
 * Check if a severity level can bypass quiet hours
 *
 * @param severity - Alert severity level
 * @param config - Notifications configuration
 * @returns Whether the severity can bypass quiet hours
 */
export function canBypassQuietHours(
  severity: 'critical' | 'high' | 'medium' | 'low',
  config: NotificationsConfig,
): boolean {
  const severityOrder = ['low', 'medium', 'high', 'critical'];
  const bypassIndex = severityOrder.indexOf(config.quietHoursBypassSeverity);
  const currentIndex = severityOrder.indexOf(severity);
  return currentIndex >= bypassIndex;
}

// =============================================================================
// CONFIGURATION HELPERS - RATE LIMITING
// =============================================================================

/**
 * Check if rate limit has been exceeded
 *
 * @param type - Type of notification ('alert' or 'reminder')
 * @param count - Current count in the time window
 * @param config - Notifications configuration
 * @returns Whether rate limit is exceeded
 */
export function isRateLimitExceeded(
  type: 'alert' | 'reminder',
  count: number,
  config: NotificationsConfig,
): boolean {
  if (type === 'alert') {
    return count >= config.maxAlertsPerHour;
  }
  return count >= config.maxRemindersPerDay;
}

/**
 * Get remaining quota for notifications
 *
 * @param type - Type of notification ('alert' or 'reminder')
 * @param currentCount - Current count in the time window
 * @param config - Notifications configuration
 * @returns Remaining quota and limit info
 */
export function getRemainingQuota(
  type: 'alert' | 'reminder',
  currentCount: number,
  config: NotificationsConfig,
): { remaining: number; limit: number; exceeded: boolean } {
  const limit = type === 'alert' ? config.maxAlertsPerHour : config.maxRemindersPerDay;
  const remaining = Math.max(0, limit - currentCount);
  return {
    remaining,
    limit,
    exceeded: remaining === 0,
  };
}

// =============================================================================
// CONFIGURATION HELPERS - AGGREGATION
// =============================================================================

/**
 * Check if notifications should be aggregated
 *
 * @param count - Number of similar notifications
 * @param config - Notifications configuration
 * @returns Whether aggregation should be applied
 */
export function shouldAggregate(count: number, config: NotificationsConfig): boolean {
  if (!config.enableAggregation) return false;
  return count >= config.aggregationMinCount;
}

/**
 * Get aggregation window in milliseconds
 *
 * @param config - Notifications configuration
 * @returns Aggregation window in milliseconds
 */
export function getAggregationWindowMs(config: NotificationsConfig): number {
  return config.aggregationWindowMinutes * 60 * 1000;
}

// =============================================================================
// CONFIGURATION HELPERS - RETRY LOGIC
// =============================================================================

/**
 * Calculate retry delay with exponential backoff and jitter
 *
 * @param attempt - Current attempt number (0-indexed)
 * @param config - Notifications configuration
 * @returns Delay in milliseconds before next retry
 */
export function calculateRetryDelay(attempt: number, config: NotificationsConfig): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = config.baseRetryDelayMs * Math.pow(2, attempt);

  // Cap at maxRetryDelayMs
  const cappedDelay = Math.min(exponentialDelay, config.maxRetryDelayMs);

  // Add jitter
  const jitter = cappedDelay * config.retryJitterFactor * Math.random();

  return Math.floor(cappedDelay + jitter);
}

/**
 * Check if more retries are allowed
 *
 * @param attempt - Current attempt number (0-indexed)
 * @param config - Notifications configuration
 * @returns Whether another retry is allowed
 */
export function canRetry(attempt: number, config: NotificationsConfig): boolean {
  return attempt < config.maxRetryAttempts;
}

// =============================================================================
// CONFIGURATION VALIDATION
// =============================================================================

/**
 * Validate a configuration override object
 *
 * @param override - Partial configuration to validate
 * @returns Validation result with success flag and errors
 */
export function validateConfigOverride(override: unknown): {
  valid: boolean;
  config?: NotificationsConfigOverride;
  errors?: string[];
} {
  try {
    // Partial validation - only validate provided fields
    const partialSchema = NotificationsConfigSchema.partial();
    const parsed = partialSchema.parse(override);
    return { valid: true, config: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { valid: false, errors: ['Unknown validation error'] };
  }
}

/**
 * Validate configuration threshold relationships.
 * Ensures thresholds have logically consistent values.
 *
 * @param config - The configuration to validate
 * @returns Array of validation error messages (empty if valid)
 */
export function validateConfigThresholds(config: NotificationsConfig): string[] {
  const errors: string[] = [];

  // Reminder threshold ordering: urgent < upcoming < advance
  if (config.urgentReminderDays >= config.upcomingReminderDays) {
    errors.push(
      `urgentReminderDays (${config.urgentReminderDays}) must be < upcomingReminderDays (${config.upcomingReminderDays})`
    );
  }

  if (config.upcomingReminderDays >= config.advanceReminderDays) {
    errors.push(
      `upcomingReminderDays (${config.upcomingReminderDays}) must be < advanceReminderDays (${config.advanceReminderDays})`
    );
  }

  // Escalation ordering: critical < high < medium
  if (config.criticalEscalationMinutes >= config.highEscalationMinutes) {
    errors.push(
      `criticalEscalationMinutes (${config.criticalEscalationMinutes}) must be < highEscalationMinutes (${config.highEscalationMinutes})`
    );
  }

  if (config.highEscalationMinutes >= config.mediumEscalationMinutes) {
    errors.push(
      `highEscalationMinutes (${config.highEscalationMinutes}) must be < mediumEscalationMinutes (${config.mediumEscalationMinutes})`
    );
  }

  // Retry delay constraints
  if (config.baseRetryDelayMs >= config.maxRetryDelayMs) {
    errors.push(
      `baseRetryDelayMs (${config.baseRetryDelayMs}) must be < maxRetryDelayMs (${config.maxRetryDelayMs})`
    );
  }

  // Timeout constraints
  if (config.databaseTimeoutMs >= config.deliveryTimeoutMs) {
    errors.push(
      `databaseTimeoutMs (${config.databaseTimeoutMs}) should be < deliveryTimeoutMs (${config.deliveryTimeoutMs})`
    );
  }

  // Quiet hours validation
  if (config.quietHoursStart === config.quietHoursEnd) {
    errors.push(
      'quietHoursStart and quietHoursEnd cannot be the same value'
    );
  }

  // Rate limit sanity
  if (config.fatigueThresholdPerDay > config.maxRemindersPerDay) {
    errors.push(
      `fatigueThresholdPerDay (${config.fatigueThresholdPerDay}) should be <= maxRemindersPerDay (${config.maxRemindersPerDay})`
    );
  }

  // Reminder frequency sanity
  if (config.urgentReminderFrequencyHours >= config.overdueReminderFrequencyHours) {
    errors.push(
      `urgentReminderFrequencyHours (${config.urgentReminderFrequencyHours}) should be < overdueReminderFrequencyHours (${config.overdueReminderFrequencyHours})`
    );
  }

  // Channel validation
  if (config.criticalChannels.length === 0) {
    errors.push('criticalChannels must have at least one channel');
  }

  if (config.highChannels.length === 0) {
    errors.push('highChannels must have at least one channel');
  }

  if (config.defaultChannels.length === 0) {
    errors.push('defaultChannels must have at least one channel');
  }

  return errors;
}

/**
 * Validate and return a sanitized configuration.
 * Logs warnings for any threshold inconsistencies.
 *
 * @param config - The configuration to validate
 * @returns The original config (validation is advisory)
 */
export function validateAndLogConfigWarnings(config: NotificationsConfig): NotificationsConfig {
  const warnings = validateConfigThresholds(config);
  if (warnings.length > 0) {
    console.warn('[NotificationsConfig] Configuration threshold warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
  return config;
}
