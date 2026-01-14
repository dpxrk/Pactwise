'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Variable,
  FileText,
  Eye,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useTemplate,
  useCreateTemplate,
  useCreateTemplateSection,
  useCreateTemplateVariable,
} from '@/hooks/queries/useTemplates';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type {
  CreateTemplatePayload,
  CreateSectionPayload,
  CreateVariablePayload,
  TemplateType,
  VariableType,
  NumberingStyle,
  VariableOption,
} from '@/types/template.types';

// ============================================================================
// CONSTANTS
// ============================================================================

const templateTypes: { value: TemplateType; label: string }[] = [
  { value: 'master_services_agreement', label: 'Master Services Agreement' },
  { value: 'license_agreement', label: 'License Agreement' },
  { value: 'nda', label: 'Non-Disclosure Agreement' },
  { value: 'employment_agreement', label: 'Employment Agreement' },
  { value: 'vendor_agreement', label: 'Vendor Agreement' },
  { value: 'consulting_agreement', label: 'Consulting Agreement' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'lease_agreement', label: 'Lease Agreement' },
  { value: 'other', label: 'Other' },
];

const variableTypes: { value: VariableType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select' },
  { value: 'boolean', label: 'Yes/No' },
  { value: 'party', label: 'Party' },
  { value: 'address', label: 'Address' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'duration', label: 'Duration' },
  { value: 'computed', label: 'Computed' },
];

const numberingStyles: { value: NumberingStyle; label: string }[] = [
  { value: 'numeric', label: '1, 2, 3...' },
  { value: 'alpha', label: 'a, b, c...' },
  { value: 'roman', label: 'i, ii, iii...' },
  { value: 'none', label: 'None' },
];

// ============================================================================
// INTERFACES
// ============================================================================

interface LocalSection {
  id: string;
  title: string;
  content: string;
  numbering_style: NumberingStyle;
  is_optional: boolean;
  order: number;
}

interface LocalVariable {
  id: string;
  name: string;
  label: string;
  type: VariableType;
  default_value: string;
  is_required: boolean;
  description: string;
  options: VariableOption[];
  order: number;
}

// ============================================================================
// NEW TEMPLATE PAGE
// ============================================================================

