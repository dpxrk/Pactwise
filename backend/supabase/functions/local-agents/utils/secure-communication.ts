import { AgentAuthService, AgentAuthContext } from './auth.ts';
import { SupabaseClient } from '@supabase/supabase-js';
import { TracingManager, SpanKind } from './tracing.ts';

export interface SecureMessage {
  id: string;
  from: string;
  to: string;
  timestamp: string;
  payload: Record<string, unknown>;
  signature?: string;
}

export interface SecureChannelOptions {
  encryptPayload?: boolean;
  requireSignature?: boolean;
  timeoutMs?: number;
  retryAttempts?: number;
}

export class SecureAgentChannel {
  private authService: AgentAuthService;
  private tracingManager: TracingManager;

  constructor(
    private supabase: SupabaseClient,
    private sourceAgentId: string,
    private enterpriseId: string,
  ) {
    this.authService = new AgentAuthService(supabase);
    this.tracingManager = new TracingManager(supabase, enterpriseId);
  }

  /**
   * Send a secure message to another agent
   */
  async sendMessage(
    targetAgentId: string,
    operation: string,
    payload: Record<string, unknown>,
    options: SecureChannelOptions = {},
  ): Promise<unknown> {
    const span = this.tracingManager.startSpan(
      'secure_channel.send',
      this.tracingManager.createTraceContext(),
      'secure-channel',
      SpanKind.CLIENT,
    );

    try {
      // Check trust relationship
      const hasTrust = await this.authService.checkAgentTrust(
        targetAgentId,
        this.sourceAgentId,
        operation,
      );

      if (!hasTrust) {
        throw new Error(`No trust relationship established with agent ${targetAgentId}`);
      }

      // Generate authentication token
      const token = await this.authService.generateJWT(
        this.sourceAgentId,
        this.enterpriseId,
        [operation],
        300, // 5 minute expiry for agent-to-agent calls
      );

      // Create secure message
      const message: SecureMessage = {
        id: crypto.randomUUID(),
        from: this.sourceAgentId,
        to: targetAgentId,
        timestamp: new Date().toISOString(),
        payload: options.encryptPayload ? await this.encryptPayload(payload) : payload,
      };

      if (options.requireSignature) {
        message.signature = await this.signMessage(message);
      }

      // Log the communication attempt
      await this.authService.logAuthEvent(
        this.sourceAgentId,
        'agent_communication',
        true,
        {
          targetAgent: targetAgentId,
          operation,
          messageId: message.id,
        },
      );

      // Send via appropriate channel (e.g., direct call, queue, or HTTP)
      const response = await this.transmitMessage(
        targetAgentId,
        operation,
        message,
        token,
        options,
      );

      this.tracingManager.endSpan(span.spanId);
      return response;

    } catch (error) {
      this.tracingManager.addLog(span.spanId, 'error', 'Secure communication failed', {
        error: error instanceof Error ? error.message : String(error),
        targetAgent: targetAgentId,
      });
      this.tracingManager.endSpan(span.spanId);

      // Log failure
      await this.authService.logAuthEvent(
        this.sourceAgentId,
        'agent_communication',
        false,
        {
          targetAgent: targetAgentId,
          operation,
          error: error instanceof Error ? error.message : String(error),
        },
        error instanceof Error ? error.message : String(error),
      );

      throw error;
    }
  }

