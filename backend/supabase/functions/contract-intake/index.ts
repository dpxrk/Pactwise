/// <reference path="../../types/global.d.ts" />

import { withMiddleware } from '../_shared/middleware.ts';
import { getUserPermissions } from '../_shared/auth.ts';
import { paginationSchema, validateRequest, sanitizeInput } from '../_shared/validation.ts';
import { createSuccessResponse, createErrorResponseSync } from '../_shared/responses.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { withCompensatingTransaction } from '../_shared/transaction.ts';
import { z } from 'zod';

// ============================================================================
// TYPES
// ============================================================================

type IntakeFormStatus = 'draft' | 'active' | 'archived';
type SubmissionStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'converted';

interface IntakeForm {
  id: string;
  enterprise_id: string;
  name: string;
  description: string | null;
  form_type: string;
  fields: FormField[];
  settings: Record<string, unknown>;
  status: IntakeFormStatus;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface FormField {
  id: string;
  form_id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  field_config: Record<string, unknown>;
  validation_rules: Record<string, unknown>;
  is_required: boolean;
  display_order: number;
  conditional_logic: Record<string, unknown> | null;
}

interface IntakeSubmission {
  id: string;
  enterprise_id: string;
  form_id: string;
  submission_number: string;
  form_data: Record<string, unknown>;
  status: SubmissionStatus;
  requester_id: string;
  requester_name: string;
  requester_email: string;
  requester_department: string | null;
  priority: string;
  target_date: string | null;
  contract_id: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const fieldTypeSchema = z.enum([
  'text', 'textarea', 'number', 'currency', 'date', 'datetime',
  'select', 'multiselect', 'radio', 'checkbox', 'file', 'email',
  'phone', 'url', 'user_select', 'vendor_select', 'department_select',
  'contract_type_select', 'rich_text', 'signature', 'hidden',
]);

const createFormSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  form_type: z.enum([
    'new_contract', 'contract_renewal', 'contract_amendment',
    'vendor_onboarding', 'nda_request', 'procurement_request', 'general',
  ]),
  settings: z.object({
    require_approval: z.boolean().optional(),
    auto_assign_owner: z.boolean().optional(),
    default_contract_type: z.string().optional(),
    notification_emails: z.array(z.string().email()).optional(),
  }).optional(),
});

const updateFormSchema = createFormSchema.partial();

const createFieldSchema = z.object({
  field_name: z.string().min(1).max(100).regex(/^[a-z][a-z0-9_]*$/),
  field_label: z.string().min(1).max(200),
  field_type: fieldTypeSchema,
  field_config: z.object({
    placeholder: z.string().optional(),
    help_text: z.string().optional(),
    options: z.array(z.object({
      value: z.string(),
      label: z.string(),
    })).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().optional(),
    accept: z.string().optional(),
    currency: z.string().optional(),
    default_value: z.unknown().optional(),
  }).optional(),
  validation_rules: z.object({
    min_length: z.number().optional(),
    max_length: z.number().optional(),
    pattern: z.string().optional(),
    custom_message: z.string().optional(),
  }).optional(),
  is_required: z.boolean().optional(),
  display_order: z.number().optional(),
  conditional_logic: z.object({
    show_when: z.object({
      field: z.string(),
      operator: z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than']),
      value: z.unknown(),
    }).optional(),
  }).nullable().optional(),
});

const updateFieldSchema = createFieldSchema.partial();

const submitIntakeSchema = z.object({
  form_id: z.string().uuid(),
  form_data: z.record(z.unknown()),
  requester_name: z.string().min(1).max(200),
  requester_email: z.string().email(),
  requester_department: z.string().max(100).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  target_date: z.string().datetime().optional(),
  attachments: z.array(z.object({
    file_name: z.string(),
    file_path: z.string(),
    file_size: z.number(),
    mime_type: z.string(),
  })).optional(),
});

