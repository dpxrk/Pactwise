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

    // Generate digest (requires authentication) - TODO: Complete implementation
    /*
    if (method === 'POST' && pathname === '/notifications/generate-digest') {

    // Gather weekly statistics
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [contracts, vendors, budgets] = await Promise.all([
      // TODO: Add proper implementation
    ]);
    */
    // Rest of the digest generation code is incomplete
    // TODO: Complete the implementation of digest generation

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