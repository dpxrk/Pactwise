'use client';

import { useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Send,
  FileText,
  AlertCircle,
  Loader2,
  Calendar,
  Upload,
  Clock,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

import { useAuth } from '@/contexts/AuthContext';
import { useIntakeForm, useIntakeFormList } from '@/hooks/queries/useIntakeForms';
import { useSubmitIntake } from '@/hooks/queries/useIntakeSubmissions';
import {
  IntakeForm,
  IntakeFormField,
  FieldType,
  SubmissionPriority,
  priorityLabels,
  formTypeLabels,
} from '@/types/intake.types';

// Priority options
const priorityOptions: { value: SubmissionPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

function IntakeSubmissionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formIdParam = searchParams.get('form');
  const { userProfile, isLoading: isAuthLoading } = useAuth();

  // State
  const [selectedFormId, setSelectedFormId] = useState<string | null>(formIdParam);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [priority, setPriority] = useState<SubmissionPriority>('normal');
  const [targetDate, setTargetDate] = useState<string>('');
  const [department, setDepartment] = useState<string>('');

  // Queries
  const {
    data: activeForms,
    isLoading: isFormsLoading,
  } = useIntakeFormList(userProfile?.enterprise_id || '', { status: 'active' });

  const {
    data: selectedForm,
    isLoading: isFormLoading,
    error: formError,
  } = useIntakeForm(selectedFormId ?? '');

  // Mutations
  const submitIntake = useSubmitIntake();

  const isLoading = isAuthLoading || isFormsLoading || (selectedFormId && isFormLoading);

  // Sorted fields
  const sortedFields = useMemo(() => {
    if (!selectedForm?.fields) return [];
    return [...selectedForm.fields].sort((a, b) => a.display_order - b.display_order);
  }, [selectedForm?.fields]);

  // Form validation
  const isFormValid = useMemo(() => {
    if (!selectedForm || !sortedFields.length) return false;

    // Check all required fields are filled
    for (const field of sortedFields) {
      if (field.is_required) {
        const value = formData[field.field_name];
        if (value === undefined || value === null || value === '') {
          return false;
        }
      }
    }
    return true;
  }, [selectedForm, sortedFields, formData]);

  // Handlers
  const handleFieldChange = (fieldName: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFormId || !userProfile || !userProfile.enterprise_id || !isFormValid) return;

    try {
      const submission = await submitIntake.mutateAsync({
        enterpriseId: userProfile.enterprise_id as string,
        userId: userProfile.id,
        data: {
          form_id: selectedFormId,
          form_data: formData,
          requester_name: `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || userProfile.email,
          requester_email: userProfile.email,
          requester_department: department || undefined,
          priority,
          target_date: targetDate || undefined,
        },
      });

      // Navigate to the submission view
      if (submission?.id) {
        router.push(`/dashboard/contracts/intake/submissions/${submission.id}`);
      } else {
        router.push('/dashboard/contracts/intake');
      }
    } catch (error) {
      console.error('Failed to submit intake:', error);
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-ghost-100">
        <div className="border-b border-ghost-300 bg-white px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-ghost-400 animate-pulse" />
            <span className="font-mono text-xs text-ghost-700">LOADING...</span>
          </div>
        </div>
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner size="lg" showText text="Loading intake form..." />
        </div>
      </div>
    );
  }

  // Handle error state
  if (formError) {
    return (
      <div className="min-h-screen bg-ghost-100 p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Form</AlertTitle>
          <AlertDescription>
            {formError?.message || 'Form not found'}
          </AlertDescription>
        </Alert>
        <button
          onClick={() => router.push('/dashboard/contracts/intake')}
          className="mt-4 border border-ghost-300 bg-white px-4 py-2 font-mono text-xs text-ghost-700 hover:bg-ghost-50"
        >
          <ArrowLeft className="h-3 w-3 inline mr-2" />
          BACK TO INTAKE
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Top Status Bar */}
      <div className="border-b border-ghost-300 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button
              onClick={() => router.push('/dashboard/contracts/intake')}
              className="flex items-center gap-2 text-ghost-700 hover:text-purple-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="font-mono text-xs">BACK</span>
            </button>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-purple-500" />
              <span className="font-mono text-xs text-ghost-700">
                NEW CONTRACT REQUEST
              </span>
            </div>
          </div>
          {selectedForm && (
            <Badge
              variant="outline"
              className="font-mono text-[10px] uppercase border-purple-500 text-purple-700 bg-purple-50"
            >
              {formTypeLabels[selectedForm.form_type]}
            </Badge>
          )}
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Form Selection (if no form selected) */}
          {!selectedFormId ? (
            <div className="border border-ghost-300 bg-white">
              <div className="border-b border-ghost-300 px-4 py-3">
                <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                  SELECT A FORM
                </h3>
              </div>
              {activeForms && activeForms.length > 0 ? (
                <div className="divide-y divide-ghost-200">
                  {activeForms.map((form) => (
                    <button
                      key={form.id}
                      onClick={() => setSelectedFormId(form.id)}
                      className="w-full px-4 py-4 flex items-center justify-between hover:bg-purple-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-4">
                        <FileText className="h-5 w-5 text-purple-900" />
                        <div>
                          <p className="font-mono text-sm text-ghost-900">{form.name}</p>
                          <p className="font-mono text-[10px] text-ghost-500">
                            {formTypeLabels[form.form_type]}
                            {form.description && ` - ${form.description}`}
                          </p>
                        </div>
                      </div>
                      <ArrowLeft className="h-4 w-4 text-purple-900 rotate-180" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-12 text-center">
                  <FileText className="h-12 w-12 text-ghost-400 mx-auto mb-3" />
                  <p className="font-mono text-xs text-ghost-600 uppercase">
                    No active forms available
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Form Entry */
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-3 gap-6">
                {/* Left Panel - Request Info */}
                <div className="space-y-4">
                  <div className="border border-ghost-300 bg-white">
                    <div className="border-b border-ghost-300 px-4 py-3">
                      <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                        REQUEST INFO
                      </h3>
                    </div>
                    <div className="p-4 space-y-4">
                      {/* Requester Info */}
                      <div>
                        <label className="font-mono text-[10px] text-ghost-600 uppercase block mb-1">
                          Requester
                        </label>
                        <p className="font-mono text-sm text-ghost-900">
                          {`${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim() || userProfile?.email}
                        </p>
                        <p className="font-mono text-[10px] text-ghost-500">
                          {userProfile?.email}
                        </p>
                      </div>

                      {/* Department */}
                      <div>
                        <label className="font-mono text-[10px] text-ghost-600 uppercase block mb-1">
                          Department <span className="text-ghost-400">(Optional)</span>
                        </label>
                        <Input
                          variant="terminal"
                          inputSize="sm"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          placeholder="e.g., Legal, Sales, Finance"
                        />
                      </div>

                      {/* Priority */}
                      <div>
                        <label className="font-mono text-[10px] text-ghost-600 uppercase block mb-1">
                          Priority
                        </label>
                        <Select
                          value={priority}
                          onValueChange={(value) => setPriority(value as SubmissionPriority)}
                        >
                          <SelectTrigger className="h-8 font-mono text-xs bg-white border border-ghost-300">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {priorityOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                                className="font-mono text-xs"
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Target Date */}
                      <div>
                        <label className="font-mono text-[10px] text-ghost-600 uppercase block mb-1">
                          Target Date <span className="text-ghost-400">(Optional)</span>
                        </label>
                        <div className="relative">
                          <Input
                            variant="terminal"
                            inputSize="sm"
                            type="date"
                            value={targetDate}
                            onChange={(e) => setTargetDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                          />
                          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ghost-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Form Info */}
                  {selectedForm && (
                    <div className="border border-ghost-300 bg-white">
                      <div className="border-b border-ghost-300 px-4 py-3">
                        <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                          FORM
                        </h3>
                      </div>
                      <div className="p-4">
                        <p className="font-mono text-sm text-ghost-900">{selectedForm.name}</p>
                        {selectedForm.description && (
                          <p className="font-mono text-[10px] text-ghost-500 mt-1">
                            {selectedForm.description}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFormId(null);
                            setFormData({});
                          }}
                          className="font-mono text-[10px] text-purple-900 hover:underline mt-2"
                        >
                          CHANGE FORM
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={!isFormValid || submitIntake.isPending}
                    className="w-full border border-purple-900 bg-purple-900 text-white px-4 py-3 font-mono text-xs hover:bg-purple-800 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitIntake.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        SUBMITTING...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        SUBMIT REQUEST
                      </>
                    )}
                  </button>
                </div>

                {/* Right Panel - Form Fields */}
                <div className="col-span-2 border border-ghost-300 bg-white">
                  <div className="border-b border-ghost-300 px-4 py-3">
                    <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                      {selectedForm?.name || 'FORM FIELDS'}
                    </h3>
                  </div>

                  {sortedFields.length > 0 ? (
                    <div className="p-4 space-y-6">
                      {sortedFields.map((field) => (
                        <FormField
                          key={field.id}
                          field={field}
                          value={formData[field.field_name]}
                          onChange={(value) => handleFieldChange(field.field_name, value)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="px-6 py-12 text-center">
                      <AlertCircle className="h-12 w-12 text-amber-400 mx-auto mb-3" />
                      <p className="font-mono text-xs text-ghost-600 uppercase">
                        No fields configured for this form
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// Wrapper with Suspense for useSearchParams
export default function IntakeSubmissionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-ghost-100">
        <div className="border-b border-ghost-300 bg-white px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-ghost-400 animate-pulse" />
            <span className="font-mono text-xs text-ghost-700">LOADING...</span>
          </div>
        </div>
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner size="lg" showText text="Loading..." />
        </div>
      </div>
    }>
      <IntakeSubmissionContent />
    </Suspense>
  );
}

// ============================================================================
// COMPONENTS
// ============================================================================

function FormField({
  field,
  value,
  onChange,
}: {
  field: IntakeFormField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const renderField = () => {
    switch (field.field_type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
        return (
          <Input
            variant="terminal"
            type={field.field_type === 'email' ? 'email' : field.field_type === 'url' ? 'url' : 'text'}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.field_config?.placeholder || `Enter ${field.field_label.toLowerCase()}`}
            required={field.is_required}
          />
        );

      case 'textarea':
      case 'rich_text':
        return (
          <Textarea
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.field_config?.placeholder || `Enter ${field.field_label.toLowerCase()}`}
            required={field.is_required}
            rows={4}
            className="font-mono text-xs bg-white border border-ghost-300 hover:border-purple-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
          />
        );

      case 'number':
        return (
          <Input
            variant="terminal"
            type="number"
            value={(value as number) || ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
            placeholder={field.field_config?.placeholder}
            min={field.field_config?.min}
            max={field.field_config?.max}
            step={field.field_config?.step || 1}
            required={field.is_required}
          />
        );

      case 'currency':
        return (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-ghost-500">
              {field.field_config?.currency || '$'}
            </span>
            <Input
              variant="terminal"
              type="number"
              value={(value as number) || ''}
              onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
              placeholder="0.00"
              min={0}
              step={0.01}
              required={field.is_required}
              className="pl-8"
            />
          </div>
        );

      case 'date':
        return (
          <div className="relative">
            <Input
              variant="terminal"
              type="date"
              value={(value as string) || ''}
              onChange={(e) => onChange(e.target.value)}
              required={field.is_required}
            />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ghost-400 pointer-events-none" />
          </div>
        );

      case 'datetime':
        return (
          <div className="relative">
            <Input
              variant="terminal"
              type="datetime-local"
              value={(value as string) || ''}
              onChange={(e) => onChange(e.target.value)}
              required={field.is_required}
            />
            <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ghost-400 pointer-events-none" />
          </div>
        );

      case 'select':
      case 'user_select':
      case 'vendor_select':
      case 'department_select':
      case 'contract_type_select':
        return (
          <Select
            value={(value as string) || ''}
            onValueChange={onChange}
            required={field.is_required}
          >
            <SelectTrigger className="font-mono text-xs bg-white border border-ghost-300 hover:border-purple-500 focus:border-purple-500">
              <SelectValue placeholder={field.field_config?.placeholder || `Select ${field.field_label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.field_config?.options?.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="font-mono text-xs"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multiselect':
        // For simplicity, using checkboxes for multiselect
        return (
          <div className="space-y-2 border border-ghost-300 p-3 bg-ghost-50">
            {field.field_config?.options?.map((option) => {
              const values = (value as string[]) || [];
              return (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={values.includes(option.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onChange([...values, option.value]);
                      } else {
                        onChange(values.filter((v) => v !== option.value));
                      }
                    }}
                    className="h-4 w-4 border-ghost-300 text-purple-900 focus:ring-purple-500"
                  />
                  <span className="font-mono text-xs text-ghost-700">{option.label}</span>
                </label>
              );
            })}
          </div>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.field_config?.options?.map((option) => (
              <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={field.field_name}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => onChange(e.target.value)}
                  className="h-4 w-4 border-ghost-300 text-purple-900 focus:ring-purple-500"
                />
                <span className="font-mono text-xs text-ghost-700">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={(value as boolean) || false}
              onChange={(e) => onChange(e.target.checked)}
              className="h-4 w-4 border-ghost-300 text-purple-900 focus:ring-purple-500"
            />
            <span className="font-mono text-xs text-ghost-700">
              {field.field_config?.placeholder || 'Yes'}
            </span>
          </label>
        );

      case 'file':
        return (
          <div className="border-2 border-dashed border-ghost-300 p-4 text-center hover:border-purple-500 transition-colors cursor-pointer">
            <Upload className="h-6 w-6 text-ghost-400 mx-auto mb-2" />
            <p className="font-mono text-xs text-ghost-600">
              Click to upload or drag and drop
            </p>
            <p className="font-mono text-[10px] text-ghost-500 mt-1">
              {field.field_config?.accept || 'PDF, DOC, DOCX'}
            </p>
            <input
              type="file"
              accept={field.field_config?.accept}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onChange(file.name);
              }}
              className="hidden"
            />
          </div>
        );

      default:
        return (
          <Input
            variant="terminal"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.field_config?.placeholder}
            required={field.is_required}
          />
        );
    }
  };

  return (
    <div>
      <label className="font-mono text-xs text-ghost-700 uppercase block mb-2">
        {field.field_label}
        {field.is_required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {renderField()}
      {field.field_config?.help_text && (
        <p className="font-mono text-[10px] text-ghost-500 mt-1">
          {field.field_config.help_text}
        </p>
      )}
    </div>
  );
}
