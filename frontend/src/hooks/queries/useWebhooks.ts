// src/hooks/queries/useWebhooks.ts
// React Query hooks for Webhook management

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const API_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Types based on backend schema
export interface Webhook {
  id: string;
  enterprise_id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  headers?: Record<string, string>;
  is_active: boolean;
  retry_config?: {
    max_retries: number;
    retry_delay_ms: number;
  };
  created_at: string;
  updated_at: string;
  recent_deliveries?: WebhookDelivery[];
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event: string;
  success: boolean;
  status_code?: number;
  response_body?: string;
  error_message?: string;
  duration_ms: number;
  is_test: boolean;
  created_at: string;
}

export type WebhookEvent =
  | 'contract.created'
  | 'contract.updated'
  | 'contract.deleted'
  | 'contract.approved'
  | 'contract.rejected'
  | 'contract.expiring'
  | 'vendor.created'
  | 'vendor.updated'
  | 'vendor.deleted'
  | 'vendor.compliance_changed'
  | 'approval.requested'
  | 'approval.completed'
  | 'budget.threshold_reached'
  | 'budget.exceeded'
  | 'user.invited'
  | 'user.role_changed'
  | 'analysis.completed'
  | 'alert.triggered';

export interface CreateWebhookPayload {
  name: string;
  url: string;
  events: WebhookEvent[];
  headers?: Record<string, string>;
  secret?: string;
  is_active?: boolean;
  retry_config?: {
    max_retries: number;
    retry_delay_ms: number;
  };
}

export interface UpdateWebhookPayload extends Partial<CreateWebhookPayload> {}

// Helper to make authenticated requests
async function webhookRequest(
  endpoint: string,
  token: string,
  options: RequestInit = {}
) {
  const response = await fetch(`${API_URL}/functions/v1/webhooks${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Request failed');
  }

  return data;
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch list of webhooks
 */
export function useWebhookList() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => {
      if (!session?.access_token) throw new Error('Not authenticated');

      const data = await webhookRequest('', session.access_token);
      return (data.webhooks || []) as Webhook[];
    },
    enabled: !!session?.access_token,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch single webhook with delivery history
 */
export function useWebhook(webhookId: string) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['webhook', webhookId],
    queryFn: async () => {
      if (!session?.access_token) throw new Error('Not authenticated');

      const data = await webhookRequest(`/${webhookId}`, session.access_token);
      return data as Webhook;
    },
    enabled: !!session?.access_token && !!webhookId,
  });
}

/**
 * Fetch webhook delivery history
 */
export function useWebhookDeliveries(webhookId: string, limit = 50) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['webhook-deliveries', webhookId, limit],
    queryFn: async () => {
      if (!session?.access_token) throw new Error('Not authenticated');

      const data = await webhookRequest(
        `/${webhookId}/deliveries?limit=${limit}`,
        session.access_token
      );

      return {
        deliveries: (data.deliveries || []) as WebhookDelivery[],
        stats: data.stats as {
          total: number;
          successful: number;
          failed: number;
          success_rate: number;
        },
      };
    },
    enabled: !!session?.access_token && !!webhookId,
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new webhook
 */
export function useCreateWebhook() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationKey: ['createWebhook'],
    mutationFn: async (payload: CreateWebhookPayload) => {
      if (!session?.access_token) throw new Error('Not authenticated');

      const data = await webhookRequest('', session.access_token, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      return {
        webhook: data.webhook as Webhook,
        secret: data.secret as string,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook created successfully');
      // Show secret warning
      toast.info('Save your webhook secret - it will not be shown again!', {
        duration: 10000,
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to create webhook: ${error.message}`);
    },
  });
}

/**
 * Update a webhook
 */
