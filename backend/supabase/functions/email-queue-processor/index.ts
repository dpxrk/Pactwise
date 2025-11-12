import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'noreply@pactwise.com';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Email templates (imported from notifications function)
const EMAIL_TEMPLATES: Record<string, { subject: string; html: string }> = {
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
          <a href="{{action_url}}" style="background: #291528; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View Contract</a>
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
          <a href="{{action_url}}" style="background: #291528; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View Budget Details</a>
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
          <p>{{item_details}}</p>
        </div>
        <div style="margin: 30px 0;">
          <a href="{{approve_url}}" style="background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-right: 10px;">Approve</a>
          <a href="{{reject_url}}" style="background: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Reject</a>
        </div>
      </div>
    `,
  },
};

// Helper function to render templates
function renderTemplate(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = data[key];
    return (typeof value === 'string' || typeof value === 'number') ? String(value) : match;
  });
}

// Email sending function using Resend
async function sendEmail({ to, from, subject, html }: {
  to: string;
  from: string;
  subject: string;
  html: string;
}) {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured, skipping email send');
    return { id: `mock-${Date.now()}`, error: 'No API key' };
  }

  try {
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

    return await response.json();
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  // Create Supabase client with service role for admin access
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    console.log('Processing email queue...');

    // Get pending emails (up to 20 at a time)
    const { data: pendingEmails, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .lt('attempts', 3) // Max 3 attempts
      .order('priority', { ascending: false })
      .order('scheduled_at', { ascending: true })
      .limit(20);

    if (fetchError) {
      console.error('Error fetching emails:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch emails', details: fetchError }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      console.log('No pending emails to process');
      return new Response(
        JSON.stringify({ processed: 0, sent: 0, failed: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${pendingEmails.length} emails to process`);

    let sent = 0;
    let failed = 0;

    // Process each email
    for (const email of pendingEmails) {
      try {
        // Mark as processing
        await supabase
          .from('email_queue')
          .update({ status: 'processing', attempts: email.attempts + 1 })
          .eq('id', email.id);

        // Build email content
        let subject = email.subject;
        let html = email.html_body;

        // If using template, render it
        if (email.template_name && email.template_name in EMAIL_TEMPLATES) {
          const template = EMAIL_TEMPLATES[email.template_name];
          subject = renderTemplate(template.subject, email.template_data || {});
          html = renderTemplate(template.html, email.template_data || {});
        }

        // Send email
        const result = await sendEmail({
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
            metadata: { ...email.metadata, message_id: result.id },
          })
          .eq('id', email.id);

        sent++;
        console.log(`✓ Sent email to ${email.to_email} (ID: ${email.id})`);
      } catch (error) {
        // Mark as failed
        await supabase
          .from('email_queue')
          .update({
            status: email.attempts + 1 >= email.max_attempts ? 'failed' : 'pending',
            failed_at: email.attempts + 1 >= email.max_attempts ? new Date().toISOString() : null,
            error_message: error instanceof Error ? error.message : String(error),
          })
          .eq('id', email.id);

        failed++;
        console.error(`✗ Failed to send email to ${email.to_email}:`, error);
      }
    }

    console.log(`Email processing complete: ${sent} sent, ${failed} failed`);

    return new Response(
      JSON.stringify({ processed: pendingEmails.length, sent, failed }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