const reviewSubmissionSchema = z.object({
  decision: z.enum(['approve', 'reject', 'request_changes']),
  comments: z.string().max(2000).optional(),
  assigned_to: z.string().uuid().optional(),
});

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

    // Get user's permissions
    const permissions = await getUserPermissions(supabase, profile, 'contracts');

    // ========================================================================
    // INTAKE FORMS ENDPOINTS
    // ========================================================================

    // GET /contract-intake/forms - List all intake forms
    if (method === 'GET' && pathname === '/contract-intake/forms') {
      const params = Object.fromEntries(url.searchParams);
      const { page = 1, limit = 20 } = validateRequest(paginationSchema, params);
      const offset = (page - 1) * limit;

      const status = params.status as IntakeFormStatus | undefined;
      const formType = params.form_type;

      let query = supabase
        .from('contract_intake_forms')
        .select('*', { count: 'exact' })
        .eq('enterprise_id', profile.enterprise_id)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      } else {
        query = query.neq('status', 'archived');
      }

      if (formType) {
        query = query.eq('form_type', formType);
      }

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        data,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil((count || 0) / limit),
        },
      }, undefined, 200, req);
    }

    // GET /contract-intake/forms/:id - Get single form with fields
    const getFormMatch = pathname.match(/^\/contract-intake\/forms\/([a-f0-9-]+)$/);
    if (method === 'GET' && getFormMatch) {
      const formId = sanitizeInput.uuid(getFormMatch[1]);

      const { data: form, error: formError } = await supabase
        .from('contract_intake_forms')
        .select('*')
        .eq('id', formId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (formError || !form) {
        return createErrorResponseSync('Form not found', 404, req);
      }

      // Get fields
      const { data: fields } = await supabase
        .from('intake_form_fields')
        .select('*')
        .eq('form_id', formId)
        .order('display_order', { ascending: true });

      return createSuccessResponse({
        ...form,
        fields: fields || [],
      }, undefined, 200, req);
    }

    // POST /contract-intake/forms - Create new form
    if (method === 'POST' && pathname === '/contract-intake/forms') {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions to create intake forms', 403, req);
      }

      const body = await req.json();
      const validated = validateRequest(createFormSchema, body);

      const { data: form, error } = await supabase
        .from('contract_intake_forms')
        .insert({
          enterprise_id: profile.enterprise_id,
          name: validated.name,
          description: validated.description || null,
          form_type: validated.form_type,
          settings: validated.settings || {},
          status: 'draft',
          created_by: profile.id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return createSuccessResponse(form, undefined, 201, req);
    }

    // PUT /contract-intake/forms/:id - Update form
    const updateFormMatch = pathname.match(/^\/contract-intake\/forms\/([a-f0-9-]+)$/);
    if (method === 'PUT' && updateFormMatch) {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions to update intake forms', 403, req);
      }

      const formId = sanitizeInput.uuid(updateFormMatch[1]);
      const body = await req.json();
      const validated = validateRequest(updateFormSchema, body);

      const { data: form, error } = await supabase
        .from('contract_intake_forms')
        .update({
          ...validated,
          updated_at: new Date().toISOString(),
        })
        .eq('id', formId)
        .eq('enterprise_id', profile.enterprise_id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return createSuccessResponse(form, undefined, 200, req);
    }

    // POST /contract-intake/forms/:id/publish - Publish form
    const publishFormMatch = pathname.match(/^\/contract-intake\/forms\/([a-f0-9-]+)\/publish$/);
    if (method === 'POST' && publishFormMatch) {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const formId = sanitizeInput.uuid(publishFormMatch[1]);

      // Check form has at least one field
      const { count: fieldCount } = await supabase
        .from('intake_form_fields')
        .select('id', { count: 'exact', head: true })
        .eq('form_id', formId);

      if (!fieldCount || fieldCount === 0) {
        return createErrorResponseSync('Form must have at least one field before publishing', 400, req);
      }

      const { data: form, error } = await supabase
        .from('contract_intake_forms')
        .update({
          status: 'active',
          version: supabase.rpc('increment', { x: 1 }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', formId)
        .eq('enterprise_id', profile.enterprise_id)
        .select()
        .single();

      if (error) {
        // Fallback if increment RPC doesn't exist
        const { data: form2, error: error2 } = await supabase
          .from('contract_intake_forms')
          .update({
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', formId)
          .eq('enterprise_id', profile.enterprise_id)
          .select()
          .single();

        if (error2) throw error2;
        return createSuccessResponse(form2, undefined, 200, req);
      }

      return createSuccessResponse(form, undefined, 200, req);
    }

    // POST /contract-intake/forms/:id/archive - Archive form
    const archiveFormMatch = pathname.match(/^\/contract-intake\/forms\/([a-f0-9-]+)\/archive$/);
    if (method === 'POST' && archiveFormMatch) {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const formId = sanitizeInput.uuid(archiveFormMatch[1]);

      const { data: form, error } = await supabase
        .from('contract_intake_forms')
        .update({
          status: 'archived',
          updated_at: new Date().toISOString(),
        })
        .eq('id', formId)
        .eq('enterprise_id', profile.enterprise_id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return createSuccessResponse(form, undefined, 200, req);
    }

    // ========================================================================
    // FORM FIELDS ENDPOINTS
    // ========================================================================

    // POST /contract-intake/forms/:id/fields - Add field to form
    const addFieldMatch = pathname.match(/^\/contract-intake\/forms\/([a-f0-9-]+)\/fields$/);
    if (method === 'POST' && addFieldMatch) {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const formId = sanitizeInput.uuid(addFieldMatch[1]);
      const body = await req.json();
      const validated = validateRequest(createFieldSchema, body);

      // Verify form exists
      const { data: form } = await supabase
        .from('contract_intake_forms')
        .select('id')
        .eq('id', formId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!form) {
        return createErrorResponseSync('Form not found', 404, req);
      }

      // Get max display order
      const { data: maxOrder } = await supabase
        .from('intake_form_fields')
        .select('display_order')
        .eq('form_id', formId)
        .order('display_order', { ascending: false })
        .limit(1)
        .single();

      const { data: field, error } = await supabase
        .from('intake_form_fields')
        .insert({
          form_id: formId,
          field_name: validated.field_name,
          field_label: validated.field_label,
          field_type: validated.field_type,
          field_config: validated.field_config || {},
          validation_rules: validated.validation_rules || {},
          is_required: validated.is_required ?? false,
          display_order: validated.display_order ?? ((maxOrder?.display_order || 0) + 1),
          conditional_logic: validated.conditional_logic || null,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return createSuccessResponse(field, undefined, 201, req);
    }

    // PUT /contract-intake/fields/:id - Update field
    const updateFieldMatch = pathname.match(/^\/contract-intake\/fields\/([a-f0-9-]+)$/);
    if (method === 'PUT' && updateFieldMatch) {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const fieldId = sanitizeInput.uuid(updateFieldMatch[1]);
      const body = await req.json();
      const validated = validateRequest(updateFieldSchema, body);

      // Verify field belongs to enterprise form
      const { data: existingField } = await supabase
        .from('intake_form_fields')
        .select('id, form_id, form:contract_intake_forms!inner(enterprise_id)')
        .eq('id', fieldId)
        .single();

      if (!existingField || (existingField.form as { enterprise_id: string }).enterprise_id !== profile.enterprise_id) {
        return createErrorResponseSync('Field not found', 404, req);
      }

      const { data: field, error } = await supabase
        .from('intake_form_fields')
        .update({
          ...validated,
          updated_at: new Date().toISOString(),
        })
        .eq('id', fieldId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return createSuccessResponse(field, undefined, 200, req);
    }

    // DELETE /contract-intake/fields/:id - Delete field
    const deleteFieldMatch = pathname.match(/^\/contract-intake\/fields\/([a-f0-9-]+)$/);
    if (method === 'DELETE' && deleteFieldMatch) {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const fieldId = sanitizeInput.uuid(deleteFieldMatch[1]);

      // Verify field belongs to enterprise form
      const { data: existingField } = await supabase
        .from('intake_form_fields')
        .select('id, form:contract_intake_forms!inner(enterprise_id)')
        .eq('id', fieldId)
        .single();

      if (!existingField || (existingField.form as { enterprise_id: string }).enterprise_id !== profile.enterprise_id) {
        return createErrorResponseSync('Field not found', 404, req);
      }

      const { error } = await supabase
        .from('intake_form_fields')
        .delete()
        .eq('id', fieldId);

      if (error) {
        throw error;
      }

      return createSuccessResponse({ message: 'Field deleted' }, undefined, 200, req);
    }

    // POST /contract-intake/forms/:id/fields/reorder - Reorder fields
    const reorderFieldsMatch = pathname.match(/^\/contract-intake\/forms\/([a-f0-9-]+)\/fields\/reorder$/);
    if (method === 'POST' && reorderFieldsMatch) {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const formId = sanitizeInput.uuid(reorderFieldsMatch[1]);
      const body = await req.json();

      const reorderSchema = z.object({
        field_order: z.array(z.object({
          field_id: z.string().uuid(),
          display_order: z.number(),
        })),
      });

      const { field_order } = validateRequest(reorderSchema, body);

      // Update each field's order
      for (const item of field_order) {
        await supabase
          .from('intake_form_fields')
          .update({ display_order: item.display_order })
          .eq('id', item.field_id)
          .eq('form_id', formId);
      }

      return createSuccessResponse({ message: 'Fields reordered' }, undefined, 200, req);
    }

    // ========================================================================
    // SUBMISSIONS ENDPOINTS
    // ========================================================================

    // GET /contract-intake/submissions - List submissions
    if (method === 'GET' && pathname === '/contract-intake/submissions') {
      const params = Object.fromEntries(url.searchParams);
      const { page = 1, limit = 20 } = validateRequest(paginationSchema, params);
      const offset = (page - 1) * limit;

      const status = params.status as SubmissionStatus | undefined;
      const formId = params.form_id;

      let query = supabase
        .from('intake_submissions')
        .select(`
          *,
          form:contract_intake_forms(id, name, form_type),
          reviewer:users!reviewer_id(id, full_name, email)
        `, { count: 'exact' })
        .eq('enterprise_id', profile.enterprise_id)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      if (formId) {
        query = query.eq('form_id', formId);
      }

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        data,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil((count || 0) / limit),
        },
      }, undefined, 200, req);
    }

    // GET /contract-intake/submissions/pending - Get pending submissions for review
    if (method === 'GET' && pathname === '/contract-intake/submissions/pending') {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const { data, error } = await supabase
        .from('intake_submissions')
        .select(`
          *,
          form:contract_intake_forms(id, name, form_type)
        `)
        .eq('enterprise_id', profile.enterprise_id)
        .in('status', ['submitted', 'under_review'])
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      return createSuccessResponse({ data }, undefined, 200, req);
    }

    // GET /contract-intake/submissions/:id - Get single submission
    const getSubmissionMatch = pathname.match(/^\/contract-intake\/submissions\/([a-f0-9-]+)$/);
    if (method === 'GET' && getSubmissionMatch) {
      const submissionId = sanitizeInput.uuid(getSubmissionMatch[1]);

      const { data: submission, error } = await supabase
        .from('intake_submissions')
        .select(`
          *,
          form:contract_intake_forms(*, fields:intake_form_fields(*)),
          reviewer:users!reviewer_id(id, full_name, email),
          requester:users!requester_id(id, full_name, email),
          attachments:intake_attachments(*),
          comments:intake_comments(*, user:users(id, full_name))
        `)
        .eq('id', submissionId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (error || !submission) {
        return createErrorResponseSync('Submission not found', 404, req);
      }

      return createSuccessResponse(submission, undefined, 200, req);
    }

    // POST /contract-intake/submit - Submit intake request
    if (method === 'POST' && pathname === '/contract-intake/submit') {
      const body = await req.json();
      const validated = validateRequest(submitIntakeSchema, body);

      // Verify form exists and is active
      const { data: form, error: formError } = await supabase
        .from('contract_intake_forms')
        .select('*, fields:intake_form_fields(*)')
        .eq('id', validated.form_id)
        .eq('enterprise_id', profile.enterprise_id)
        .eq('status', 'active')
        .single();

      if (formError || !form) {
        return createErrorResponseSync('Form not found or not active', 404, req);
      }

      // Validate required fields
      const fields = form.fields as FormField[];
      const requiredFields = fields.filter(f => f.is_required);

      for (const field of requiredFields) {
        const value = validated.form_data[field.field_name];
        if (value === undefined || value === null || value === '') {
          return createErrorResponseSync(`Field "${field.field_label}" is required`, 400, req);
        }
      }

      // Generate submission number
      const { data: numberResult } = await supabase.rpc('get_next_submission_number', {
        p_enterprise_id: profile.enterprise_id,
      });

      const submissionNumber = numberResult || `REQ-${Date.now()}`;

      // Declare submission outside transaction so it's accessible after
      let submission: Record<string, unknown> | null = null;

      // Wrap submission creation, attachments, and notifications in compensating transaction
      await withCompensatingTransaction([
        {
          name: 'create_submission',
          execute: async () => {
            const { data, error: submitError } = await supabase
              .from('intake_submissions')
              .insert({
                enterprise_id: profile.enterprise_id,
                form_id: validated.form_id,
                submission_number: submissionNumber,
                form_data: validated.form_data,
                status: 'submitted',
                requester_id: profile.id,
                requester_name: validated.requester_name,
                requester_email: validated.requester_email,
                requester_department: validated.requester_department || null,
                priority: validated.priority || 'normal',
                target_date: validated.target_date || null,
              })
              .select()
              .single();

            if (submitError) throw submitError;
            submission = data;
          },
          rollback: async () => {
            if (submission) {
              await supabase
                .from('intake_submissions')
                .delete()
                .eq('id', submission.id);
            }
          },
        },
        {
          name: 'add_attachments',
          execute: async () => {
            if (validated.attachments && validated.attachments.length > 0 && submission) {
              const attachments = validated.attachments.map(a => ({
                submission_id: submission!.id,
                file_name: a.file_name,
                file_path: a.file_path,
                file_size: a.file_size,
                mime_type: a.mime_type,
                uploaded_by: profile.id,
              }));

              const { error } = await supabase.from('intake_attachments').insert(attachments);
              if (error) throw error;
            }
          },
          rollback: async () => {
            if (submission) {
              await supabase
                .from('intake_attachments')
                .delete()
                .eq('submission_id', submission.id);
            }
          },
        },
        {
          name: 'notify_reviewers',
          execute: async () => {
            if (!submission) return;

            const { data: reviewers } = await supabase
              .from('users')
              .select('id')
              .eq('enterprise_id', profile.enterprise_id)
              .in('role', ['manager', 'admin', 'owner'])
              .limit(5);

            if (reviewers && reviewers.length > 0) {
              const notifications = reviewers.map(r => ({
                user_id: r.id,
                type: 'intake_submission',
                title: 'New Contract Intake Request',
                message: `New ${form.form_type.replace('_', ' ')} request submitted: ${submissionNumber}`,
                severity: validated.priority === 'urgent' ? 'critical' : 'medium',
                data: {
                  submission_id: submission!.id,
                  form_type: form.form_type,
                  requester: validated.requester_name,
                },
                enterprise_id: profile.enterprise_id,
              }));

              const { error } = await supabase.from('notifications').insert(notifications);
              if (error) throw error;
            }
          },
          rollback: async () => {
            if (submission) {
              await supabase
                .from('notifications')
                .delete()
                .eq('type', 'intake_submission')
                .eq('enterprise_id', profile.enterprise_id)
                .filter('data->>submission_id', 'eq', submission.id as string);
            }
          },
        },
      ]);

      return createSuccessResponse({
        message: 'Request submitted successfully',
        submission_id: submission!.id,
        submission_number: submissionNumber,
        status: 'submitted',
      }, undefined, 201, req);
    }

    // POST /contract-intake/submissions/:id/review - Review submission
    const reviewMatch = pathname.match(/^\/contract-intake\/submissions\/([a-f0-9-]+)\/review$/);
    if (method === 'POST' && reviewMatch) {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions to review submissions', 403, req);
      }

      const submissionId = sanitizeInput.uuid(reviewMatch[1]);
      const body = await req.json();
      const { decision, comments, assigned_to } = validateRequest(reviewSubmissionSchema, body);

      // Get submission
      const { data: submission, error: findError } = await supabase
        .from('intake_submissions')
        .select('*')
        .eq('id', submissionId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (findError || !submission) {
        return createErrorResponseSync('Submission not found', 404, req);
      }

      if (!['submitted', 'under_review'].includes(submission.status)) {
        return createErrorResponseSync(`Cannot review submission with status: ${submission.status}`, 400, req);
      }

      // Determine new status
      const newStatus = decision === 'approve' ? 'approved'
        : decision === 'reject' ? 'rejected'
        : 'under_review';

      // Update submission
      const { data: updated, error: updateError } = await supabase
        .from('intake_submissions')
        .update({
          status: newStatus,
          reviewer_id: profile.id,
          reviewed_at: new Date().toISOString(),
          review_comments: comments || null,
          assigned_owner_id: assigned_to || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', submissionId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Add review comment
      if (comments) {
        await supabase.from('intake_comments').insert({
          submission_id: submissionId,
          user_id: profile.id,
          comment_text: comments,
          comment_type: 'review',
        });
      }

      // Notify requester
      await supabase.from('notifications').insert({
        user_id: submission.requester_id,
        type: 'intake_review',
        title: `Request ${decision === 'approve' ? 'Approved' : decision === 'reject' ? 'Rejected' : 'Updated'}`,
        message: `Your request ${submission.submission_number} has been ${decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'updated'}`,
        severity: decision === 'reject' ? 'high' : 'medium',
        data: {
          submission_id: submissionId,
          decision,
        },
        enterprise_id: profile.enterprise_id,
      });

      return createSuccessResponse({
        message: `Submission ${decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'updated'}`,
        submission_id: submissionId,
        status: newStatus,
        reviewed_at: new Date().toISOString(),
      }, undefined, 200, req);
    }

    // POST /contract-intake/submissions/:id/convert - Convert to contract
    const convertMatch = pathname.match(/^\/contract-intake\/submissions\/([a-f0-9-]+)\/convert$/);
    if (method === 'POST' && convertMatch) {
      if (!permissions.canCreate) {
        return createErrorResponseSync('Insufficient permissions to create contracts', 403, req);
      }

      const submissionId = sanitizeInput.uuid(convertMatch[1]);
      const body = await req.json();

      const convertSchema = z.object({
        title: z.string().min(1).max(500),
        contract_type: z.string().optional(),
        vendor_id: z.string().uuid().optional(),
        owner_id: z.string().uuid().optional(),
        additional_data: z.record(z.unknown()).optional(),
      });

      const validated = validateRequest(convertSchema, body);

      // Get submission
      const { data: submission, error: findError } = await supabase
        .from('intake_submissions')
        .select('*, form:contract_intake_forms(*)')
        .eq('id', submissionId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (findError || !submission) {
        return createErrorResponseSync('Submission not found', 404, req);
      }

      if (submission.status !== 'approved') {
        return createErrorResponseSync('Only approved submissions can be converted to contracts', 400, req);
      }

      if (submission.contract_id) {
        return createErrorResponseSync('Submission has already been converted', 400, req);
      }

      // Create contract from submission
      const contractData = {
        enterprise_id: profile.enterprise_id,
        title: validated.title,
        status: 'draft',
        contract_type: validated.contract_type || (submission.form as IntakeForm).settings?.default_contract_type || 'other',
        vendor_id: validated.vendor_id || null,
        owner_id: validated.owner_id || submission.assigned_owner_id || profile.id,
        created_by: profile.id,
        source_submission_id: submissionId,
        metadata: {
          intake_form_data: submission.form_data,
          intake_submission_number: submission.submission_number,
          ...validated.additional_data,
        },
      };

      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .insert(contractData)
        .select()
        .single();

      if (contractError) {
        throw contractError;
      }

      // Update submission status
      await supabase
        .from('intake_submissions')
        .update({
          status: 'converted',
          contract_id: contract.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', submissionId);

      return createSuccessResponse({
        message: 'Submission converted to contract',
        contract_id: contract.id,
        submission_id: submissionId,
      }, undefined, 201, req);
    }

    // POST /contract-intake/submissions/:id/comments - Add comment
    const addCommentMatch = pathname.match(/^\/contract-intake\/submissions\/([a-f0-9-]+)\/comments$/);
    if (method === 'POST' && addCommentMatch) {
      const submissionId = sanitizeInput.uuid(addCommentMatch[1]);
      const body = await req.json();

      const commentSchema = z.object({
        comment_text: z.string().min(1).max(2000),
        comment_type: z.enum(['general', 'question', 'clarification', 'review']).optional(),
      });

      const { comment_text, comment_type } = validateRequest(commentSchema, body);

      // Verify submission exists
      const { data: submission } = await supabase
        .from('intake_submissions')
        .select('id')
        .eq('id', submissionId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!submission) {
        return createErrorResponseSync('Submission not found', 404, req);
      }

      const { data: comment, error } = await supabase
        .from('intake_comments')
        .insert({
          submission_id: submissionId,
          user_id: profile.id,
          comment_text,
          comment_type: comment_type || 'general',
        })
        .select('*, user:users(id, full_name)')
        .single();

      if (error) {
        throw error;
      }

      return createSuccessResponse(comment, undefined, 201, req);
    }

    // ========================================================================
    // STATS ENDPOINT
    // ========================================================================

    // GET /contract-intake/stats - Get intake statistics
    if (method === 'GET' && pathname === '/contract-intake/stats') {
      const { data: submissions, error } = await supabase
        .from('intake_submissions')
        .select('status, priority, form_id, created_at')
        .eq('enterprise_id', profile.enterprise_id);

      if (error) {
        throw error;
      }

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const stats = {
        total: submissions?.length || 0,
        by_status: {
          draft: submissions?.filter(s => s.status === 'draft').length || 0,
          submitted: submissions?.filter(s => s.status === 'submitted').length || 0,
          under_review: submissions?.filter(s => s.status === 'under_review').length || 0,
          approved: submissions?.filter(s => s.status === 'approved').length || 0,
          rejected: submissions?.filter(s => s.status === 'rejected').length || 0,
          converted: submissions?.filter(s => s.status === 'converted').length || 0,
        },
        by_priority: {
          low: submissions?.filter(s => s.priority === 'low').length || 0,
          normal: submissions?.filter(s => s.priority === 'normal').length || 0,
          high: submissions?.filter(s => s.priority === 'high').length || 0,
          urgent: submissions?.filter(s => s.priority === 'urgent').length || 0,
        },
        pending_review: submissions?.filter(s => ['submitted', 'under_review'].includes(s.status)).length || 0,
        last_30_days: submissions?.filter(s => new Date(s.created_at) >= thirtyDaysAgo).length || 0,
      };

      // Get form stats
      const { data: forms } = await supabase
        .from('contract_intake_forms')
        .select('id, name, status')
        .eq('enterprise_id', profile.enterprise_id);

      const formStats = {
        total_forms: forms?.length || 0,
        active_forms: forms?.filter(f => f.status === 'active').length || 0,
      };

      return createSuccessResponse({
        submissions: stats,
        forms: formStats,
      }, undefined, 200, req);
    }

    // Method not allowed
    return createErrorResponseSync('Not found', 404, req);
  },
  {
    requireAuth: true,
    rateLimit: true,
    zeroTrust: { resource: 'contract-intake', action: 'access' },
    detectThreats: true,
    compliance: { framework: 'SOC2' },
  },
  'contract-intake',
);
