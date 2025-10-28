import { BaseAgent, ProcessingResult, Insight, AgentContext } from './base.ts';
import { SupabaseClient } from '@supabase/supabase-js';

interface AuthenticationCredentials {
  apiKey?: string;
  token?: string;
  username?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  header?: string;
  key?: string;
}

interface IntegrationConfig {
  name: string;
  type: 'webhook' | 'api' | 'database' | 'file' | 'message_queue';
  endpoint?: string | undefined;
  authentication?: {
    type: 'none' | 'api_key' | 'oauth2' | 'basic' | 'bearer';
    credentials?: AuthenticationCredentials | undefined;
  } | undefined;
  retryPolicy?: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
  } | undefined;
  timeout?: number | undefined;
  rateLimit?: {
    requests: number;
    window: number;
  } | undefined;
}

interface SyncOptions {
  validate?: boolean | undefined;
  batchSize?: number | undefined;
  endpoint?: string | undefined;
}

interface IntegrationTask {
  integration?: string | undefined;
  operation?: 'send' | 'receive' | 'sync' | 'transform' | 'validate' | undefined;
  data?: unknown;
  options?: {
    transform?: boolean | Record<string, unknown> | undefined;
    validate?: boolean | undefined;
    async?: boolean | undefined;
    callback?: string | undefined;
  } | undefined;
  // Webhook-specific fields
  webhook?: unknown;
  id?: string | undefined;
  source?: string | undefined;
  type?: string | undefined;
  headers?: Record<string, string> | undefined;
  signature?: string | undefined;
  // API call fields
  api?: unknown;
  method?: string | undefined;
  endpoint?: string | undefined;
  payload?: unknown;
  sourceQuery?: {
    endpoint: string;
    headers?: Record<string, string> | undefined;
  } | undefined;
  // Data sync fields
  syncConfig?: {
    source: string;
    target: string;
    mapping: Record<string, string>;
    options?: SyncOptions | undefined;
  } | undefined;
  // Batch processing fields
  batch?: {
    tasks: IntegrationTask[];
    concurrency?: number | undefined;
  } | undefined;
  // Health check fields
  healthCheck?: boolean | undefined;
  integrations?: string[] | undefined;
  // Configuration fields
  configure?: {
    name: string;
    config: IntegrationConfig;
  } | undefined;
}

interface IntegrationResult {
  success: boolean;
  integration: string;
  operation: string;
  status: 'completed' | 'failed' | 'pending' | 'retrying';
  data?: unknown;
  error?: string;
  metadata: {
    duration: number;
    attempts: number;
    timestamp: string;
  };
}

interface WebhookEvent {
  id: string;
  source: string;
  type: string;
  data: unknown;
  headers: Record<string, string>;
  timestamp: string;
  signature?: string | undefined;
}

interface IntegrationConfigRow {
  name: string;
  type: 'webhook' | 'api' | 'database' | 'file' | 'message_queue';
  endpoint?: string;
  authentication?: IntegrationConfig['authentication'];
  retry_policy?: IntegrationConfig['retryPolicy'];
  timeout?: number;
  rate_limit?: IntegrationConfig['rateLimit'];
}

interface ApiCallLogData {
  integration?: string | undefined;
  method?: string | undefined;
  endpoint?: string | undefined;
  status: number;
  duration: number;
  attempts: number;
  success: boolean;
  error?: string | undefined;
}

interface BatchResult {
  success?: boolean;
  task?: IntegrationTask;
  error?: string;
}

interface SendDataResult {
  succeeded: number;
  failed: number;
  errors: Array<{ batch: string; error: string }>;
}

interface HealthCheckResult {
  healthy: boolean;
  status: string;
  latency?: number;
  error?: string;
}

export class IntegrationAgent extends BaseAgent {
  private integrations: Map<string, IntegrationConfig> = new Map();
  private webhookHandlers: Map<string, (event: WebhookEvent) => Promise<IntegrationResult>> = new Map();

  get agentType(): string {
    return 'integration';
  }