export function useUpdateWebhook() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationKey: ['updateWebhook'],
    mutationFn: async ({
      webhookId,
      updates,
    }: {
      webhookId: string;
      updates: UpdateWebhookPayload;
    }) => {
      if (!session?.access_token) throw new Error('Not authenticated');

      const data = await webhookRequest(`/${webhookId}`, session.access_token, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      return data as Webhook;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      queryClient.invalidateQueries({ queryKey: ['webhook', data.id] });
      toast.success('Webhook updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update webhook: ${error.message}`);
    },
  });
}

/**
 * Delete a webhook
 */
export function useDeleteWebhook() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationKey: ['deleteWebhook'],
    mutationFn: async (webhookId: string) => {
      if (!session?.access_token) throw new Error('Not authenticated');

      await webhookRequest(`/${webhookId}`, session.access_token, {
        method: 'DELETE',
      });

      return webhookId;
    },
    onSuccess: (webhookId) => {
      queryClient.removeQueries({ queryKey: ['webhook', webhookId] });
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete webhook: ${error.message}`);
    },
  });
}

/**
 * Test a webhook
 */
export function useTestWebhook() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationKey: ['testWebhook'],
    mutationFn: async ({
      webhookId,
      event,
      payload,
    }: {
      webhookId: string;
      event?: string;
      payload?: Record<string, unknown>;
    }) => {
      if (!session?.access_token) throw new Error('Not authenticated');

      const data = await webhookRequest(`/${webhookId}/test`, session.access_token, {
        method: 'POST',
        body: JSON.stringify({ event: event || 'test.ping', payload }),
      });

      return data as {
        success: boolean;
        status_code?: number;
        duration_ms: number;
        error?: string;
      };
    },
    onSuccess: (result, { webhookId }) => {
      queryClient.invalidateQueries({ queryKey: ['webhook-deliveries', webhookId] });

      if (result.success) {
        toast.success(`Test webhook sent successfully (${result.duration_ms}ms)`);
      } else {
        toast.error(`Webhook test failed: ${result.error || `Status ${result.status_code}`}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to test webhook: ${error.message}`);
    },
  });
}

/**
 * Enable a webhook
 */
export function useEnableWebhook() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationKey: ['enableWebhook'],
    mutationFn: async (webhookId: string) => {
      if (!session?.access_token) throw new Error('Not authenticated');

      const data = await webhookRequest(`/${webhookId}/enable`, session.access_token, {
        method: 'POST',
      });

      return data as Webhook;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      queryClient.invalidateQueries({ queryKey: ['webhook', data.id] });
      toast.success('Webhook enabled');
    },
    onError: (error: Error) => {
      toast.error(`Failed to enable webhook: ${error.message}`);
    },
  });
}

/**
 * Disable a webhook
 */
export function useDisableWebhook() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationKey: ['disableWebhook'],
    mutationFn: async (webhookId: string) => {
      if (!session?.access_token) throw new Error('Not authenticated');

      const data = await webhookRequest(`/${webhookId}/disable`, session.access_token, {
        method: 'POST',
      });

      return data as Webhook;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      queryClient.invalidateQueries({ queryKey: ['webhook', data.id] });
      toast.success('Webhook disabled');
    },
    onError: (error: Error) => {
      toast.error(`Failed to disable webhook: ${error.message}`);
    },
  });
}

/**
 * Rotate webhook secret
 */
export function useRotateWebhookSecret() {
  const { session } = useAuth();

  return useMutation({
    mutationKey: ['rotateWebhookSecret'],
    mutationFn: async (webhookId: string) => {
      if (!session?.access_token) throw new Error('Not authenticated');

      const data = await webhookRequest(`/${webhookId}/rotate-secret`, session.access_token, {
        method: 'POST',
      });

      return {
        secret: data.secret as string,
        message: data.message as string,
      };
    },
    onSuccess: () => {
      toast.success('Webhook secret rotated');
      toast.info('Save your new secret - it will not be shown again!', {
        duration: 10000,
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to rotate secret: ${error.message}`);
    },
  });
}
