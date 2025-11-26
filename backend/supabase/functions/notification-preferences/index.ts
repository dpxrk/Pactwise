/// <reference path="../../types/global.d.ts" />

import { withMiddleware } from '../_shared/middleware.ts';
import { getUserPermissions } from '../_shared/auth.ts';
import { validateRequest, sanitizeInput } from '../_shared/validation.ts';
import { createSuccessResponse, createErrorResponseSync } from '../_shared/responses.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const channelPreferencesSchema = z.object({
  email: z.boolean().default(true),
  in_app: z.boolean().default(true),
  push: z.boolean().default(false),
  sms: z.boolean().default(false),
  slack: z.boolean().default(false),
});

const notificationCategorySchema = z.object({
  enabled: z.boolean().default(true),
  channels: channelPreferencesSchema.optional(),
  frequency: z.enum(['immediate', 'hourly', 'daily', 'weekly']).default('immediate'),
  quiet_hours: z.object({
    enabled: z.boolean().default(false),
    start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    timezone: z.string().optional(),
  }).optional(),
});

const updatePreferencesSchema = z.object({
  global: z.object({
    enabled: z.boolean().default(true),
    channels: channelPreferencesSchema.optional(),
    quiet_hours: z.object({
      enabled: z.boolean().default(false),
      start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      timezone: z.string().optional(),
      days: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional(),
    }).optional(),
  }).optional(),
  categories: z.record(notificationCategorySchema).optional(),
});

const createDigestSchema = z.object({
  name: z.string().min(1).max(100),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  day_of_week: z.number().int().min(0).max(6).optional(),
  day_of_month: z.number().int().min(1).max(28).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).default('09:00'),
  timezone: z.string().default('UTC'),
  categories: z.array(z.string()).min(1),
  channels: z.array(z.enum(['email', 'in_app', 'slack'])).min(1),
  is_active: z.boolean().default(true),
});

const updateDigestSchema = createDigestSchema.partial();

const subscribeSchema = z.object({
  entity_type: z.enum(['contracts', 'vendors', 'budgets', 'rfqs', 'documents']),
  entity_id: z.string().uuid(),
  events: z.array(z.string()).min(1),
});

// ============================================================================
// DEFAULT PREFERENCES
// ============================================================================

const DEFAULT_PREFERENCES = {
  global: {
    enabled: true,
    channels: {
      email: true,
      in_app: true,
      push: false,
      sms: false,
      slack: false,
    },
    quiet_hours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
      timezone: 'UTC',
      days: [],
    },
  },
  categories: {
    contracts: {
      enabled: true,
      frequency: 'immediate',
      events: {
        created: true,
        updated: true,
        status_changed: true,
        expiring_soon: true,
        expired: true,
        renewal_due: true,
        approval_required: true,
        approved: true,
        rejected: true,
        comment_added: true,
      },
    },
    vendors: {
      enabled: true,
      frequency: 'immediate',
      events: {
        created: true,
        updated: true,
        status_changed: true,
        compliance_issue: true,
        performance_alert: true,
        communication_received: true,
      },
    },
    budgets: {
      enabled: true,
      frequency: 'immediate',
      events: {
        threshold_warning: true,
        threshold_critical: true,
        exceeded: true,
        updated: true,
      },
    },
    compliance: {
      enabled: true,
      frequency: 'immediate',
      events: {
        check_required: true,
        check_failed: true,
        item_expiring: true,
        status_changed: true,
      },
    },
    sla: {
      enabled: true,
      frequency: 'immediate',
      events: {
        at_risk: true,
        breached: true,
        measurement_due: true,
      },
    },
    rfq: {
      enabled: true,
      frequency: 'immediate',
      events: {
        quote_received: true,
        deadline_approaching: true,
        awarded: true,
      },
    },
    system: {
      enabled: true,
      frequency: 'immediate',
      events: {
        security_alert: true,
        maintenance: true,
        feature_update: true,
      },
    },
  },
};

// ============================================================================
// MAIN HANDLER
// ============================================================================