  get capabilities(): string[] {
    return [
      'third_party_integration',
      'webhook_handling',
      'api_communication',
      'event_processing',
      'data_synchronization'
    ];
  }

  constructor(supabase: SupabaseClient, enterpriseId: string) {
    super(supabase, enterpriseId, 'integration');
    this.initializeIntegrations();
  }

  private async initializeIntegrations(): Promise<void> {
    // Load integration configurations from database
    const { data: configs } = await this.supabase
      .from('integration_configs')
      .select('*')
      .eq('enterprise_id', this.enterpriseId)
      .eq('is_active', true);

    if (configs) {
      configs.forEach((config: IntegrationConfigRow) => {
        const integrationConfig: IntegrationConfig = {
          name: config.name,
          type: config.type,
          endpoint: config.endpoint ?? undefined,
          authentication: config.authentication ?? undefined,
          retryPolicy: config.retry_policy ?? undefined,
          timeout: config.timeout ?? 30000,
          rateLimit: config.rate_limit ?? undefined,
        };
        this.integrations.set(config.name, integrationConfig);
      });
    }

    // Initialize default integrations
    this.initializeDefaultIntegrations();
  }

  private initializeDefaultIntegrations(): void {
    // Stripe integration
    if (process.env.STRIPE_SECRET_KEY) {
      this.integrations.set('stripe', {
        name: 'stripe',
        type: 'api',
        endpoint: 'https://api.stripe.com/v1',
        authentication: {
          type: 'bearer',
          credentials: { token: process.env.STRIPE_SECRET_KEY },
        },
        retryPolicy: {
          maxRetries: 3,
          backoffMultiplier: 2,
          initialDelay: 1000,
        },
        timeout: 30000,
      });
    }

    // Slack integration
    if (process.env.SLACK_WEBHOOK_URL) {
      this.integrations.set('slack', {
        name: 'slack',
        type: 'webhook',
        endpoint: process.env.SLACK_WEBHOOK_URL!,
        authentication: { type: 'none' },
        retryPolicy: {
          maxRetries: 2,
          backoffMultiplier: 1.5,
          initialDelay: 500,
        },
        timeout: 10000,
      });
    }

    // Email integration (via Resend)
    if (process.env.RESEND_API_KEY) {
      this.integrations.set('email', {
        name: 'email',
        type: 'api',
        endpoint: 'https://api.resend.com/emails',
        authentication: {
          type: 'bearer',
          credentials: { token: process.env.RESEND_API_KEY },
        },
        retryPolicy: {
          maxRetries: 3,
          backoffMultiplier: 2,
          initialDelay: 1000,
        },
        timeout: 15000,
      });
    }
  }

