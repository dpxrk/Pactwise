'use client';

import {
  ArrowLeft,
  Plus,
  Play,
  Archive,
  Trash2,
  GripVertical,
  Settings,
  Eye,
  AlertCircle,
  Check,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useMemo, use } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import {
  useIntakeForm,
  usePublishIntakeForm,
  useArchiveIntakeForm,
  useCreateIntakeField,
  useUpdateIntakeField,
  useDeleteIntakeField,
  useReorderIntakeFields,
} from '@/hooks/queries/useIntakeForms';
import { cn } from '@/lib/utils';
import {
  IntakeFormField,
  FieldType,
  fieldTypeLabels,
  formTypeLabels,
} from '@/types/intake.types';

// Field type options for the dropdown
const fieldTypeOptions: { value: FieldType; label: string; description: string }[] = [
  { value: 'text', label: 'Text', description: 'Single line text input' },
  { value: 'textarea', label: 'Text Area', description: 'Multi-line text input' },
  { value: 'number', label: 'Number', description: 'Numeric input' },
  { value: 'currency', label: 'Currency', description: 'Currency amount input' },
  { value: 'date', label: 'Date', description: 'Date picker' },
  { value: 'datetime', label: 'Date & Time', description: 'Date and time picker' },
  { value: 'select', label: 'Dropdown', description: 'Single selection from options' },
  { value: 'multiselect', label: 'Multi-Select', description: 'Multiple selections' },
  { value: 'radio', label: 'Radio Buttons', description: 'Single selection radio group' },
  { value: 'checkbox', label: 'Checkbox', description: 'Boolean checkbox' },
  { value: 'file', label: 'File Upload', description: 'File attachment' },
  { value: 'email', label: 'Email', description: 'Email address input' },
  { value: 'phone', label: 'Phone', description: 'Phone number input' },
  { value: 'url', label: 'URL', description: 'Web URL input' },
  { value: 'user_select', label: 'User Select', description: 'Select from organization users' },
  { value: 'vendor_select', label: 'Vendor Select', description: 'Select from vendors' },
  { value: 'department_select', label: 'Department Select', description: 'Select department' },
  { value: 'contract_type_select', label: 'Contract Type', description: 'Select contract type' },
  { value: 'rich_text', label: 'Rich Text', description: 'Rich text editor' },
];