  /**
   * Receive and validate a message from another agent
   */
  async receiveMessage(
    message: SecureMessage,
    token: string,
    expectedOperation?: string,
  ): Promise<{ authenticated: boolean; payload?: unknown; context?: AgentAuthContext }> {
    const span = this.tracingManager.startSpan(
      'secure_channel.receive',
      this.tracingManager.createTraceContext(),
      'secure-channel',
      SpanKind.SERVER,
    );

    try {
      // Verify JWT token
      const authContext = await this.authService.verifyJWT(token, message.from);

      if (!authContext.authenticated) {
        throw new Error('Invalid authentication token');
      }

      // Verify sender matches token
      if (authContext.agentId !== message.from) {
        throw new Error('Token agent mismatch');
      }

      // Check trust relationship
      const hasTrust = await this.authService.checkAgentTrust(
        this.sourceAgentId,
        message.from,
        expectedOperation,
      );

      if (!hasTrust) {
        throw new Error('No trust relationship with sender');
      }

      // Verify signature if present
      if (message.signature) {
        const isValid = await this.verifySignature(message);
        if (!isValid) {
          throw new Error('Invalid message signature');
        }
      }

      // Decrypt payload if needed
      let { payload } = message;
      if (this.isEncrypted(payload)) {
        payload = await this.decryptPayload(payload);
      }

      // Log successful receipt
      await this.authService.logAuthEvent(
        this.sourceAgentId,
        'agent_message_received',
        true,
        {
          fromAgent: message.from,
          messageId: message.id,
          operation: expectedOperation,
        },
      );

      this.tracingManager.endSpan(span.spanId);

      return {
        authenticated: true,
        payload,
        context: authContext,
      };

    } catch (error) {
      this.tracingManager.addLog(span.spanId, 'error', 'Message validation failed', {
        error: error instanceof Error ? error.message : String(error),
        fromAgent: message.from,
      });
      this.tracingManager.endSpan(span.spanId);

      // Log failure
      await this.authService.logAuthEvent(
        this.sourceAgentId,
        'agent_message_received',
        false,
        {
          fromAgent: message.from,
          messageId: message.id,
          error: error instanceof Error ? error.message : String(error),
        },
        error instanceof Error ? error.message : String(error),
      );

      return { authenticated: false };
    }
  }

  /**
   * Establish bidirectional trust between agents
   */
  async establishBidirectionalTrust(
    otherAgentId: string,
    trustLevel: 'full' | 'limited' | 'read_only',
    allowedOperations: string[],
    establishedBy: string,
    validForDays?: number,
  ): Promise<void> {
    // Create trust in both directions
    await Promise.all([
      this.authService.establishTrust(
        this.sourceAgentId,
        otherAgentId,
        trustLevel,
        allowedOperations,
        establishedBy,
        validForDays,
      ),
      this.authService.establishTrust(
        otherAgentId,
        this.sourceAgentId,
        trustLevel,
        allowedOperations,
        establishedBy,
        validForDays,
      ),
    ]);
  }

  // Private helper methods

  private async transmitMessage(
    targetAgentId: string,
    operation: string,
    message: SecureMessage,
    token: string,
    options: SecureChannelOptions,
  ): Promise<unknown> {
    // In a real implementation, this would use the appropriate transport
    // For now, we'll simulate by creating a task
    const { data: targetAgent } = await this.supabase
      .from('agents')
      .select('id, type')
      .eq('id', targetAgentId)
      .single();

    if (!targetAgent) {
      throw new Error('Target agent not found');
    }

    // Create inter-agent task
    const { data: task, error } = await this.supabase
      .from('agent_tasks')
      .insert({
        agent_id: targetAgentId,
        task_type: `inter_agent_${operation}`,
        priority: 8, // High priority for inter-agent communication
        status: 'pending',
        payload: {
          message,
          token,
          operation,
          fromAgent: this.sourceAgentId,
        },
        metadata: {
          interAgentCommunication: true,
          secureChannel: true,
        },
        enterprise_id: this.enterpriseId,
      })
      .select()
      .single();

    if (error) {throw error;}

    // Wait for response (with timeout)
    const timeoutMs = options.timeoutMs || 30000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const { data: updatedTask } = await this.supabase
        .from('agent_tasks')
        .select('status, result')
        .eq('id', task.id)
        .single();

      if (updatedTask?.status === 'completed') {
        return updatedTask.result;
      } else if (updatedTask?.status === 'failed') {
        throw new Error(updatedTask.result?.error || 'Task failed');
      }

      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Communication timeout');
  }

  private async encryptPayload(payload: Record<string, unknown>): Promise<string> {
    // SECURITY FIX: Implement real AES-256-GCM encryption
    const json = JSON.stringify(payload);
    const encoder = new TextEncoder();
    const data = encoder.encode(json);

    // Generate encryption key from agent context
    const keyMaterial = await this.getEncryptionKey();

    // Generate random IV for each encryption
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM

    // Encrypt using AES-256-GCM
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      keyMaterial,
      data,
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Encode to base64 with proper prefix
    const encoded = btoa(String.fromCharCode(...combined));
    return `AES256:${encoded}`;
  }

  private async decryptPayload(encrypted: string): Promise<unknown> {
    // Handle legacy format for backward compatibility
    if (encrypted.startsWith('ENCRYPTED:')) {
      console.warn('Using legacy encryption format - please upgrade agents');
      const encoded = encrypted.substring(10);
      const json = atob(encoded);
      return JSON.parse(json);
    }

    // SECURITY FIX: Implement real AES-256-GCM decryption
    if (!encrypted.startsWith('AES256:')) {
      throw new Error('Invalid encrypted payload format');
    }

    const encoded = encrypted.substring(7); // Remove "AES256:" prefix
    const combined = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);