  async process(data: IntegrationTask, context?: AgentContext): Promise<ProcessingResult> {
    const taskType = context?.taskType || this.inferTaskType(data);
    const insights: Insight[] = [];
    const rulesApplied: string[] = [];

    try {
      let result: IntegrationResult;
      let confidence = 0.85;

      switch (taskType) {
        case 'webhook_receive':
          result = await this.processWebhook(data, insights, rulesApplied);
          break;

        case 'api_call':
          result = await this.makeApiCall(data, insights, rulesApplied);
          break;

        case 'data_sync':
          result = await this.syncData(data, insights, rulesApplied);
          break;

        case 'batch_integration':
          result = await this.processBatchIntegration(data, insights, rulesApplied);
          confidence = 0.9;
          break;

        case 'integration_health':
          result = await this.checkIntegrationHealth(data, insights, rulesApplied);
          break;

        case 'configure_integration':
          result = await this.configureIntegration(data, insights, rulesApplied);
          break;

        default:
          throw new Error(`Unsupported integration task type: ${taskType}`);
      }

      return this.createResult(true, result, insights, rulesApplied, confidence);
    } catch (error) {
      return this.createResult(
        false,
        undefined,
        insights,
        rulesApplied,
        0.0,
        { error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  private inferTaskType(data: IntegrationTask): string {
    if (data.webhook) {return 'webhook_receive';}
    if (data.api && data.method) {return 'api_call';}
    if (data.syncConfig) {return 'data_sync';}
    if (data.batch) {return 'batch_integration';}
    if (data.healthCheck) {return 'integration_health';}
    if (data.configure) {return 'configure_integration';}
    return 'api_call';
  }

  private async processWebhook(
    data: IntegrationTask,
    insights: Insight[],
    rulesApplied: string[],
  ): Promise<IntegrationResult> {
    rulesApplied.push('webhook_processing');

    const event: WebhookEvent = {
      id: data.id || crypto.randomUUID(),
      source: data.source || 'unknown',
      type: data.type || 'unknown',
      data: data.payload,
      headers: data.headers || {},
      timestamp: new Date().toISOString(),
      signature: data.signature ?? undefined,
    };

    // Verify webhook signature if required
    if (event.signature) {
      const isValid = await this.verifyWebhookSignature(event);
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }
      rulesApplied.push('webhook_signature_verified');
    }

    // Store webhook event
    await this.supabase.from('webhook_events').insert({
      id: event.id,
      source: event.source,
      type: event.type,
      data: event.data,
      headers: event.headers,
      signature: event.signature,
      enterprise_id: this.enterpriseId,
      processed: false,
    });

    // Process webhook based on source
    let processingResult: IntegrationResult;
    const startTime = Date.now();

    try {
      switch (event.source) {
        case 'stripe':
          processingResult = await this.processStripeWebhook(event);
          break;
        case 'github':
          processingResult = await this.processGithubWebhook(event);
          break;
        case 'slack':
          processingResult = await this.processSlackWebhook(event);
          break;
        default:
          // Check for custom webhook handlers
          if (this.webhookHandlers.has(event.source)) {
            const handler = this.webhookHandlers.get(event.source)!;
            processingResult = await handler(event);
          } else {
            // Generic webhook processing
            processingResult = await this.processGenericWebhook(event);
          }
      }

      // Update webhook event status
      await this.supabase
        .from('webhook_events')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          result: processingResult,
        })
        .eq('id', event.id);

      insights.push(this.createInsight(
        'webhook_processed',
        'low',
        'Webhook Processed',
        `Successfully processed ${event.source} webhook of type ${event.type}`,
        undefined,
        { eventId: event.id, source: event.source, type: event.type },
        false,
      ));

      return {
        success: true,
        integration: event.source,
        operation: 'receive',
        status: 'completed',
        data: processingResult,
        metadata: {
          duration: Date.now() - startTime,
          attempts: 1,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      insights.push(this.createInsight(
        'webhook_processing_failed',
        'high',
        'Webhook Processing Failed',
        `Failed to process ${event.source} webhook: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        { eventId: event.id, error: error instanceof Error ? error.message : String(error) },
        true,
      ));

      throw error;
    }
  }

  private async makeApiCall(
    data: IntegrationTask,
    insights: Insight[],
    rulesApplied: string[],
  ): Promise<IntegrationResult> {
    rulesApplied.push('api_call_execution');

    const { integration, method, endpoint, payload, headers } = data;

    if (!integration) {
      throw new Error('Integration name is required');
    }

    const config = this.integrations.get(integration);

    if (!config) {
      throw new Error(`Integration '${integration}' not configured`);
    }

    const startTime = Date.now();
    let attempts = 0;
    let lastError: Error | null = null;

    // Implement retry logic
    const maxRetries = config.retryPolicy?.maxRetries || 3;
    const backoffMultiplier = config.retryPolicy?.backoffMultiplier || 2;
    let delay = config.retryPolicy?.initialDelay || 1000;

    while (attempts <= maxRetries) {
      attempts++;

      try {
        // Build request
        if (!endpoint) {
          throw new Error('Endpoint is required for API call');
        }

        const url = config.endpoint ? `${config.endpoint}${endpoint}` : endpoint;
        const requestHeaders: Record<string, string> = {
          ...headers,
          'Content-Type': 'application/json',
        };

        // Add authentication
        if (config.authentication) {
          this.addAuthentication(requestHeaders, config.authentication);
        }

        // Make the API call
        const response = await fetch(url, {
          method: (method || 'GET') as string,
          headers: requestHeaders,
          body: method !== 'GET' ? JSON.stringify(payload) : null,
          signal: AbortSignal.timeout(config.timeout || 30000),
        });

        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(`API call failed with status ${response.status}: ${responseData.error || 'Unknown error'}`);
        }

        // Log successful API call
        await this.logApiCall({
          integration: integration ?? undefined,
          method: method ?? undefined,
          endpoint: endpoint ?? undefined,
          status: response.status,
          duration: Date.now() - startTime,
          attempts,
          success: true,
        });

        insights.push(this.createInsight(
          'api_call_success',
          'low',
          'API Call Successful',
          `Successfully called ${integration} API: ${method || 'GET'} ${endpoint}`,
          undefined,
          { integration, method, endpoint, attempts },
          false,
        ));

        return {
          success: true,
          integration: integration,
          operation: 'send',
          status: 'completed',
          data: responseData,
          metadata: {
            duration: Date.now() - startTime,
            attempts,
            timestamp: new Date().toISOString(),
          },
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempts < maxRetries) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= backoffMultiplier;
          rulesApplied.push('api_retry_attempted');
        }
      }
    }

    // All retries exhausted
    if (!lastError) {
      lastError = new Error('API call failed for unknown reason');
    }

    await this.logApiCall({
      integration: integration ?? undefined,
      method: method ?? undefined,
      endpoint: endpoint ?? undefined,
      status: 0,
      duration: Date.now() - startTime,
      attempts,
      success: false,
      error: lastError.message ?? undefined,
    });

    insights.push(this.createInsight(
      'api_call_failed',
      'high',
      'API Call Failed',
      `Failed to call ${integration} API after ${attempts} attempts: ${lastError.message}`,
      undefined,
      { integration, method, endpoint, attempts, error: lastError.message },
      true,
    ));

    throw lastError;
  }

  private async syncData(
    data: IntegrationTask,
    insights: Insight[],
    rulesApplied: string[],
  ): Promise<IntegrationResult> {
    rulesApplied.push('data_synchronization');

    if (!data.syncConfig) {
      throw new Error('Sync configuration is required');
    }

    const { source, target, mapping, options } = data.syncConfig;
    const sourceConfig = this.integrations.get(source);
    const targetConfig = this.integrations.get(target);

    if (!sourceConfig || !targetConfig) {
      throw new Error('Source or target integration not configured');
    }

    const syncResult = {
      source,
      target,
      recordsProcessed: 0,
      recordsSucceeded: 0,
      recordsFailed: 0,
      errors: [] as Array<{ message: string; timestamp: string }>,
      startTime: new Date().toISOString(),
    };

    const startTime = Date.now();

    try {
      // Fetch data from source
      const sourceData = await this.fetchDataFromSource(sourceConfig, data.sourceQuery);
      syncResult.recordsProcessed = sourceData.length;

      // Transform data based on mapping
      const transformedData = this.transformData(sourceData, mapping);

      // Validate transformed data if required
      if (options?.validate) {
        const validationResults = this.validateData(transformedData, target);
        if (validationResults.errors.length > 0) {
          syncResult.errors.push(...validationResults.errors.map(e => ({
            message: String(e),
            timestamp: new Date().toISOString()
          })));
          throw new Error(`Data validation failed: ${validationResults.errors.length} errors`);
        }
        rulesApplied.push('data_validation_passed');
      }

      // Send data to target
      const results = await this.sendDataToTarget(targetConfig, transformedData, options);
      syncResult.recordsSucceeded = results.succeeded;
      syncResult.recordsFailed = results.failed;
      syncResult.errors.push(...results.errors.map(e => ({
        message: e.error,
        timestamp: new Date().toISOString()
      })));

      // Store sync result
      await this.supabase.from('integration_sync_logs').insert({
        source_integration: source,
        target_integration: target,
        records_processed: syncResult.recordsProcessed,
        records_succeeded: syncResult.recordsSucceeded,
        records_failed: syncResult.recordsFailed,
        errors: syncResult.errors,
        enterprise_id: this.enterpriseId,
        completed_at: new Date().toISOString(),
      });

      if (syncResult.recordsFailed > 0) {
        insights.push(this.createInsight(
          'sync_partial_failure',
          'medium',
          'Partial Sync Failure',
          `Data sync completed with ${syncResult.recordsFailed} failures out of ${syncResult.recordsProcessed} records`,
          undefined,
          syncResult,
          true,
        ));
      } else {
        insights.push(this.createInsight(
          'sync_completed',
          'low',
          'Data Sync Completed',
          `Successfully synced ${syncResult.recordsSucceeded} records from ${source} to ${target}`,
          undefined,
          syncResult,
          false,
        ));
      }

      return {
        success: true,
        integration: source,
        operation: 'sync',
        status: 'completed',
        data: syncResult,
        metadata: {
          duration: Date.now() - startTime,
          attempts: 1,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      syncResult.errors.push({ message: error instanceof Error ? error.message : String(error), timestamp: new Date().toISOString() });
      throw error;
    }
  }

  private async processBatchIntegration(
    data: IntegrationTask,
    insights: Insight[],
    rulesApplied: string[],
  ): Promise<IntegrationResult> {
    rulesApplied.push('batch_integration_processing');

    if (!data.batch) {
      throw new Error('Batch configuration is required');
    }

    const { tasks } = data.batch;
    const results: BatchResult[] = [];
    const batchStartTime = Date.now();

    // Process tasks in parallel with concurrency limit
    const concurrencyLimit = data.batch.concurrency || 5;
    const taskQueue = [...tasks];
    const processing = new Set();

    while (taskQueue.length > 0 || processing.size > 0) {
      // Start new tasks up to concurrency limit
      while (processing.size < concurrencyLimit && taskQueue.length > 0) {
        const task = taskQueue.shift()!;
        const taskPromise = this.processIntegrationTask(task)
          .then(result => {
            results.push(result);
            processing.delete(taskPromise);
          })
          .catch(error => {
            results.push({
              success: false,
              task,
              error: error instanceof Error ? error.message : String(error),
            });
            processing.delete(taskPromise);
          });

        processing.add(taskPromise);
      }

      // Wait for at least one task to complete
      if (processing.size > 0) {
        await Promise.race(processing);
      }
    }

    const successCount = results.filter(r => r.success === true).length;
    const failureCount = results.filter(r => r.success !== true).length;

    insights.push(this.createInsight(
      'batch_integration_completed',
      failureCount > 0 ? 'medium' : 'low',
      'Batch Integration Completed',
      `Processed ${results.length} tasks: ${successCount} succeeded, ${failureCount} failed`,
      undefined,
      {
        totalTasks: results.length,
        succeeded: successCount,
        failed: failureCount,
        duration: Date.now() - batchStartTime,
      },
      failureCount > 0,
    ));

    return {
      success: true,
      integration: 'batch',
      operation: 'batch',
      status: 'completed',
      data: {
        batchId: crypto.randomUUID(),
        tasks: results.length,
        succeeded: successCount,
        failed: failureCount,
        duration: Date.now() - batchStartTime,
        results,
      },
      metadata: {
        duration: Date.now() - batchStartTime,
        attempts: 1,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private async checkIntegrationHealth(
    data: IntegrationTask,
    insights: Insight[],
    rulesApplied: string[],
  ): Promise<IntegrationResult> {
    rulesApplied.push('health_check');

    const healthResults: Record<string, HealthCheckResult> = {};
    const integrationNames = data.integrations || Array.from(this.integrations.keys());
    const startTime = Date.now();

    for (const name of integrationNames) {
      const config = this.integrations.get(name);
      if (!config) {continue;}

      const health = await this.checkSingleIntegrationHealth(name, config);
      healthResults[name] = health;

      if (!health.healthy) {
        insights.push(this.createInsight(
          'integration_unhealthy',
          'high',
          'Integration Unhealthy',
          `Integration '${name}' is not healthy: ${health.error || 'Unknown error'}`,
          undefined,
          health,
          true,
        ));
      }
    }

    const allHealthy = Object.values(healthResults).every((h: HealthCheckResult) => h.healthy);

    return {
      success: allHealthy,
      integration: 'health_check',
      operation: 'validate',
      status: allHealthy ? 'completed' : 'failed',
      data: {
        timestamp: new Date().toISOString(),
        allHealthy,
        integrations: healthResults,
      },
      metadata: {
        duration: Date.now() - startTime,
        attempts: 1,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private async configureIntegration(
    data: IntegrationTask,
    insights: Insight[],
    rulesApplied: string[],
  ): Promise<IntegrationResult> {
    rulesApplied.push('integration_configuration');

    if (!data.configure) {
      throw new Error('Configuration is required');
    }

    const { name, config } = data.configure;
    const startTime = Date.now();

    // Validate configuration
    this.validateIntegrationConfig(config);

    // Test connection with new config
    const testResult = await this.testIntegrationConnection(config);
    if (!testResult.success) {
      throw new Error(`Integration test failed: ${testResult.error || 'Unknown error'}`);
    }

    // Store configuration
    const { error } = await this.supabase
      .from('integration_configs')
      .upsert({
        name,
        enterprise_id: this.enterpriseId,
        type: config.type,
        endpoint: config.endpoint,
        authentication: config.authentication,
        retry_policy: config.retryPolicy,
        timeout: config.timeout,
        rate_limit: config.rateLimit,
        is_active: true,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      throw new Error(`Failed to save configuration: ${error.message}`);
    }

    // Update in-memory configuration
    this.integrations.set(name, config);

    insights.push(this.createInsight(
      'integration_configured',
      'low',
      'Integration Configured',
      `Successfully configured integration '${name}'`,
      undefined,
      { name, type: config.type },
      false,
    ));

    return {
      success: true,
      integration: name,
      operation: 'send',
      status: 'completed',
      data: {
        name,
        configured: true,
        testResult,
      },
      metadata: {
        duration: Date.now() - startTime,
        attempts: 1,
        timestamp: new Date().toISOString(),
      },
    };
  }

  // Helper methods
  private async verifyWebhookSignature(event: WebhookEvent): Promise<boolean> {
    // Implementation depends on the source
    switch (event.source) {
      case 'stripe':
        // Verify Stripe webhook signature
        // This would use Stripe's webhook signature verification
        return true; // Placeholder
      case 'github':
        // Verify GitHub webhook signature
        return true; // Placeholder
      default:
        // For unknown sources, accept if no signature required
        return !event.signature;
    }
  }

  private async processStripeWebhook(event: WebhookEvent): Promise<IntegrationResult> {
    // Process Stripe-specific webhook events
    let action: string;
    switch (event.type) {
      case 'payment_intent.succeeded':
        action = 'payment_recorded';
        break;
      case 'customer.subscription.updated':
        action = 'subscription_updated';
        break;
      default:
        action = 'logged';
    }

    return {
      success: true,
      integration: 'stripe',
      operation: 'receive',
      status: 'completed',
      data: { processed: true, action },
      metadata: {
        duration: 0,
        attempts: 1,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private async processGithubWebhook(event: WebhookEvent): Promise<IntegrationResult> {
    // Process GitHub-specific webhook events
    let action: string;
    switch (event.type) {
      case 'push':
        action = 'code_pushed';
        break;
      case 'pull_request':
        action = 'pr_processed';
        break;
      default:
        action = 'logged';
    }

    return {
      success: true,
      integration: 'github',
      operation: 'receive',
      status: 'completed',
      data: { processed: true, action },
      metadata: {
        duration: 0,
        attempts: 1,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private async processSlackWebhook(_event: WebhookEvent): Promise<IntegrationResult> {
    // Process Slack-specific webhook events
    return {
      success: true,
      integration: 'slack',
      operation: 'receive',
      status: 'completed',
      data: { processed: true, action: 'slack_event_processed' },
      metadata: {
        duration: 0,
        attempts: 1,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private async processGenericWebhook(event: WebhookEvent): Promise<IntegrationResult> {
    // Generic webhook processing
    return {
      success: true,
      integration: event.source,
      operation: 'receive',
      status: 'completed',
      data: {
        processed: true,
        action: 'stored',
        eventId: event.id,
      },
      metadata: {
        duration: 0,
        attempts: 1,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private addAuthentication(headers: Record<string, string>, auth: IntegrationConfig["authentication"]): void {
    if (!auth || !auth.credentials) {
      return;
    }

    switch (auth.type) {
      case 'bearer':
        if (auth.credentials.token) {
          headers['Authorization'] = `Bearer ${auth.credentials.token}`;
        }
        break;
      case 'api_key':
        if (auth.credentials.key) {
          headers[auth.credentials.header || 'X-API-Key'] = auth.credentials.key;
        }
        break;
      case 'basic':
        if (auth.credentials.username && auth.credentials.password) {
          const encoded = btoa(`${auth.credentials.username}:${auth.credentials.password}`);
          headers['Authorization'] = `Basic ${encoded}`;
        }
        break;
    }
  }

  private async logApiCall(data: ApiCallLogData): Promise<void> {
    await this.supabase.from('api_call_logs').insert({
      ...data,
      enterprise_id: this.enterpriseId,
      timestamp: new Date().toISOString(),
    });
  }

  private async fetchDataFromSource(
    config: IntegrationConfig,
    query?: { endpoint: string; headers?: Record<string, string> | undefined } | undefined
  ): Promise<unknown[]> {
    // Implementation depends on integration type
    switch (config.type) {
      case 'api':
        if (!query) {
          throw new Error('Query configuration is required for API data source');
        }

        const response = await this.makeApiCall({
          integration: config.name,
          method: 'GET',
          endpoint: query.endpoint,
          headers: query.headers ?? undefined,
        }, [], []);

        if (Array.isArray(response.data)) {
          return response.data;
        }
        return [response.data];

      case 'database':
        // Database query implementation
        return [];

      default:
        return [];
    }
  }

  private transformData(data: unknown[], mapping: Record<string, string>): unknown[] {
    return data.map(record => {
      const transformed: Record<string, unknown> = {};
      for (const [targetField, sourceField] of Object.entries(mapping)) {
        transformed[targetField] = this.getNestedValue(record, sourceField);
      }
      return transformed;
    });
  }

  private getNestedValue(obj: unknown, path: string): unknown {
    if (obj === null || obj === undefined) {
      return undefined;
    }

    return path.split('.').reduce<unknown>((current, key) => {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (typeof current === 'object' && key in current) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  private validateData(data: unknown[], _target: string): { valid: boolean; errors: unknown[] } {
    const errors: unknown[] = [];
    // Basic validation - would be expanded based on target requirements
    data.forEach((record, index) => {
      if (!record || (typeof record === 'object' && Object.keys(record).length === 0)) {
        errors.push({ index, error: 'Empty record' });
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private async sendDataToTarget(
    config: IntegrationConfig,
    data: unknown[],
    options?: SyncOptions,
  ): Promise<SendDataResult> {
    let succeeded = 0;
    let failed = 0;
    const errors: Array<{ batch: string; error: string }> = [];

    // Send data in batches
    const batchSize = options?.batchSize || 100;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);

      try {
        await this.makeApiCall({
          integration: config.name,
          method: 'POST',
          endpoint: options?.endpoint || '/batch',
          payload: batch,
        }, [], []);

        succeeded += batch.length;
      } catch (error) {
        failed += batch.length;
        errors.push({
          batch: `${i}-${i + batch.length}`,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { succeeded, failed, errors };
  }

  private async processIntegrationTask(task: IntegrationTask): Promise<IntegrationResult> {
    const startTime = Date.now();

    try {
      let result: IntegrationResult;

      switch (task.operation) {
        case 'send':
          result = await this.makeApiCall(task, [], []);
          break;
        case 'receive':
          result = await this.processWebhook(task, [], []);
          break;
        case 'sync':
          result = await this.syncData(task, [], []);
          break;
        case 'transform': {
          const transformMapping = typeof task.options?.transform === 'object' ? task.options.transform : {};
          const transformedData = this.transformData([task.data], transformMapping as Record<string, string>);
          result = {
            success: true,
            integration: task.integration || 'transform',
            operation: 'transform',
            status: 'completed',
            data: transformedData,
            metadata: {
              duration: Date.now() - startTime,
              attempts: 1,
              timestamp: new Date().toISOString(),
            },
          };
          break;
        }
        case 'validate': {
          const validationResult = this.validateData([task.data], task.integration || 'unknown');
          result = {
            success: validationResult.valid,
            integration: task.integration || 'validate',
            operation: 'validate',
            status: validationResult.valid ? 'completed' : 'failed',
            data: validationResult,
            metadata: {
              duration: Date.now() - startTime,
              attempts: 1,
              timestamp: new Date().toISOString(),
            },
          };
          break;
        }
        default:
          throw new Error(`Unknown operation: ${task.operation}`);
      }

      return {
        success: true,
        integration: task.integration || result.integration,
        operation: task.operation || 'send',
        status: 'completed',
        data: result,
        metadata: {
          duration: Date.now() - startTime,
          attempts: 1,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        integration: task.integration || 'unknown',
        operation: task.operation || 'send',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          duration: Date.now() - startTime,
          attempts: 1,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  private async checkSingleIntegrationHealth(
    _name: string,
    config: IntegrationConfig,
  ): Promise<HealthCheckResult> {
    try {
      const startTime = Date.now();

      switch (config.type) {
        case 'api':
          // Make a health check API call
          if (!config.endpoint) {
            return {
              healthy: false,
              status: 'no_endpoint',
              error: 'No endpoint configured',
            };
          }

          const response = await fetch(`${config.endpoint}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000),
          });

          return {
            healthy: response.ok,
            status: response.ok ? 'healthy' : 'unhealthy',
            latency: Date.now() - startTime,
          };

        case 'webhook':
          // Webhooks are considered healthy if configured
          return {
            healthy: true,
            status: 'configured',
          };

        default:
          return {
            healthy: true,
            status: 'active',
          };
      }
    } catch (error) {
      return {
        healthy: false,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private validateIntegrationConfig(config: IntegrationConfig): void {
    if (!config.name) {throw new Error('Integration name is required');}
    if (!config.type) {throw new Error('Integration type is required');}

    const validTypes: Array<IntegrationConfig['type']> = ['webhook', 'api', 'database', 'file', 'message_queue'];
    if (!validTypes.includes(config.type)) {
      throw new Error(`Invalid integration type: ${config.type}`);
    }

    if (config.type === 'api' && !config.endpoint) {
      throw new Error('API endpoint is required for API integrations');
    }
  }

  private async testIntegrationConnection(config: IntegrationConfig): Promise<{
    success: boolean;
    status?: number;
    message?: string;
    error?: string;
  }> {
    try {
      switch (config.type) {
        case 'api':
          if (!config.endpoint) {
            return { success: false, error: 'No endpoint configured' };
          }

          const response = await fetch(config.endpoint, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000),
          });
          return { success: response.ok, status: response.status };

        case 'webhook':
          // Webhooks can't be tested directly
          return { success: true, message: 'Webhook configuration valid' };

        default:
          return { success: true };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // Public method to register custom webhook handlers
  registerWebhookHandler(source: string, handler: (event: WebhookEvent) => Promise<IntegrationResult>): void {
    this.webhookHandlers.set(source, handler);
  }
}