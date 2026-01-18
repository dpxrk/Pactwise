import { withMiddleware } from '../_shared/middleware.ts';
import { createErrorResponse, createSuccessResponse } from '../_shared/responses.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';

// Email service configuration (Resend example, can be replaced with SendGrid, etc.)
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'noreply@pactwise.com';

// Email templates
const EMAIL_TEMPLATES = {
  contract_expiry: {
    subject: 'Contract Expiring Soon: {{contract_title}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Contract Expiry Notice</h2>
        <p>Hello {{user_name}},</p>
        <p>The following contract is expiring soon:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>{{contract_title}}</h3>
          <p><strong>Vendor:</strong> {{vendor_name}}</p>
          <p><strong>Expiry Date:</strong> {{expiry_date}}</p>
          <p><strong>Days Until Expiry:</strong> {{days_until_expiry}}</p>
          <p><strong>Contract Value:</strong> {{contract_value}}</p>
        </div>
        <p>Please take action to renew or terminate this contract.</p>
        <div style="margin: 30px 0;">
          <a href="{{action_url}}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View Contract</a>
        </div>
        <p>Best regards,<br>Pactwise Team</p>
      </div>
    `,
  },
  budget_alert: {
    subject: 'Budget Alert: {{budget_name}} {{alert_type}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: {{alert_color}};">Budget {{alert_type}}</h2>
        <p>Hello {{user_name}},</p>
        <p>Budget "{{budget_name}}" has reached a critical threshold:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Total Budget:</strong> {{total_budget}}</p>
          <p><strong>Spent Amount:</strong> {{spent_amount}}</p>
          <p><strong>Remaining:</strong> {{remaining_amount}}</p>
          <p><strong>Utilization:</strong> {{utilization_percentage}}%</p>
        </div>
        <p>{{recommendation}}</p>
        <div style="margin: 30px 0;">
          <a href="{{action_url}}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View Budget Details</a>
        </div>
      </div>
    `,
  },
  vendor_compliance: {
    subject: 'Vendor Compliance Issue: {{vendor_name}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Vendor Compliance Alert</h2>
        <p>Hello {{user_name}},</p>
        <p>A compliance issue has been detected for vendor "{{vendor_name}}":</p>
        <div style="background: #FEF2F2; border-left: 4px solid #EF4444; padding: 15px; margin: 20px 0;">
          <h4>{{issue_type}}</h4>
          <p>{{issue_description}}</p>
          <p><strong>Severity:</strong> {{severity}}</p>
          <p><strong>Required Action:</strong> {{required_action}}</p>
        </div>
        <div style="margin: 30px 0;">
          <a href="{{action_url}}" style="background: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Address Issue</a>
        </div>
      </div>
    `,
  },
  approval_request: {
    subject: 'Approval Required: {{item_type}} - {{item_title}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Approval Request</h2>
        <p>Hello {{user_name}},</p>
        <p>Your approval is required for the following {{item_type}}:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>{{item_title}}</h3>
          {{#if item_details}}
          <div style="margin-top: 10px;">
            {{item_details}}
          </div>
          {{/if}}
        </div>
        <div style="margin: 30px 0;">
          <a href="{{approve_url}}" style="background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-right: 10px;">Approve</a>
          <a href="{{reject_url}}" style="background: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Reject</a>
          <a href="{{view_url}}" style="background: #6B7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-left: 10px;">View Details</a>
        </div>
      </div>
    `,
  },
  weekly_digest: {
    subject: 'Your Weekly Pactwise Summary',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Weekly Summary</h2>
        <p>Hello {{user_name}},</p>
        <p>Here's your weekly activity summary:</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Contracts</h3>
          <ul>
            <li>New Contracts: {{new_contracts}}</li>
            <li>Expiring Soon: {{expiring_contracts}}</li>
            <li>Pending Approval: {{pending_approvals}}</li>
          </ul>
          
          <h3>Vendors</h3>
          <ul>
            <li>New Vendors: {{new_vendors}}</li>
            <li>Performance Alerts: {{vendor_alerts}}</li>
          </ul>
          
          <h3>Budgets</h3>
          <ul>
            <li>Budget Utilization: {{avg_budget_utilization}}%</li>
            <li>At Risk Budgets: {{at_risk_budgets}}</li>
          </ul>
        </div>
        
        <div style="margin: 30px 0;">
          <a href="{{dashboard_url}}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View Dashboard</a>
        </div>
      </div>
    `,
  },
};

export default withMiddleware(
  async (context) => {
    const { req } = context;
    const url = new URL(req.url);
    const { pathname } = url;
    const { method } = req;

  // Send email endpoint
  if (method === 'POST' && pathname === '/notifications/send-email') {
    const { to, template, data, customSubject, customHtml } = await req.json();

    if (!to || (!template && !customHtml)) {
      return createErrorResponse( 'Missing required fields', 400);
    }

    // Get template or use custom
    const emailTemplate = template && template in EMAIL_TEMPLATES 
      ? EMAIL_TEMPLATES[template as keyof typeof EMAIL_TEMPLATES] 
      : null;
    const subject = customSubject || (emailTemplate ? renderTemplate(emailTemplate.subject, data) : 'Notification from Pactwise');
    const html = customHtml || (emailTemplate ? renderTemplate(emailTemplate.html, data) : '');

    // Send email using Resend (or your preferred service)
    const emailResponse = await sendEmail({
      to,
      from: EMAIL_FROM,
      subject,
      html,
    });

    return createSuccessResponse( { success: true, messageId: emailResponse.id });
  }

  // Batch send emails
  if (method === 'POST' && pathname === '/notifications/send-batch') {
    const { recipients, template, baseData } = await req.json();

    if (!recipients || !Array.isArray(recipients) || !template) {
      return createErrorResponse( 'Invalid batch request', 400);
    }

    const results = await Promise.allSettled(
      recipients.map(async (recipient) => {
        const data = { ...baseData, ...recipient.data };
        const emailTemplate = template in EMAIL_TEMPLATES 
          ? EMAIL_TEMPLATES[template as keyof typeof EMAIL_TEMPLATES]
          : null;

        return sendEmail({
          to: recipient.email,
          from: EMAIL_FROM,
          subject: renderTemplate(emailTemplate?.subject || 'Notification', data),
          html: renderTemplate(emailTemplate?.html || '', data),
        });
      }),
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return createSuccessResponse( {
      success: true,
      sent: successful,
      failed,
      results: results.map((r, i) => ({
        email: recipients[i].email,
        success: r.status === 'fulfilled',
        error: r.status === 'rejected' ? r.reason : null,
      })),
    });
  }

  // Process notification queue
  if (method === 'POST' && pathname === '/notifications/process-queue') {
    const supabase = createSupabaseClient();

    // Get pending email notifications
    const { data: pendingNotifications } = await supabase
      .from('notifications')
      .select(`
        *,
        user:users(email, first_name, last_name)
      `)
      .eq('data->email_sent', false)
      .in('type', ['contract_expiry', 'budget_alert', 'vendor_compliance', 'approval_request'])
      .limit(50);

    if (!pendingNotifications || pendingNotifications.length === 0) {
      return createSuccessResponse( { processed: 0 });
    }

    // Process each notification
    const results = await Promise.allSettled(
      pendingNotifications.map(async (notification: Record<string, unknown> & {
        id: string;
        type: string;
        user?: { email?: string; first_name?: string; last_name?: string };
        data: Record<string, unknown>;
      }) => {
        if (!notification.user?.email) {return;}

        const template = notification.type in EMAIL_TEMPLATES
          ? EMAIL_TEMPLATES[notification.type as keyof typeof EMAIL_TEMPLATES]
          : null;
        if (!template) {return;}

        const emailData = {
          user_name: `${notification.user.first_name} ${notification.user.last_name}`,
          ...notification.data,
        };

        await sendEmail({
          to: notification.user.email,
          from: EMAIL_FROM,
          subject: renderTemplate(template.subject, emailData),
          html: renderTemplate(template.html, emailData),
        });

        // Mark as sent
        await supabase
          .from('notifications')
          .update({
            data: {
              ...notification.data,
              email_sent: true,
              email_sent_at: new Date().toISOString(),
            },
          })
          .eq('id', notification.id);
      }),
    );

    return createSuccessResponse( {
      processed: results.filter((r: PromiseSettledResult<unknown>) => r.status === 'fulfilled').length,
    });
  }

    // Generate digest for an enterprise
    if (method === 'POST' && pathname === '/notifications/generate-digest') {
      const supabase = createSupabaseClient();
      const body = await req.json();
      const { enterprise_id, user_id, digest_type = 'weekly' } = body;

      if (!enterprise_id) {
        return createErrorResponse('Missing enterprise_id', 400);
      }

      // Calculate date range based on digest type
      const now = new Date();
      const startDate = new Date();
      if (digest_type === 'weekly') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (digest_type === 'daily') {
        startDate.setDate(startDate.getDate() - 1);
      } else if (digest_type === 'monthly') {
        startDate.setMonth(startDate.getMonth() - 1);
      }

      // Check if digest already exists for this period (deduplication)
      if (user_id) {
        const { data: existingDigest } = await supabase
          .from('notification_digests')
          .select('id, email_sent')
          .eq('user_id', user_id)
          .eq('digest_type', digest_type)
          .gte('period_start', startDate.toISOString())
          .lte('period_end', now.toISOString())
          .maybeSingle();

        if (existingDigest && existingDigest.email_sent) {
          return createSuccessResponse({
            skipped: true,
            message: 'Digest already sent for this period',
            digest_id: existingDigest.id,
          });
        }
      }

      // Gather statistics in parallel
      const [
        contractStats,
        vendorStats,
        budgetStats,
        activityLogs,
        userInfo,
      ] = await Promise.all([
        // Contract statistics
        supabase
          .from('contracts')
          .select('id, status, created_at, expiry_date')
          .eq('enterprise_id', enterprise_id)
          .is('deleted_at', null),
        // Vendor statistics
        supabase
          .from('vendors')
          .select('id, status, created_at, performance_score')
          .eq('enterprise_id', enterprise_id)
          .is('deleted_at', null),
        // Budget statistics
        supabase
          .from('budgets')
          .select('id, total_amount, spent_amount, status')
          .eq('enterprise_id', enterprise_id)
          .is('deleted_at', null),
        // Recent activity
        supabase
          .from('activity_logs')
          .select('id, action_type, entity_type, created_at')
          .eq('enterprise_id', enterprise_id)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: false })
          .limit(50),
        // User info for the digest recipient
        user_id
          ? supabase
              .from('users')
              .select('id, email, first_name, last_name, notification_preferences')
              .eq('id', user_id)
              .eq('enterprise_id', enterprise_id)
              .single()
          : Promise.resolve({ data: null }),
      ]);

      // Calculate metrics from the results
      const contracts = contractStats.data || [];
      const vendors = vendorStats.data || [];
      const budgets = budgetStats.data || [];

      // New contracts in the period
      const newContracts = contracts.filter(
        (c) => new Date(c.created_at) >= startDate
      ).length;

      // Expiring contracts (within 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const expiringContracts = contracts.filter(
        (c) =>
          c.expiry_date &&
          new Date(c.expiry_date) <= thirtyDaysFromNow &&
          new Date(c.expiry_date) >= now
      ).length;

      // Pending approvals
      const pendingApprovals = contracts.filter(
        (c) => c.status === 'pending_approval'
      ).length;

      // New vendors in the period
      const newVendors = vendors.filter(
        (v) => new Date(v.created_at) >= startDate
      ).length;

      // Vendor performance alerts (score < 3)
      const vendorAlerts = vendors.filter(
        (v) => v.performance_score !== null && v.performance_score < 3
      ).length;

      // Budget utilization
      const activeBudgets = budgets.filter((b) => b.status === 'active');
      const avgBudgetUtilization =
        activeBudgets.length > 0
          ? Math.round(
              activeBudgets.reduce((sum, b) => {
                const utilization =
                  b.total_amount > 0
                    ? (b.spent_amount / b.total_amount) * 100
                    : 0;
                return sum + utilization;
              }, 0) / activeBudgets.length
            )
          : 0;

      // At-risk budgets (>80% utilized)
      const atRiskBudgets = activeBudgets.filter((b) => {
        const utilization =
          b.total_amount > 0 ? (b.spent_amount / b.total_amount) * 100 : 0;
        return utilization > 80;
      }).length;

      // Compile digest data
      const digestData: {
        period: string;
        start_date: string;
        end_date: string;
        stats: {
          contracts: { total: number; new: number; expiring_soon: number; pending_approval: number };
          vendors: { total: number; new: number; alerts: number };
          budgets: { total: number; avg_utilization: number; at_risk: number };
          activities: number;
        };
        email_sent?: boolean;
        email_recipient?: string;
        email_error?: string;
      } = {
        period: digest_type,
        start_date: startDate.toISOString(),
        end_date: now.toISOString(),
        stats: {
          contracts: {
            total: contracts.length,
            new: newContracts,
            expiring_soon: expiringContracts,
            pending_approval: pendingApprovals,
          },
          vendors: {
            total: vendors.length,
            new: newVendors,
            alerts: vendorAlerts,
          },
          budgets: {
            total: budgets.length,
            avg_utilization: avgBudgetUtilization,
            at_risk: atRiskBudgets,
          },
          activities: activityLogs.data?.length || 0,
        },
      };

      // If user_id provided, send the digest email
      if (userInfo.data && userInfo.data.email) {
        const user = userInfo.data;
        const appUrl = Deno.env.get('APP_URL') || 'https://app.pactwise.io';

        const emailData = {
          user_name: `${user.first_name} ${user.last_name}`,
          new_contracts: newContracts,
          expiring_contracts: expiringContracts,
          pending_approvals: pendingApprovals,
          new_vendors: newVendors,
          vendor_alerts: vendorAlerts,
          avg_budget_utilization: avgBudgetUtilization,
          at_risk_budgets: atRiskBudgets,
          dashboard_url: `${appUrl}/dashboard`,
        };

        const template = EMAIL_TEMPLATES.weekly_digest;

        try {
          await sendEmail({
            to: user.email,
            from: EMAIL_FROM,
            subject: renderTemplate(template.subject, emailData),
            html: renderTemplate(template.html, emailData),
          });

          digestData.email_sent = true;
          digestData.email_recipient = user.email;
        } catch (err) {
          console.error('Failed to send digest email:', err);
          digestData.email_sent = false;
          digestData.email_error = (err as Error).message;
        }
      }

      // Persist digest to database if user_id provided
      let digestId: string | null = null;
      if (user_id) {
        const { data: insertedDigest, error: insertError } = await supabase
          .from('notification_digests')
          .insert({
            enterprise_id,
            user_id,
            digest_type,
            period_start: startDate.toISOString(),
            period_end: now.toISOString(),
            statistics: digestData.stats,
            notification_count: digestData.stats.activities || 0,
            email_sent: digestData.email_sent || false,
            sent_at: digestData.email_sent ? now.toISOString() : null,
          })
          .select('id')
          .single();

        if (!insertError && insertedDigest) {
          digestId = insertedDigest.id;
        }
      }

      return createSuccessResponse({ ...digestData, digest_id: digestId });
    }

    // Generate bulk digests for all users with digest enabled
    if (method === 'POST' && pathname === '/notifications/generate-bulk-digests') {
      const supabase = createSupabaseClient();
      const body = await req.json();
      const { digest_type = 'weekly' } = body;

      // Get all users with weekly digest enabled
      const { data: users } = await supabase
        .from('users')
        .select('id, email, enterprise_id, first_name, last_name, notification_preferences')
        .eq('is_active', true)
        .not('enterprise_id', 'is', null);

      if (!users || users.length === 0) {
        return createSuccessResponse({ processed: 0, message: 'No users found' });
      }

      // Filter users who have digest notifications enabled
      const digestUsers = users.filter((user) => {
        const prefs = user.notification_preferences as Record<string, boolean> | null;
        return prefs?.email_digest !== false; // Default to true if not set
      });

      // Group by enterprise to reduce duplicate queries
      const enterpriseUserMap = new Map<string, typeof users>();
      for (const user of digestUsers) {
        if (!user.enterprise_id) continue;
        const existing = enterpriseUserMap.get(user.enterprise_id) || [];
        existing.push(user);
        enterpriseUserMap.set(user.enterprise_id, existing);
      }

      // Process each enterprise
      const results: Array<{ enterprise_id: string; users_processed: number; success: boolean }> = [];

      for (const [enterpriseId, enterpriseUsers] of enterpriseUserMap) {
        try {
          // Generate digest for this enterprise (first user as representative)
          const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notifications/generate-digest`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': req.headers.get('Authorization') || '',
            },
            body: JSON.stringify({
              enterprise_id: enterpriseId,
              digest_type,
            }),
          });

          if (response.ok) {
            const digestData = await response.json();

            // Send to each user in this enterprise
            for (const user of enterpriseUsers) {
              const appUrl = Deno.env.get('APP_URL') || 'https://app.pactwise.io';
              const emailData = {
                user_name: `${user.first_name} ${user.last_name}`,
                new_contracts: digestData.stats?.contracts?.new || 0,
                expiring_contracts: digestData.stats?.contracts?.expiring_soon || 0,
                pending_approvals: digestData.stats?.contracts?.pending_approval || 0,
                new_vendors: digestData.stats?.vendors?.new || 0,
                vendor_alerts: digestData.stats?.vendors?.alerts || 0,
                avg_budget_utilization: digestData.stats?.budgets?.avg_utilization || 0,
                at_risk_budgets: digestData.stats?.budgets?.at_risk || 0,
                dashboard_url: `${appUrl}/dashboard`,
              };

              const template = EMAIL_TEMPLATES.weekly_digest;
              await sendEmail({
                to: user.email,
                from: EMAIL_FROM,
                subject: renderTemplate(template.subject, emailData),
                html: renderTemplate(template.html, emailData),
              });
            }

            results.push({
              enterprise_id: enterpriseId,
              users_processed: enterpriseUsers.length,
              success: true,
            });
          }
        } catch (err) {
          console.error(`Failed to process digest for enterprise ${enterpriseId}:`, err);
          results.push({
            enterprise_id: enterpriseId,
            users_processed: 0,
            success: false,
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const totalUsers = results.reduce((sum, r) => sum + r.users_processed, 0);

      return createSuccessResponse({
        enterprises_processed: results.length,
        enterprises_successful: successCount,
        total_users_notified: totalUsers,
        results,
      });
    }

    // Trigger contract expiry notification check (for cron/scheduler)
    if (method === 'POST' && pathname === '/notifications/check-contract-expiry') {
      const supabase = createSupabaseClient();

      // Call the database function that checks and queues contract expiry notifications
      const { data, error } = await supabase.rpc('check_and_queue_contract_expiry_notifications');

      if (error) {
        return createErrorResponse(`Failed to check contract expiry: ${error.message}`, 500);
      }

      return createSuccessResponse({
        success: true,
        notifications_queued: data || 0,
        checked_at: new Date().toISOString(),
      });
    }

    // Trigger budget alert notification check (for cron/scheduler)
    if (method === 'POST' && pathname === '/notifications/check-budget-alerts') {
      const supabase = createSupabaseClient();

      // Call the database function that checks and queues budget alert notifications
      const { data, error } = await supabase.rpc('check_and_queue_budget_alert_notifications');

      if (error) {
        return createErrorResponse(`Failed to check budget alerts: ${error.message}`, 500);
      }

      return createSuccessResponse({
        success: true,
        notifications_queued: data || 0,
        checked_at: new Date().toISOString(),
      });
    }

    // Process email queue (for cron/scheduler)
    if (method === 'POST' && pathname === '/notifications/process-email-queue') {
      const supabase = createSupabaseClient();
      const body = await req.json().catch(() => ({}));
      const batchSize = body.batch_size || 20;

      // Get emails marked for processing
      const { data: pendingEmails, error: fetchError } = await supabase
        .from('email_queue')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_at', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('scheduled_at', { ascending: true })
        .limit(batchSize);

      if (fetchError) {
        return createErrorResponse(`Failed to fetch email queue: ${fetchError.message}`, 500);
      }

      if (!pendingEmails || pendingEmails.length === 0) {
        return createSuccessResponse({ processed: 0, sent: 0, failed: 0 });
      }

      // Mark emails as processing
      const emailIds = pendingEmails.map((e) => e.id);
      await supabase
        .from('email_queue')
        .update({ status: 'processing' })
        .in('id', emailIds);

      // Process each email
      let sent = 0;
      let failed = 0;

      for (const email of pendingEmails) {
        try {
          // Get template if specified
          const template = email.template_name && email.template_name in EMAIL_TEMPLATES
            ? EMAIL_TEMPLATES[email.template_name as keyof typeof EMAIL_TEMPLATES]
            : null;

          const subject = template
            ? renderTemplate(template.subject, email.template_data || {})
            : email.subject;
          const html = template
            ? renderTemplate(template.html, email.template_data || {})
            : email.html_body || '';

          await sendEmail({
            to: email.to_email,
            from: email.from_email || EMAIL_FROM,
            subject,
            html,
          });

          // Mark as sent
          await supabase
            .from('email_queue')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
            })
            .eq('id', email.id);

          sent++;
        } catch (err) {
          const errorMessage = (err as Error).message;
          const newAttempts = (email.attempts || 0) + 1;

          // Mark as failed or retry
          await supabase
            .from('email_queue')
            .update({
              status: newAttempts >= (email.max_attempts || 3) ? 'failed' : 'pending',
              attempts: newAttempts,
              error_message: errorMessage,
              failed_at: newAttempts >= (email.max_attempts || 3) ? new Date().toISOString() : null,
            })
            .eq('id', email.id);

          failed++;
        }
      }

      return createSuccessResponse({
        processed: pendingEmails.length,
        sent,
        failed,
        processed_at: new Date().toISOString(),
      });
    }

    // Manual trigger for all notification checks (admin/testing)
    if (method === 'POST' && pathname === '/notifications/run-all-checks') {
      const supabase = createSupabaseClient();

      const { data: results, error } = await supabase.rpc('run_all_notification_checks');

      if (error) {
        return createErrorResponse(`Failed to run notification checks: ${error.message}`, 500);
      }

      return createSuccessResponse({
        success: true,
        results,
        checked_at: new Date().toISOString(),
      });
    }

    return createErrorResponse('Not found', 404);
  },
  {
    requireAuth: false,
    rateLimit: true,
  },
);

// Helper function to render templates
function renderTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = data[key];
    return (typeof value === 'string' || typeof value === 'number') ? String(value) : match;
  });
}

// Email sending function (using Resend as example)
async function sendEmail({ to, from, subject, html }: {
  to: string;
  from: string;
  subject: string;
  html: string;
}) {
  if (!RESEND_API_KEY) {
    console.warn('Email service not configured, skipping send');
    return { id: `mock-${Date.now()}` };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Email send failed: ${error}`);
  }

  return response.json();
}