export default function FormBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: formId } = use(params);
  const router = useRouter();
  const { isLoading: isAuthLoading } = useAuth();

  // State
  const [isAddingField, setIsAddingField] = useState(false);
  const [newFieldData, setNewFieldData] = useState<{
    field_name: string;
    field_label: string;
    field_type: FieldType;
    is_required: boolean;
  }>({
    field_name: '',
    field_label: '',
    field_type: 'text',
    is_required: false,
  });

  // Queries
  const {
    data: form,
    isLoading: isFormLoading,
    error: formError,
  } = useIntakeForm(formId);

  // Mutations
  const publishForm = usePublishIntakeForm();
  const archiveForm = useArchiveIntakeForm();
  const createField = useCreateIntakeField();
  const deleteField = useDeleteIntakeField();
  const reorderFields = useReorderIntakeFields();

  const isLoading = isAuthLoading || isFormLoading;
  const isUpdating = publishForm.isPending || archiveForm.isPending;

  // Sorted fields
  const sortedFields = useMemo(() => {
    if (!form?.fields) return [];
    return [...form.fields].sort((a, b) => a.display_order - b.display_order);
  }, [form?.fields]);

  // Handlers
  const handlePublish = async () => {
    if (!form || form.status !== 'draft') return;
    await publishForm.mutateAsync(formId);
  };

  const handleArchive = async () => {
    if (!form || form.status !== 'active') return;
    await archiveForm.mutateAsync(formId);
  };

  const handleAddField = async () => {
    if (!newFieldData.field_name || !newFieldData.field_label) return;

    try {
      await createField.mutateAsync({
        formId,
        data: {
          field_name: newFieldData.field_name.toLowerCase().replace(/\s+/g, '_'),
          field_label: newFieldData.field_label,
          field_type: newFieldData.field_type,
          is_required: newFieldData.is_required,
        },
      });

      // Reset form
      setNewFieldData({
        field_name: '',
        field_label: '',
        field_type: 'text',
        is_required: false,
      });
      setIsAddingField(false);
    } catch (error) {
      console.error('Failed to create field:', error);
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!confirm('Are you sure you want to delete this field?')) return;
    await deleteField.mutateAsync({ fieldId, formId });
  };

  const handleMoveField = async (fieldId: string, direction: 'up' | 'down') => {
    const currentIndex = sortedFields.findIndex(f => f.id === fieldId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= sortedFields.length) return;

    // Create new order
    const newOrder = sortedFields.map((field, index) => ({
      field_id: field.id,
      display_order: index + 1,
    }));

    // Swap positions
    const temp = newOrder[currentIndex].display_order;
    newOrder[currentIndex].display_order = newOrder[newIndex].display_order;
    newOrder[newIndex].display_order = temp;

    await reorderFields.mutateAsync({ formId, fieldOrder: newOrder });
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
          <LoadingSpinner size="lg" showText text="Loading form builder..." />
        </div>
      </div>
    );
  }

  // Handle error state
  if (formError || !form) {
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
              <div className={cn(
                'h-2 w-2',
                form.status === 'active' ? 'bg-green-500' :
                form.status === 'draft' ? 'bg-blue-500' :
                'bg-ghost-400'
              )} />
              <span className="font-mono text-xs text-ghost-700">
                FORM BUILDER: {form.name.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge
              variant="outline"
              className={cn(
                'font-mono text-[10px] uppercase',
                form.status === 'active'
                  ? 'border-green-500 text-green-700 bg-green-50'
                  : form.status === 'draft'
                  ? 'border-blue-500 text-blue-700 bg-blue-50'
                  : 'border-ghost-500 text-ghost-700 bg-ghost-50'
              )}
            >
              {form.status}
            </Badge>
            <span className="font-mono text-xs text-ghost-600">v{form.version}</span>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Left Panel - Form Details */}
          <div className="space-y-4">
            <div className="border border-ghost-300 bg-white">
              <div className="border-b border-ghost-300 px-4 py-3">
                <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                  FORM DETAILS
                </h3>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="font-mono text-[10px] text-ghost-600 uppercase block mb-1">
                    Form Name
                  </label>
                  <p className="font-mono text-sm text-ghost-900">{form.name}</p>
                </div>
                <div>
                  <label className="font-mono text-[10px] text-ghost-600 uppercase block mb-1">
                    Type
                  </label>
                  <p className="font-mono text-sm text-ghost-900">
                    {formTypeLabels[form.form_type]}
                  </p>
                </div>
                {form.description && (
                  <div>
                    <label className="font-mono text-[10px] text-ghost-600 uppercase block mb-1">
                      Description
                    </label>
                    <p className="font-mono text-xs text-ghost-700">{form.description}</p>
                  </div>
                )}
                <div>
                  <label className="font-mono text-[10px] text-ghost-600 uppercase block mb-1">
                    Fields
                  </label>
                  <p className="font-mono text-sm text-ghost-900">
                    {sortedFields.length} field{sortedFields.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="border border-ghost-300 bg-white">
              <div className="border-b border-ghost-300 px-4 py-3">
                <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                  ACTIONS
                </h3>
              </div>
              <div className="p-4 space-y-2">
                {form.status === 'draft' && (
                  <button
                    onClick={handlePublish}
                    disabled={isUpdating || sortedFields.length === 0}
                    className="w-full border border-green-500 bg-green-500 text-white px-4 py-2 font-mono text-xs hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Play className="h-3 w-3" />
                    PUBLISH FORM
                  </button>
                )}
                {form.status === 'active' && (
                  <>
                    <button
                      onClick={() => router.push(`/dashboard/contracts/intake/new?form=${formId}`)}
                      className="w-full border border-purple-900 bg-purple-900 text-white px-4 py-2 font-mono text-xs hover:bg-purple-800 flex items-center justify-center gap-2"
                    >
                      <Eye className="h-3 w-3" />
                      PREVIEW / SUBMIT
                    </button>
                    <button
                      onClick={handleArchive}
                      disabled={isUpdating}
                      className="w-full border border-ghost-300 bg-white text-ghost-700 px-4 py-2 font-mono text-xs hover:bg-ghost-50 hover:border-ghost-400 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Archive className="h-3 w-3" />
                      ARCHIVE FORM
                    </button>
                  </>
                )}
                {sortedFields.length === 0 && form.status === 'draft' && (
                  <p className="font-mono text-[10px] text-amber-600 text-center">
                    Add at least one field to publish
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Fields Builder */}
          <div className="col-span-2 border border-ghost-300 bg-white">
            <div className="border-b border-ghost-300 px-4 py-3 flex items-center justify-between">
              <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                FORM FIELDS ({sortedFields.length})
              </h3>
              {form.status === 'draft' && (
                <button
                  onClick={() => setIsAddingField(true)}
                  className="border border-purple-900 bg-purple-900 text-white px-3 py-1 font-mono text-[10px] hover:bg-purple-800 flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  ADD FIELD
                </button>
              )}
            </div>

            {/* Add Field Form */}
            {isAddingField && (
              <div className="border-b border-ghost-300 bg-purple-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-mono text-xs text-purple-900 uppercase">New Field</h4>
                  <button
                    onClick={() => setIsAddingField(false)}
                    className="text-ghost-500 hover:text-ghost-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="font-mono text-[10px] text-ghost-600 uppercase block mb-1">
                      Field Label *
                    </label>
                    <Input
                      variant="terminal"
                      inputSize="sm"
                      value={newFieldData.field_label}
                      onChange={(e) => setNewFieldData({
                        ...newFieldData,
                        field_label: e.target.value,
                        field_name: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                      })}
                      placeholder="e.g., Contract Title"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-ghost-600 uppercase block mb-1">
                      Field Name *
                    </label>
                    <Input
                      variant="terminal"
                      inputSize="sm"
                      value={newFieldData.field_name}
                      onChange={(e) => setNewFieldData({
                        ...newFieldData,
                        field_name: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                      })}
                      placeholder="e.g., contract_title"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-ghost-600 uppercase block mb-1">
                      Field Type *
                    </label>
                    <Select
                      value={newFieldData.field_type}
                      onValueChange={(value) => setNewFieldData({
                        ...newFieldData,
                        field_type: value as FieldType,
                      })}
                    >
                      <SelectTrigger className="h-8 font-mono text-xs bg-white border border-ghost-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldTypeOptions.map((option) => (
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
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newFieldData.is_required}
                      onChange={(e) => setNewFieldData({
                        ...newFieldData,
                        is_required: e.target.checked,
                      })}
                      className="h-4 w-4 border-ghost-300 text-purple-900 focus:ring-purple-500"
                    />
                    <span className="font-mono text-xs text-ghost-700">Required field</span>
                  </label>
                  <button
                    onClick={handleAddField}
                    disabled={!newFieldData.field_name || !newFieldData.field_label || createField.isPending}
                    className="border border-purple-900 bg-purple-900 text-white px-4 py-1 font-mono text-[10px] hover:bg-purple-800 disabled:opacity-50 flex items-center gap-1"
                  >
                    {createField.isPending ? (
                      <>
                        <LoadingSpinner size="sm" />
                        ADDING...
                      </>
                    ) : (
                      <>
                        <Check className="h-3 w-3" />
                        ADD FIELD
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Fields List */}
            {sortedFields.length > 0 ? (
              <div className="divide-y divide-ghost-200">
                {sortedFields.map((field, index) => (
                  <FieldRow
                    key={field.id}
                    field={field}
                    index={index}
                    isFirst={index === 0}
                    isLast={index === sortedFields.length - 1}
                    isEditable={form.status === 'draft'}
                    onMoveUp={() => handleMoveField(field.id, 'up')}
                    onMoveDown={() => handleMoveField(field.id, 'down')}
                    onDelete={() => handleDeleteField(field.id)}
                    formId={formId}
                  />
                ))}
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <Settings className="h-12 w-12 text-ghost-400 mx-auto mb-3" />
                <p className="font-mono text-xs text-ghost-600 uppercase mb-2">
                  No fields added yet
                </p>
                <p className="font-mono text-[10px] text-ghost-500">
                  Add fields to build your intake form
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTS
// ============================================================================

function FieldRow({
  field,
  index,
  isFirst,
  isLast,
  isEditable,
  onMoveUp,
  onMoveDown,
  onDelete,
  formId,
}: {
  field: IntakeFormField;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  isEditable: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  formId: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    field_label: field.field_label,
    is_required: field.is_required,
  });

  const updateField = useUpdateIntakeField();

  const handleSave = async () => {
    try {
      await updateField.mutateAsync({
        fieldId: field.id,
        formId,
        data: {
          field_label: editData.field_label,
          is_required: editData.is_required,
        },
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update field:', error);
    }
  };

  return (
    <div className="px-4 py-3 hover:bg-purple-50/50 transition-colors">
      <div className="flex items-center gap-3">
        {/* Drag Handle & Order */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isEditable && (
            <GripVertical className="h-4 w-4 text-ghost-400 cursor-move" />
          )}
          <span className="font-mono text-[10px] text-ghost-500 w-6">
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>

        {/* Field Info */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <Input
              variant="terminal"
              inputSize="sm"
              value={editData.field_label}
              onChange={(e) => setEditData({ ...editData, field_label: e.target.value })}
              className="max-w-xs"
            />
          ) : (
            <p className="font-mono text-xs text-ghost-900 truncate">{field.field_label}</p>
          )}
          <p className="font-mono text-[10px] text-ghost-500">
            {field.field_name} &middot; {fieldTypeLabels[field.field_type]}
          </p>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isEditing ? (
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={editData.is_required}
                onChange={(e) => setEditData({ ...editData, is_required: e.target.checked })}
                className="h-3 w-3"
              />
              <span className="font-mono text-[10px] text-ghost-600">Required</span>
            </label>
          ) : (
            field.is_required && (
              <Badge variant="outline" className="font-mono text-[10px] border-red-400 text-red-600 bg-red-50">
                Required
              </Badge>
            )
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {isEditable && isEditing && (
            <>
              <button
                onClick={handleSave}
                disabled={updateField.isPending}
                className="p-1 text-green-600 hover:bg-green-50"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setEditData({ field_label: field.field_label, is_required: field.is_required });
                  setIsEditing(false);
                }}
                className="p-1 text-ghost-500 hover:bg-ghost-50"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          )}
          {isEditable && !isEditing && (
            <>
              <button
                onClick={onMoveUp}
                disabled={isFirst}
                className="p-1 text-ghost-400 hover:text-ghost-700 hover:bg-ghost-50 disabled:opacity-30"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                onClick={onMoveDown}
                disabled={isLast}
                className="p-1 text-ghost-400 hover:text-ghost-700 hover:bg-ghost-50 disabled:opacity-30"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 text-ghost-400 hover:text-purple-900 hover:bg-purple-50"
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                onClick={onDelete}
                className="p-1 text-ghost-400 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