export default withMiddleware(
  async (context) => {
    const { req, user: profile } = context;
    const supabase = createAdminClient();
    const url = new URL(req.url);
    const { pathname } = url;
    const { method } = req;

    // ========================================================================
    // GET /notification-preferences - Get user's preferences
    // ========================================================================
    if (method === 'GET' && pathname === '/notification-preferences') {
      const { data: preferences, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', profile.id)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Return existing or default preferences
      const userPreferences = preferences || {
        ...DEFAULT_PREFERENCES,
        user_id: profile.id,
        enterprise_id: profile.enterprise_id,
      };

      return createSuccessResponse(userPreferences, undefined, 200, req);
    }

    // ========================================================================
    // PUT /notification-preferences - Update preferences
    // ========================================================================
    if (method === 'PUT' && pathname === '/notification-preferences') {
      const body = await req.json();
      const validatedData = validateRequest(updatePreferencesSchema, body);

      // Get existing preferences
      const { data: existing } = await supabase
        .from('notification_preferences')
        .select('id')
        .eq('user_id', profile.id)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      let preferences;

      if (existing) {
        const { data, error } = await supabase
          .from('notification_preferences')
          .update({
            ...validatedData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        preferences = data;
      } else {
        const { data, error } = await supabase
          .from('notification_preferences')
          .insert({
            ...DEFAULT_PREFERENCES,
            ...validatedData,
            user_id: profile.id,
            enterprise_id: profile.enterprise_id,
          })
          .select()
          .single();

        if (error) throw error;
        preferences = data;
      }

      return createSuccessResponse(preferences, undefined, 200, req);
    }

    // ========================================================================
    // PATCH /notification-preferences/category/:category - Update category
    // ========================================================================
    const categoryMatch = pathname.match(/^\/notification-preferences\/category\/([a-z_]+)$/);
    if (method === 'PATCH' && categoryMatch) {
      const category = categoryMatch[1];

      const body = await req.json();
      const validatedData = validateRequest(notificationCategorySchema, body);

      // Get existing preferences
      const { data: existing } = await supabase
        .from('notification_preferences')
        .select('id, categories')
        .eq('user_id', profile.id)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      const currentCategories = existing?.categories || DEFAULT_PREFERENCES.categories;
      const updatedCategories = {
        ...currentCategories,
        [category]: {
          ...(currentCategories as Record<string, unknown>)[category],
          ...validatedData,
        },
      };

      let preferences;

      if (existing) {
        const { data, error } = await supabase
          .from('notification_preferences')
          .update({
            categories: updatedCategories,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        preferences = data;
      } else {
        const { data, error } = await supabase
          .from('notification_preferences')
          .insert({
            ...DEFAULT_PREFERENCES,
            categories: updatedCategories,
            user_id: profile.id,
            enterprise_id: profile.enterprise_id,
          })
          .select()
          .single();

        if (error) throw error;
        preferences = data;
      }

      return createSuccessResponse(preferences, undefined, 200, req);
    }

    // ========================================================================
    // POST /notification-preferences/mute - Temporarily mute notifications
    // ========================================================================
    if (method === 'POST' && pathname === '/notification-preferences/mute') {
      const body = await req.json();
      const { duration_hours, category } = z.object({
        duration_hours: z.number().int().min(1).max(168).default(24),
        category: z.string().optional(),
      }).parse(body);

      const muteUntil = new Date();
      muteUntil.setHours(muteUntil.getHours() + duration_hours);

      // Get existing preferences
      const { data: existing } = await supabase
        .from('notification_preferences')
        .select('id, mute_settings')
        .eq('user_id', profile.id)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      const muteSettings = (existing?.mute_settings || {}) as Record<string, unknown>;

      if (category) {
        muteSettings[category] = muteUntil.toISOString();
      } else {
        muteSettings.global = muteUntil.toISOString();
      }

      let preferences;

      if (existing) {
        const { data, error } = await supabase
          .from('notification_preferences')
          .update({
            mute_settings: muteSettings,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        preferences = data;
      } else {
        const { data, error } = await supabase
          .from('notification_preferences')
          .insert({
            ...DEFAULT_PREFERENCES,
            mute_settings: muteSettings,
            user_id: profile.id,
            enterprise_id: profile.enterprise_id,
          })
          .select()
          .single();

        if (error) throw error;
        preferences = data;
      }

      return createSuccessResponse({
        message: 'Notifications muted',
        mute_until: muteUntil.toISOString(),
        category: category || 'global',
      }, undefined, 200, req);
    }

    // ========================================================================
    // DELETE /notification-preferences/mute - Unmute notifications
    // ========================================================================
    if (method === 'DELETE' && pathname === '/notification-preferences/mute') {
      const params = Object.fromEntries(url.searchParams);
      const category = params.category;

      const { data: existing } = await supabase
        .from('notification_preferences')
        .select('id, mute_settings')
        .eq('user_id', profile.id)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (existing) {
        const muteSettings = (existing.mute_settings || {}) as Record<string, unknown>;

        if (category) {
          delete muteSettings[category];
        } else {
          delete muteSettings.global;
        }

        await supabase
          .from('notification_preferences')
          .update({
            mute_settings: muteSettings,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      }

      return createSuccessResponse({
        message: 'Notifications unmuted',
        category: category || 'global',
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /notification-preferences/digests - List digest subscriptions
    // ========================================================================
    if (method === 'GET' && pathname === '/notification-preferences/digests') {
      const { data: digests, error } = await supabase
        .from('notification_digests')
        .select('*')
        .eq('user_id', profile.id)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        digests: digests || [],
        total: digests?.length || 0,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /notification-preferences/digests - Create digest
    // ========================================================================
    if (method === 'POST' && pathname === '/notification-preferences/digests') {
      const body = await req.json();
      const validatedData = validateRequest(createDigestSchema, body);

      const { data: digest, error } = await supabase
        .from('notification_digests')
        .insert({
          ...validatedData,
          user_id: profile.id,
          enterprise_id: profile.enterprise_id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return createSuccessResponse(digest, undefined, 201, req);
    }

    // ========================================================================
    // GET /notification-preferences/digests/:id - Get single digest
    // ========================================================================
    const digestMatch = pathname.match(/^\/notification-preferences\/digests\/([a-f0-9-]+)$/);
    if (method === 'GET' && digestMatch) {
      const digestId = sanitizeInput.uuid(digestMatch[1]);

      const { data: digest, error } = await supabase
        .from('notification_digests')
        .select('*')
        .eq('id', digestId)
        .eq('user_id', profile.id)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (error || !digest) {
        return createErrorResponseSync('Digest not found', 404, req);
      }

      return createSuccessResponse(digest, undefined, 200, req);
    }

    // ========================================================================
    // PATCH /notification-preferences/digests/:id - Update digest
    // ========================================================================
    if (method === 'PATCH' && digestMatch) {
      const digestId = sanitizeInput.uuid(digestMatch[1]);

      const body = await req.json();
      const validatedData = validateRequest(updateDigestSchema, body);

      const { data: digest, error } = await supabase
        .from('notification_digests')
        .update({
          ...validatedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', digestId)
        .eq('user_id', profile.id)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!digest) {
        return createErrorResponseSync('Digest not found', 404, req);
      }

      return createSuccessResponse(digest, undefined, 200, req);
    }

    // ========================================================================
    // DELETE /notification-preferences/digests/:id - Delete digest
    // ========================================================================
    if (method === 'DELETE' && digestMatch) {
      const digestId = sanitizeInput.uuid(digestMatch[1]);

      const { error } = await supabase
        .from('notification_digests')
        .update({
          deleted_at: new Date().toISOString(),
        })
        .eq('id', digestId)
        .eq('user_id', profile.id)
        .eq('enterprise_id', profile.enterprise_id);

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        message: 'Digest deleted',
        id: digestId,
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /notification-preferences/subscriptions - List entity subscriptions
    // ========================================================================
    if (method === 'GET' && pathname === '/notification-preferences/subscriptions') {
      const params = Object.fromEntries(url.searchParams);
      const entityType = params.entity_type;

      let query = supabase
        .from('entity_subscriptions')
        .select('*')
        .eq('user_id', profile.id)
        .eq('enterprise_id', profile.enterprise_id)
        .eq('is_active', true);

      if (entityType) {
        query = query.eq('entity_type', entityType);
      }

      const { data: subscriptions, error } = await query;

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        subscriptions: subscriptions || [],
        total: subscriptions?.length || 0,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /notification-preferences/subscriptions - Subscribe to entity
    // ========================================================================
    if (method === 'POST' && pathname === '/notification-preferences/subscriptions') {
      const body = await req.json();
      const validatedData = validateRequest(subscribeSchema, body);

      const { data: subscription, error } = await supabase
        .from('entity_subscriptions')
        .upsert({
          ...validatedData,
          user_id: profile.id,
          enterprise_id: profile.enterprise_id,
          is_active: true,
          subscribed_at: new Date().toISOString(),
        }, { onConflict: 'user_id,entity_type,entity_id' })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return createSuccessResponse(subscription, undefined, 201, req);
    }

    // ========================================================================
    // DELETE /notification-preferences/subscriptions/:entityType/:entityId
    // ========================================================================
    const unsubscribeMatch = pathname.match(/^\/notification-preferences\/subscriptions\/(contracts|vendors|budgets|rfqs|documents)\/([a-f0-9-]+)$/);
    if (method === 'DELETE' && unsubscribeMatch) {
      const entityType = unsubscribeMatch[1];
      const entityId = sanitizeInput.uuid(unsubscribeMatch[2]);

      const { error } = await supabase
        .from('entity_subscriptions')
        .update({
          is_active: false,
          unsubscribed_at: new Date().toISOString(),
        })
        .eq('user_id', profile.id)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('enterprise_id', profile.enterprise_id);

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        message: 'Unsubscribed',
        entity_type: entityType,
        entity_id: entityId,
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /notification-preferences/channels - Get available channels
    // ========================================================================
    if (method === 'GET' && pathname === '/notification-preferences/channels') {
      // Get enterprise's configured channels
      const { data: enterprise } = await supabase
        .from('enterprises')
        .select('notification_channels')
        .eq('id', profile.enterprise_id)
        .single();

      const channels = [
        {
          id: 'email',
          name: 'Email',
          description: 'Receive notifications via email',
          enabled: true,
          requires_verification: false,
        },
        {
          id: 'in_app',
          name: 'In-App',
          description: 'Receive notifications within the application',
          enabled: true,
          requires_verification: false,
        },
        {
          id: 'push',
          name: 'Push Notifications',
          description: 'Receive push notifications on your device',
          enabled: enterprise?.notification_channels?.push || false,
          requires_verification: true,
        },
        {
          id: 'sms',
          name: 'SMS',
          description: 'Receive notifications via text message',
          enabled: enterprise?.notification_channels?.sms || false,
          requires_verification: true,
        },
        {
          id: 'slack',
          name: 'Slack',
          description: 'Receive notifications in Slack',
          enabled: enterprise?.notification_channels?.slack || false,
          requires_verification: true,
        },
      ];

      return createSuccessResponse({ channels }, undefined, 200, req);
    }

    // ========================================================================
    // GET /notification-preferences/categories - Get available categories
    // ========================================================================
    if (method === 'GET' && pathname === '/notification-preferences/categories') {
      const categories = [
        {
          id: 'contracts',
          name: 'Contracts',
          description: 'Contract-related notifications',
          events: [
            { id: 'created', name: 'Contract Created' },
            { id: 'updated', name: 'Contract Updated' },
            { id: 'status_changed', name: 'Status Changed' },
            { id: 'expiring_soon', name: 'Expiring Soon' },
            { id: 'expired', name: 'Expired' },
            { id: 'renewal_due', name: 'Renewal Due' },
            { id: 'approval_required', name: 'Approval Required' },
            { id: 'approved', name: 'Approved' },
            { id: 'rejected', name: 'Rejected' },
            { id: 'comment_added', name: 'Comment Added' },
          ],
        },
        {
          id: 'vendors',
          name: 'Vendors',
          description: 'Vendor-related notifications',
          events: [
            { id: 'created', name: 'Vendor Created' },
            { id: 'updated', name: 'Vendor Updated' },
            { id: 'status_changed', name: 'Status Changed' },
            { id: 'compliance_issue', name: 'Compliance Issue' },
            { id: 'performance_alert', name: 'Performance Alert' },
            { id: 'communication_received', name: 'Communication Received' },
          ],
        },
        {
          id: 'budgets',
          name: 'Budgets',
          description: 'Budget-related notifications',
          events: [
            { id: 'threshold_warning', name: 'Warning Threshold' },
            { id: 'threshold_critical', name: 'Critical Threshold' },
            { id: 'exceeded', name: 'Budget Exceeded' },
            { id: 'updated', name: 'Budget Updated' },
          ],
        },
        {
          id: 'compliance',
          name: 'Compliance',
          description: 'Compliance-related notifications',
          events: [
            { id: 'check_required', name: 'Check Required' },
            { id: 'check_failed', name: 'Check Failed' },
            { id: 'item_expiring', name: 'Item Expiring' },
            { id: 'status_changed', name: 'Status Changed' },
          ],
        },
        {
          id: 'sla',
          name: 'SLAs',
          description: 'SLA-related notifications',
          events: [
            { id: 'at_risk', name: 'SLA At Risk' },
            { id: 'breached', name: 'SLA Breached' },
            { id: 'measurement_due', name: 'Measurement Due' },
          ],
        },
        {
          id: 'rfq',
          name: 'RFQs',
          description: 'RFQ-related notifications',
          events: [
            { id: 'quote_received', name: 'Quote Received' },
            { id: 'deadline_approaching', name: 'Deadline Approaching' },
            { id: 'awarded', name: 'RFQ Awarded' },
          ],
        },
        {
          id: 'system',
          name: 'System',
          description: 'System notifications',
          events: [
            { id: 'security_alert', name: 'Security Alert' },
            { id: 'maintenance', name: 'Maintenance' },
            { id: 'feature_update', name: 'Feature Update' },
          ],
        },
      ];

      return createSuccessResponse({ categories }, undefined, 200, req);
    }

    // Method not allowed
    return createErrorResponseSync('Not found', 404, req);
  },
  {
    requireAuth: true,
    rateLimit: true,
    zeroTrust: { resource: 'notification_preferences', action: 'access' },
    detectThreats: true,
    compliance: { framework: 'GDPR' },
  },
  'notification-preferences',
);