export default function NewTemplatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateId = searchParams.get('duplicate');
  const { userProfile } = useAuth();
  const enterpriseId = userProfile?.enterprise_id;
  const userId = userProfile?.id;

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateType, setTemplateType] = useState<TemplateType>('other');
  const [category, setCategory] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  // Sections and variables
  const [sections, setSections] = useState<LocalSection[]>([]);
  const [variables, setVariables] = useState<LocalVariable[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<'details' | 'sections' | 'variables'>('details');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Load duplicate if specified
  const { data: duplicateTemplate } = useTemplate(duplicateId || '');

  // Mutations
  const createTemplate = useCreateTemplate();
  const createSection = useCreateTemplateSection();
  const createVariable = useCreateTemplateVariable();

  // Load duplicate data
  useEffect(() => {
    if (duplicateTemplate) {
      setName(`${duplicateTemplate.name} (Copy)`);
      setDescription(duplicateTemplate.description || '');
      setTemplateType(duplicateTemplate.template_type);
      setCategory(duplicateTemplate.category || '');
      setJurisdiction(duplicateTemplate.jurisdiction || '');

      if (duplicateTemplate.sections) {
        setSections(
          duplicateTemplate.sections.map((s, i) => ({
            id: `temp-${i}`,
            title: s.title,
            content: s.content,
            numbering_style: s.numbering_style,
            is_optional: s.is_optional,
            order: s.section_order,
          }))
        );
      }

      if (duplicateTemplate.variables) {
        setVariables(
          duplicateTemplate.variables.map((v, i) => ({
            id: `temp-${i}`,
            name: v.variable_name,
            label: v.variable_label,
            type: v.variable_type,
            default_value: typeof v.default_value === 'string' ? v.default_value : '',
            is_required: v.is_required,
            description: v.description || '',
            options: (v.options || []) as VariableOption[],
            order: v.display_order,
          }))
        );
      }
    }
  }, [duplicateTemplate]);

  // Add section
  const addSection = () => {
    setSections((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        title: `Section ${prev.length + 1}`,
        content: '',
        numbering_style: 'numeric',
        is_optional: false,
        order: prev.length,
      },
    ]);
  };

  // Remove section
  const removeSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
  };

  // Update section
  const updateSection = (id: string, updates: Partial<LocalSection>) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  // Add variable
  const addVariable = () => {
    setVariables((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        name: `variable_${prev.length + 1}`,
        label: `Variable ${prev.length + 1}`,
        type: 'text',
        default_value: '',
        is_required: false,
        description: '',
        options: [],
        order: prev.length,
      },
    ]);
  };

  // Remove variable
  const removeVariable = (id: string) => {
    setVariables((prev) => prev.filter((v) => v.id !== id));
  };

  // Update variable
  const updateVariable = (id: string, updates: Partial<LocalVariable>) => {
    setVariables((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...updates } : v))
    );
  };

  // Save template
  const handleSave = async () => {
    if (!enterpriseId || !userId || !name.trim()) return;

    setIsSaving(true);
    try {
      // Create template
      const templateData: CreateTemplatePayload = {
        name: name.trim(),
        description: description.trim() || undefined,
        template_type: templateType,
        category: category.trim() || undefined,
        jurisdiction: jurisdiction.trim() || undefined,
        is_default: isDefault,
      };

      const template = await createTemplate.mutateAsync({
        enterpriseId,
        userId,
        data: templateData,
      });

      // Create sections
      for (const section of sections) {
        const sectionData: CreateSectionPayload = {
          template_id: template.id,
          title: section.title,
          content: section.content,
          section_order: section.order,
          numbering_style: section.numbering_style,
          is_optional: section.is_optional,
        };
        await createSection.mutateAsync(sectionData);
      }

      // Create variables
      for (const variable of variables) {
        const variableData: CreateVariablePayload = {
          template_id: template.id,
          variable_name: variable.name,
          variable_label: variable.label,
          variable_type: variable.type,
          default_value: variable.default_value || undefined,
          is_required: variable.is_required,
          description: variable.description || undefined,
          options:
            variable.type === 'select'
              ? variable.options
              : undefined,
          display_order: variable.order,
        };
        await createVariable.mutateAsync(variableData);
      }

      // Navigate to the new template
      router.push(`/dashboard/contracts/templates/${template.id}`);
    } catch (error) {
      console.error('Failed to create template:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle section expansion
  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Header */}
      <div className="border-b border-ghost-300 bg-white px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-ghost-100"
            >
              <ArrowLeft className="h-4 w-4 text-ghost-600" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-purple-900">
                {duplicateId ? 'DUPLICATE TEMPLATE' : 'NEW TEMPLATE'}
              </h1>
              <p className="font-mono text-xs text-ghost-600">
                Create a reusable contract template
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="border border-ghost-300 px-4 py-2 font-mono text-xs text-ghost-700 hover:bg-ghost-50"
            >
              CANCEL
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || isSaving}
              className={cn(
                'border border-purple-900 bg-purple-900 text-white px-4 py-2 font-mono text-xs flex items-center gap-2',
                (!name.trim() || isSaving) && 'opacity-50 cursor-not-allowed',
                !(!name.trim() || isSaving) && 'hover:bg-purple-800'
              )}
            >
              <Save className="h-3 w-3" />
              {isSaving ? 'SAVING...' : 'SAVE TEMPLATE'}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Tabs */}
        <div className="border border-ghost-300 bg-white mb-6">
          <div className="flex border-b border-ghost-300">
            <button
              onClick={() => setActiveTab('details')}
              className={cn(
                'px-6 py-3 font-mono text-xs uppercase',
                activeTab === 'details'
                  ? 'bg-purple-50 text-purple-900 border-b-2 border-purple-900'
                  : 'text-ghost-600 hover:bg-ghost-50'
              )}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('sections')}
              className={cn(
                'px-6 py-3 font-mono text-xs uppercase flex items-center gap-2',
                activeTab === 'sections'
                  ? 'bg-purple-50 text-purple-900 border-b-2 border-purple-900'
                  : 'text-ghost-600 hover:bg-ghost-50'
              )}
            >
              <FileText className="h-3 w-3" />
              Sections
              <Badge className="bg-ghost-200 text-ghost-700">{sections.length}</Badge>
            </button>
            <button
              onClick={() => setActiveTab('variables')}
              className={cn(
                'px-6 py-3 font-mono text-xs uppercase flex items-center gap-2',
                activeTab === 'variables'
                  ? 'bg-purple-50 text-purple-900 border-b-2 border-purple-900'
                  : 'text-ghost-600 hover:bg-ghost-50'
              )}
            >
              <Variable className="h-3 w-3" />
              Variables
              <Badge className="bg-ghost-200 text-ghost-700">{variables.length}</Badge>
            </button>
          </div>

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Name */}
                <div>
                  <label className="font-mono text-xs text-ghost-600 uppercase mb-2 block">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Standard NDA Template"
                    className="w-full px-4 py-2 border border-ghost-300 font-mono text-sm focus:border-purple-900 focus:outline-none"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="font-mono text-xs text-ghost-600 uppercase mb-2 block">
                    Template Type *
                  </label>
                  <select
                    value={templateType}
                    onChange={(e) => setTemplateType(e.target.value as TemplateType)}
                    className="w-full px-4 py-2 border border-ghost-300 font-mono text-sm focus:border-purple-900 focus:outline-none"
                  >
                    {templateTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="font-mono text-xs text-ghost-600 uppercase mb-2 block">
                    Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g., Legal, HR, Procurement"
                    className="w-full px-4 py-2 border border-ghost-300 font-mono text-sm focus:border-purple-900 focus:outline-none"
                  />
                </div>

                {/* Jurisdiction */}
                <div>
                  <label className="font-mono text-xs text-ghost-600 uppercase mb-2 block">
                    Jurisdiction
                  </label>
                  <input
                    type="text"
                    value={jurisdiction}
                    onChange={(e) => setJurisdiction(e.target.value)}
                    placeholder="e.g., USA, California, EU"
                    className="w-full px-4 py-2 border border-ghost-300 font-mono text-sm focus:border-purple-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="font-mono text-xs text-ghost-600 uppercase mb-2 block">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the purpose and use case for this template..."
                  rows={4}
                  className="w-full px-4 py-2 border border-ghost-300 font-mono text-sm focus:border-purple-900 focus:outline-none resize-none"
                />
              </div>

              {/* Default Toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="h-4 w-4 border-ghost-300 text-purple-900 focus:ring-purple-900"
                />
                <label htmlFor="isDefault" className="font-mono text-sm text-ghost-700">
                  Set as default template for this type
                </label>
              </div>
            </div>
          )}

          {/* Sections Tab */}
          {activeTab === 'sections' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="font-mono text-xs text-ghost-600">
                  Define the structure and content of your template
                </p>
                <button
                  onClick={addSection}
                  className="border border-purple-900 text-purple-900 px-3 py-1.5 font-mono text-xs hover:bg-purple-50 flex items-center gap-2"
                >
                  <Plus className="h-3 w-3" />
                  ADD SECTION
                </button>
              </div>

              {sections.length === 0 ? (
                <div className="border border-dashed border-ghost-300 p-12 text-center">
                  <FileText className="h-12 w-12 text-ghost-300 mx-auto mb-4" />
                  <p className="font-mono text-sm text-ghost-600 mb-2">
                    No sections defined yet
                  </p>
                  <button
                    onClick={addSection}
                    className="font-mono text-xs text-purple-900 hover:underline"
                  >
                    Add your first section
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {sections.map((section, index) => (
                    <div
                      key={section.id}
                      className="border border-ghost-300 bg-white"
                    >
                      {/* Section Header */}
                      <div
                        className="flex items-center gap-3 px-4 py-3 bg-ghost-50 cursor-pointer"
                        onClick={() => toggleSection(section.id)}
                      >
                        <GripVertical className="h-4 w-4 text-ghost-400" />
                        <span className="font-mono text-xs text-ghost-500">
                          {index + 1}.
                        </span>
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) =>
                            updateSection(section.id, { title: e.target.value })
                          }
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 px-2 py-1 border border-transparent font-mono text-sm font-medium text-purple-900 hover:border-ghost-300 focus:border-purple-900 focus:outline-none"
                        />
                        <div className="flex items-center gap-2">
                          {section.is_optional && (
                            <Badge className="font-mono text-[10px] bg-amber-100 text-amber-700">
                              OPTIONAL
                            </Badge>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSection(section.id);
                            }}
                            className="p-1 hover:bg-ghost-100 text-ghost-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          {expandedSections.has(section.id) ? (
                            <ChevronUp className="h-4 w-4 text-ghost-500" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-ghost-500" />
                          )}
                        </div>
                      </div>

                      {/* Section Content */}
                      {expandedSections.has(section.id) && (
                        <div className="p-4 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="font-mono text-xs text-ghost-600 uppercase mb-1 block">
                                Numbering Style
                              </label>
                              <select
                                value={section.numbering_style}
                                onChange={(e) =>
                                  updateSection(section.id, {
                                    numbering_style: e.target.value as NumberingStyle,
                                  })
                                }
                                className="w-full px-3 py-2 border border-ghost-300 font-mono text-sm focus:border-purple-900 focus:outline-none"
                              >
                                {numberingStyles.map((style) => (
                                  <option key={style.value} value={style.value}>
                                    {style.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                id={`optional-${section.id}`}
                                checked={section.is_optional}
                                onChange={(e) =>
                                  updateSection(section.id, {
                                    is_optional: e.target.checked,
                                  })
                                }
                                className="h-4 w-4 border-ghost-300 text-purple-900 focus:ring-purple-900"
                              />
                              <label
                                htmlFor={`optional-${section.id}`}
                                className="font-mono text-sm text-ghost-700"
                              >
                                Optional section
                              </label>
                            </div>
                          </div>
                          <div>
                            <label className="font-mono text-xs text-ghost-600 uppercase mb-1 block">
                              Content
                            </label>
                            <textarea
                              value={section.content}
                              onChange={(e) =>
                                updateSection(section.id, {
                                  content: e.target.value,
                                })
                              }
                              placeholder="Enter section content... Use {{variable_name}} for variables"
                              rows={6}
                              className="w-full px-3 py-2 border border-ghost-300 font-mono text-sm focus:border-purple-900 focus:outline-none resize-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Variables Tab */}
          {activeTab === 'variables' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="font-mono text-xs text-ghost-600">
                  Define variables that can be filled when using this template
                </p>
                <button
                  onClick={addVariable}
                  className="border border-purple-900 text-purple-900 px-3 py-1.5 font-mono text-xs hover:bg-purple-50 flex items-center gap-2"
                >
                  <Plus className="h-3 w-3" />
                  ADD VARIABLE
                </button>
              </div>

              {variables.length === 0 ? (
                <div className="border border-dashed border-ghost-300 p-12 text-center">
                  <Variable className="h-12 w-12 text-ghost-300 mx-auto mb-4" />
                  <p className="font-mono text-sm text-ghost-600 mb-2">
                    No variables defined yet
                  </p>
                  <button
                    onClick={addVariable}
                    className="font-mono text-xs text-purple-900 hover:underline"
                  >
                    Add your first variable
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {variables.map((variable, index) => (
                    <div
                      key={variable.id}
                      className="border border-ghost-300 bg-white p-4"
                    >
                      <div className="grid grid-cols-12 gap-4">
                        {/* Order */}
                        <div className="col-span-1 flex items-center">
                          <GripVertical className="h-4 w-4 text-ghost-400 mr-2" />
                          <span className="font-mono text-xs text-ghost-500">
                            {index + 1}
                          </span>
                        </div>

                        {/* Name */}
                        <div className="col-span-2">
                          <label className="font-mono text-[10px] text-ghost-500 uppercase mb-1 block">
                            Name
                          </label>
                          <input
                            type="text"
                            value={variable.name}
                            onChange={(e) =>
                              updateVariable(variable.id, {
                                name: e.target.value.replace(/\s/g, '_').toLowerCase(),
                              })
                            }
                            className="w-full px-2 py-1 border border-ghost-300 font-mono text-sm focus:border-purple-900 focus:outline-none"
                          />
                        </div>

                        {/* Label */}
                        <div className="col-span-3">
                          <label className="font-mono text-[10px] text-ghost-500 uppercase mb-1 block">
                            Label
                          </label>
                          <input
                            type="text"
                            value={variable.label}
                            onChange={(e) =>
                              updateVariable(variable.id, { label: e.target.value })
                            }
                            className="w-full px-2 py-1 border border-ghost-300 font-mono text-sm focus:border-purple-900 focus:outline-none"
                          />
                        </div>

                        {/* Type */}
                        <div className="col-span-2">
                          <label className="font-mono text-[10px] text-ghost-500 uppercase mb-1 block">
                            Type
                          </label>
                          <select
                            value={variable.type}
                            onChange={(e) =>
                              updateVariable(variable.id, {
                                type: e.target.value as VariableType,
                              })
                            }
                            className="w-full px-2 py-1 border border-ghost-300 font-mono text-sm focus:border-purple-900 focus:outline-none"
                          >
                            {variableTypes.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Required */}
                        <div className="col-span-2 flex items-end pb-1">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={variable.is_required}
                              onChange={(e) =>
                                updateVariable(variable.id, {
                                  is_required: e.target.checked,
                                })
                              }
                              className="h-4 w-4 border-ghost-300 text-purple-900 focus:ring-purple-900"
                            />
                            <span className="font-mono text-xs text-ghost-600">
                              Required
                            </span>
                          </label>
                        </div>

                        {/* Delete */}
                        <div className="col-span-2 flex items-end justify-end pb-1">
                          <button
                            onClick={() => removeVariable(variable.id)}
                            className="p-1 hover:bg-ghost-100 text-ghost-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Options for select types */}
                      {(variable.type === 'select') && (
                        <div className="mt-3 pt-3 border-t border-ghost-200">
                          <label className="font-mono text-[10px] text-ghost-500 uppercase mb-1 block">
                            Options (one per line)
                          </label>
                          <textarea
                            value={variable.options.map(o => o.label).join('\n')}
                            onChange={(e) =>
                              updateVariable(variable.id, {
                                options: e.target.value.split('\n').filter(Boolean).map(label => ({ value: label, label })),
                              })
                            }
                            rows={3}
                            placeholder="Option 1&#10;Option 2&#10;Option 3"
                            className="w-full px-2 py-1 border border-ghost-300 font-mono text-sm focus:border-purple-900 focus:outline-none resize-none"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
