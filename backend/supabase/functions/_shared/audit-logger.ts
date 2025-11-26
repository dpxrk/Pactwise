/// <reference path="../../types/global.d.ts" />

import { createAdminClient } from './supabase.ts';

/**
 * Enterprise Audit Logger
 * Provides comprehensive audit logging for all business operations.
 * Designed for compliance, debugging, and security forensics.
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'export'
  | 'import'
  | 'approve'
  | 'reject'
  | 'submit'
  | 'archive'
  | 'restore'
  | 'share'
  | 'revoke'
  | 'assign'
  | 'unassign'
  | 'execute'
  | 'cancel'
  | 'bulk_update'
  | 'bulk_delete'
  | 'config_change'
  | 'permission_change'
  | 'api_call';

export type AuditEntityType =
  | 'contract'
  | 'vendor'
  | 'user'
  | 'enterprise'
  | 'budget'
  | 'document'
  | 'approval'
  | 'workflow'
  | 'notification'
  | 'api_key'
  | 'webhook'
  | 'agent_task'
  | 'line_item'
  | 'taxonomy'
  | 'market_data'
  | 'chat_session'
  | 'rfq'
  | 'settings'
  | 'integration'
  | 'report';

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AuditLogEntry {
  // Core identification
  action: AuditAction;
  entity_type: AuditEntityType;
  entity_id?: string;

  // Actor information
  user_id: string;
  enterprise_id: string;

  // Request context
  request_id?: string;
  ip_address?: string;
  user_agent?: string;
  endpoint?: string;
  method?: string;

  // Change tracking
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  changed_fields?: string[];

  // Metadata
  severity?: AuditSeverity;
  description?: string;
  metadata?: Record<string, unknown>;

  // Performance
  duration_ms?: number;

  // Compliance
  compliance_tags?: string[];
  retention_days?: number;
}

export interface AuditQueryOptions {
  enterprise_id: string;
  start_date?: Date;
  end_date?: Date;
  user_id?: string;
  entity_type?: AuditEntityType;
  entity_id?: string;
  action?: AuditAction;
  severity?: AuditSeverity;
  limit?: number;
  offset?: number;
}

// ============================================================================
// AUDIT LOGGER CLASS
// ============================================================================

export class AuditLogger {
  private static instance: AuditLogger;
  private buffer: AuditLogEntry[] = [];
  private flushInterval: number | null = null;
  private readonly BUFFER_SIZE = 50;
  private readonly FLUSH_INTERVAL_MS = 5000;

  private constructor() {
    // Start periodic flush
    this.startPeriodicFlush();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Log an audit event
   */
  async log(entry: AuditLogEntry): Promise<void> {
    const enrichedEntry = this.enrichEntry(entry);

    // Add to buffer
    this.buffer.push(enrichedEntry);

    // Flush if buffer is full or if it's a critical event
    if (this.buffer.length >= this.BUFFER_SIZE || entry.severity === 'critical') {
      await this.flush();
    }
  }

  /**
   * Log synchronously without waiting for database write
   * Use for non-critical events where performance is priority
   */
  logAsync(entry: AuditLogEntry): void {
    const enrichedEntry = this.enrichEntry(entry);
    this.buffer.push(enrichedEntry);

    if (this.buffer.length >= this.BUFFER_SIZE) {
      this.flush().catch(console.error);
    }
  }

  /**
   * Log a create operation
   */
  async logCreate(
    entityType: AuditEntityType,
    entityId: string,
    userId: string,
    enterpriseId: string,
    newValues: Record<string, unknown>,
    options?: Partial<AuditLogEntry>
  ): Promise<void> {
    await this.log({
      action: 'create',
      entity_type: entityType,
      entity_id: entityId,
      user_id: userId,
      enterprise_id: enterpriseId,
      new_values: newValues,
      severity: 'info',
      ...options,
    });
  }

  /**
   * Log an update operation with diff tracking
   */
  async logUpdate(
    entityType: AuditEntityType,
    entityId: string,
    userId: string,
    enterpriseId: string,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
    options?: Partial<AuditLogEntry>
  ): Promise<void> {
    const changedFields = this.getChangedFields(oldValues, newValues);

    await this.log({
      action: 'update',
      entity_type: entityType,
      entity_id: entityId,
      user_id: userId,
      enterprise_id: enterpriseId,
      old_values: this.filterChangedValues(oldValues, changedFields),
      new_values: this.filterChangedValues(newValues, changedFields),
      changed_fields: changedFields,
      severity: 'info',
      ...options,
    });
  }

  /**
   * Log a delete operation
   */
  async logDelete(
    entityType: AuditEntityType,
    entityId: string,
    userId: string,
    enterpriseId: string,
    oldValues: Record<string, unknown>,
    options?: Partial<AuditLogEntry>
  ): Promise<void> {
    await this.log({
      action: 'delete',
      entity_type: entityType,
      entity_id: entityId,
      user_id: userId,
      enterprise_id: enterpriseId,
      old_values: oldValues,
      severity: 'warning',
      ...options,
    });
  }

  /**
   * Log a bulk operation
   */
  async logBulkOperation(
    action: 'bulk_update' | 'bulk_delete',
    entityType: AuditEntityType,
    entityIds: string[],
    userId: string,
    enterpriseId: string,
    options?: Partial<AuditLogEntry>
  ): Promise<void> {
    await this.log({
      action,
      entity_type: entityType,
      user_id: userId,
      enterprise_id: enterpriseId,
      metadata: {
        affected_ids: entityIds,
        count: entityIds.length,
      },
      severity: 'warning',
      ...options,
    });
  }

  /**
   * Log a security-related event
   */
  async logSecurityEvent(
    action: AuditAction,
    userId: string,
    enterpriseId: string,
    description: string,
    metadata?: Record<string, unknown>,
    severity: AuditSeverity = 'warning'
  ): Promise<void> {
    await this.log({
      action,
      entity_type: 'user',
      entity_id: userId,
      user_id: userId,
      enterprise_id: enterpriseId,
      description,
      metadata,
      severity,
      compliance_tags: ['security'],
    });
  }

  /**
   * Log an API call
   */
  async logApiCall(
    userId: string,
    enterpriseId: string,
    endpoint: string,
    method: string,
    statusCode: number,
    durationMs: number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    this.logAsync({
      action: 'api_call',
      entity_type: 'integration',
      user_id: userId,
      enterprise_id: enterpriseId,
      endpoint,
      method,
      duration_ms: durationMs,
      severity: statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warning' : 'info',
      metadata: {
        status_code: statusCode,
        ...metadata,
      },
    });
  }

  /**
   * Query audit logs
   */
  async query(options: AuditQueryOptions): Promise<{
    logs: AuditLogEntry[];
    total: number;
    hasMore: boolean;
  }> {
    const client = createAdminClient();
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    let query = client
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('enterprise_id', options.enterprise_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (options.start_date) {
      query = query.gte('created_at', options.start_date.toISOString());
    }
    if (options.end_date) {
      query = query.lte('created_at', options.end_date.toISOString());
    }
    if (options.user_id) {
      query = query.eq('user_id', options.user_id);
    }
    if (options.entity_type) {
      query = query.eq('entity_type', options.entity_type);
    }
    if (options.entity_id) {
      query = query.eq('entity_id', options.entity_id);
    }
    if (options.action) {
      query = query.eq('action', options.action);
    }
    if (options.severity) {
      query = query.eq('severity', options.severity);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error('[AuditLogger] Query error:', error);
      throw new Error(`Failed to query audit logs: ${error.message}`);
    }

    return {
      logs: (data || []) as unknown as AuditLogEntry[],
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    };
  }

  /**
   * Get audit trail for a specific entity
   */
  async getEntityHistory(
    enterpriseId: string,
    entityType: AuditEntityType,
    entityId: string,
    limit = 100
  ): Promise<AuditLogEntry[]> {
    const client = createAdminClient();

    const { data, error } = await client
      .from('audit_logs')
      .select('*')
      .eq('enterprise_id', enterpriseId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[AuditLogger] Entity history error:', error);
      return [];
    }

    return (data || []) as unknown as AuditLogEntry[];
  }

  /**
   * Flush buffered entries to database
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entriesToFlush = [...this.buffer];
    this.buffer = [];

    try {
      const client = createAdminClient();

      const { error } = await client
        .from('audit_logs')
        .insert(entriesToFlush.map(entry => ({
          action: entry.action,
          entity_type: entry.entity_type,
          entity_id: entry.entity_id,
          user_id: entry.user_id,
          enterprise_id: entry.enterprise_id,
          request_id: entry.request_id,
          ip_address: entry.ip_address,
          user_agent: entry.user_agent,
          endpoint: entry.endpoint,
          method: entry.method,
          old_values: entry.old_values,
          new_values: entry.new_values,
          changed_fields: entry.changed_fields,
          severity: entry.severity || 'info',
          description: entry.description,
          metadata: entry.metadata,
          duration_ms: entry.duration_ms,
          compliance_tags: entry.compliance_tags,
          retention_days: entry.retention_days,
        })));

      if (error) {
        console.error('[AuditLogger] Flush error:', error);
        // Re-add failed entries to buffer
        this.buffer = [...entriesToFlush, ...this.buffer];
      }
    } catch (err) {
      console.error('[AuditLogger] Flush exception:', err);
      // Re-add failed entries to buffer
      this.buffer = [...entriesToFlush, ...this.buffer];
    }
  }

  /**
   * Start periodic flush timer
   */
  private startPeriodicFlush(): void {
    if (this.flushInterval) return;

    this.flushInterval = setInterval(() => {
      this.flush().catch(console.error);
    }, this.FLUSH_INTERVAL_MS) as unknown as number;
  }

  /**
   * Enrich entry with additional context
   */
  private enrichEntry(entry: AuditLogEntry): AuditLogEntry {
    return {
      ...entry,
      request_id: entry.request_id || crypto.randomUUID(),
      severity: entry.severity || 'info',
    };
  }

  /**
   * Get list of fields that changed between old and new values
   */
  private getChangedFields(
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>
  ): string[] {
    const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);
    const changedFields: string[] = [];

    for (const key of allKeys) {
      if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
        changedFields.push(key);
      }
    }

    return changedFields;
  }

  /**
   * Filter values to only include changed fields
   */
  private filterChangedValues(
    values: Record<string, unknown>,
    changedFields: string[]
  ): Record<string, unknown> {
    const filtered: Record<string, unknown> = {};
    for (const field of changedFields) {
      if (field in values) {
        filtered[field] = values[field];
      }
    }
    return filtered;
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Get the global audit logger instance
 */
export function getAuditLogger(): AuditLogger {
  return AuditLogger.getInstance();
}

/**
 * Quick audit log function for simple use cases
 */
export async function audit(entry: AuditLogEntry): Promise<void> {
  await getAuditLogger().log(entry);
}

/**
 * Extract audit context from request
 */
export function extractAuditContext(req: Request): Partial<AuditLogEntry> {
  const url = new URL(req.url);

  return {
    ip_address: req.headers.get('x-forwarded-for') ||
                req.headers.get('x-real-ip') ||
                'unknown',
    user_agent: req.headers.get('user-agent') || undefined,
    endpoint: url.pathname,
    method: req.method,
    request_id: req.headers.get('x-request-id') || crypto.randomUUID(),
  };
}

/**
 * Create audit middleware for edge functions
 */
export function withAuditLogging(
  entityType: AuditEntityType,
  action: AuditAction
) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const startTime = Date.now();

      try {
        const result = await originalMethod.apply(this, args);

        // Log successful operation
        const duration = Date.now() - startTime;
        getAuditLogger().logAsync({
          action,
          entity_type: entityType,
          user_id: 'system',
          enterprise_id: 'system',
          duration_ms: duration,
          severity: 'info',
          metadata: { method: propertyKey },
        });

        return result;
      } catch (error) {
        // Log failed operation
        const duration = Date.now() - startTime;
        await getAuditLogger().log({
          action,
          entity_type: entityType,
          user_id: 'system',
          enterprise_id: 'system',
          duration_ms: duration,
          severity: 'error',
          description: error instanceof Error ? error.message : 'Unknown error',
          metadata: { method: propertyKey },
        });

        throw error;
      }
    };

    return descriptor;
  };
}