    // Generate encryption key from agent context
    const keyMaterial = await this.getEncryptionKey();

    try {
      // Decrypt using AES-256-GCM
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv,
        },
        keyMaterial,
        encryptedData,
      );

      const decoder = new TextDecoder();
      const json = decoder.decode(decrypted);
      return JSON.parse(json);

    } catch (error) {
      throw new Error('Failed to decrypt payload: invalid key or corrupted data');
    }
  }

  private async getEncryptionKey(): Promise<CryptoKey> {
    // Generate consistent key based on agent and enterprise context
    const keySource = `${this.sourceAgentId}:${this.enterpriseId}:agent-communication`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(keySource);

    // Create key material using PBKDF2
    const baseKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      'PBKDF2',
      false,
      ['deriveKey'],
    );

    // Derive AES-256 key
    const salt = encoder.encode('pactwise-agent-salt-v1'); // Fixed salt for consistency
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      baseKey,
      {
        name: 'AES-GCM',
        length: 256,
      },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  private isEncrypted(payload: Record<string, unknown>): boolean {
    return typeof payload === 'string' && (
      payload.startsWith('AES256:') ||
      payload.startsWith('ENCRYPTED:') // Legacy format for backward compatibility
    );
  }

  private async signMessage(message: SecureMessage): Promise<string> {
    // In production, use proper digital signatures
    // For now, we'll create a simple HMAC-like signature
    const data = JSON.stringify({
      id: message.id,
      from: message.from,
      to: message.to,
      timestamp: message.timestamp,
      payload: message.payload,
    });

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async verifySignature(message: SecureMessage): Promise<boolean> {
    if (!message.signature) {return false;}

    const expectedSignature = await this.signMessage({
      ...message,
      signature: undefined,
    });

    return message.signature === expectedSignature;
  }
}

/**
 * Agent communication protocol
 */
export class AgentProtocol {
  static readonly VERSION = '1.0';

  static readonly Operations = {
    // Data requests
    REQUEST_DATA: 'request_data',
    SHARE_INSIGHTS: 'share_insights',

    // Task coordination
    DELEGATE_TASK: 'delegate_task',
    REQUEST_ASSISTANCE: 'request_assistance',
    REPORT_COMPLETION: 'report_completion',

    // Workflow coordination
    WORKFLOW_HANDOFF: 'workflow_handoff',
    CHECKPOINT_SYNC: 'checkpoint_sync',

    // Status queries
    HEALTH_CHECK: 'health_check',
    STATUS_QUERY: 'status_query',

    // Emergency
    EMERGENCY_STOP: 'emergency_stop',
    ROLLBACK_REQUEST: 'rollback_request',
  } as const;

  static readonly TrustLevels = {
    FULL: 'full',         // Can perform any operation
    LIMITED: 'limited',   // Can perform specific operations
    READ_ONLY: 'read_only', // Can only query data
  } as const;

  /**
   * Create a standard protocol message
   */
  static createMessage(
    operation: string,
    data: unknown,
    metadata: Record<string, unknown> = {},
  ): unknown {
    return {
      version: AgentProtocol.VERSION,
      operation,
      data,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        messageId: crypto.randomUUID(),
      },
    };
  }

  /**
   * Validate a protocol message
   */
  static validateMessage(message: unknown): boolean {
    return (
      message &&
      message.version === AgentProtocol.VERSION &&
      message.operation &&
      message.data !== undefined &&
      message.metadata?.timestamp &&
      message.metadata.messageId
    );
  }
}

/**
 * Helper to create secure channels between agents
 */
export class SecureChannelFactory {
  private channels: Map<string, SecureAgentChannel> = new Map();

  constructor(private supabase: SupabaseClient) {}

  /**
   * Get or create a secure channel for an agent
   */
  getChannel(agentId: string, enterpriseId: string): SecureAgentChannel {
    const key = `${agentId}:${enterpriseId}`;

    if (!this.channels.has(key)) {
      this.channels.set(
        key,
        new SecureAgentChannel(this.supabase, agentId, enterpriseId),
      );
    }

    return this.channels.get(key)!;
  }

  /**
   * Close all channels
   */
  closeAll(): void {
    this.channels.clear();
  }
}