'use client';

import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  Variable,
  Layers,
  FileText,
  X,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, use } from 'react';

import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import {
  useTemplate,
  useUpdateTemplate,
  useCreateTemplateSection,
  useUpdateTemplateSection,
  useDeleteTemplateSection,
  useCreateTemplateVariable,
  useUpdateTemplateVariable,
  useDeleteTemplateVariable,
} from '@/hooks/queries/useTemplates';
import type {
  TemplateType,
  TemplateSection,
  TemplateVariable,
  NumberingStyle,
  VariableType,
  CreateSectionPayload,
  UpdateSectionPayload,
  CreateVariablePayload,
  UpdateVariablePayload,
} from '@/types/template.types';
import {
  templateTypeLabels,
  variableTypeLabels,
} from '@/types/template.types';

// ============================================================================
// EDIT PAGE
// ============================================================================

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TemplateEditPage({ params }: PageProps) {
  const { id: templateId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'details';
  useAuth();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state for details
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateType, setTemplateType] = useState<TemplateType>('other');
  const [category, setCategory] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [language, setLanguage] = useState('en');
  const [isDefault, setIsDefault] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  // Modal states
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [variableModalOpen, setVariableModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<TemplateSection | null>(null);
  const [editingVariable, setEditingVariable] = useState<TemplateVariable | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'section' | 'variable'; id: string } | null>(null);

  // Fetch template
  const { data: template, isLoading, error } = useTemplate(templateId);

  // Mutations
  const updateTemplateMutation = useUpdateTemplate();
  const createSectionMutation = useCreateTemplateSection();
  const updateSectionMutation = useUpdateTemplateSection();
  const deleteSectionMutation = useDeleteTemplateSection();
  const createVariableMutation = useCreateTemplateVariable();
  const updateVariableMutation = useUpdateTemplateVariable();
  const deleteVariableMutation = useDeleteTemplateVariable();

  // Initialize form with template data
  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || '');
      setTemplateType(template.template_type);
      setCategory(template.category || '');
      setJurisdiction(template.jurisdiction || '');
      setLanguage(template.language || 'en');
      setIsDefault(template.is_default);
      setTags(template.metadata?.tags || []);
    }
  }, [template]);

  // Handle save details
  const handleSaveDetails = async () => {
    setIsSaving(true);
    try {
      await updateTemplateMutation.mutateAsync({
        templateId,
        data: {
          name,
          description: description || undefined,
          template_type: templateType,
          category: category || undefined,
          jurisdiction: jurisdiction || undefined,
          language,
          is_default: isDefault,
          metadata: { tags },
        },
      });
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle add tag
  const handleAddTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag('');
      setHasChanges(true);
    }
  };

  // Handle remove tag
  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
    setHasChanges(true);
  };

  // Handle delete item
  const handleDeleteItem = async () => {
    if (!itemToDelete) return;

    if (itemToDelete.type === 'section') {
      await deleteSectionMutation.mutateAsync({
        sectionId: itemToDelete.id,
        templateId,
      });
    } else {
      await deleteVariableMutation.mutateAsync({
        variableId: itemToDelete.id,
        templateId,
      });
    }
    setDeleteConfirmOpen(false);
    setItemToDelete(null);
  };

  // Open section modal
  const openSectionModal = (section?: TemplateSection) => {
    setEditingSection(section || null);
    setSectionModalOpen(true);
  };

  // Open variable modal
  const openVariableModal = (variable?: TemplateVariable) => {
    setEditingVariable(variable || null);
    setVariableModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-ghost-100 p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="min-h-screen bg-ghost-100 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="font-mono text-sm text-ghost-600">Template not found</p>
          <button
            onClick={() => router.push('/dashboard/contracts/templates')}
            className="mt-4 font-mono text-xs text-purple-900 hover:underline"
          >
            Back to templates
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Top Bar */}
      <div className="border-b border-ghost-300 bg-white px-6 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/dashboard/contracts/templates/${templateId}`)}
              className="p-1 hover:bg-ghost-100"
            >
              <ArrowLeft className="h-4 w-4 text-ghost-600" />
            </button>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-amber-500 animate-pulse" />
              <span className="font-mono text-xs text-ghost-700 uppercase">
                EDITING TEMPLATE
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {hasChanges && (
              <Badge className="font-mono text-xs bg-amber-100 text-amber-700">
                UNSAVED CHANGES
              </Badge>
            )}
            <button
              onClick={() => router.push(`/dashboard/contracts/templates/${templateId}`)}
              className="border border-ghost-300 px-4 py-2 font-mono text-xs hover:border-ghost-500"
            >
              CANCEL
            </button>
            <button
              onClick={handleSaveDetails}
              disabled={isSaving || !hasChanges}
              className="border border-purple-900 bg-purple-900 text-white px-4 py-2 font-mono text-xs hover:bg-purple-800 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="h-3 w-3" />
              {isSaving ? 'SAVING...' : 'SAVE'}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Header */}
        <div className="border border-ghost-300 bg-white p-6 mb-6">
          <h1 className="text-xl font-bold text-purple-900 mb-1">
            Edit: {template.name}
          </h1>
          <p className="font-mono text-xs text-ghost-600">
            Modify template details, sections, and variables
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="border border-ghost-300 bg-white p-1 w-full justify-start gap-0 h-auto">
            <TabsTrigger
              value="details"
              className="font-mono text-xs uppercase px-4 py-2 data-[state=active]:bg-purple-900 data-[state=active]:text-white rounded-none flex items-center gap-2"
            >
              <FileText className="h-3 w-3" />
              Details
            </TabsTrigger>
            <TabsTrigger
              value="sections"
              className="font-mono text-xs uppercase px-4 py-2 data-[state=active]:bg-purple-900 data-[state=active]:text-white rounded-none flex items-center gap-2"
            >
              <Layers className="h-3 w-3" />
              Sections ({template.sections?.length || 0})
            </TabsTrigger>
            <TabsTrigger
              value="variables"
              className="font-mono text-xs uppercase px-4 py-2 data-[state=active]:bg-purple-900 data-[state=active]:text-white rounded-none flex items-center gap-2"
            >
              <Variable className="h-3 w-3" />
              Variables ({template.variables?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="mt-6">
            <div className="border border-ghost-300 bg-white p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div className="md:col-span-2">
                  <label className="font-mono text-xs text-ghost-600 uppercase block mb-2">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setHasChanges(true);
                    }}
                    className="w-full border border-ghost-300 px-4 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none"
                    placeholder="Enter template name"
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="font-mono text-xs text-ghost-600 uppercase block mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      setHasChanges(true);
                    }}
                    rows={3}
                    className="w-full border border-ghost-300 px-4 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none resize-none"
                    placeholder="Enter description"
                  />
                </div>

                {/* Template Type */}
                <div>
                  <label className="font-mono text-xs text-ghost-600 uppercase block mb-2">
                    Template Type *
                  </label>
                  <select
                    value={templateType}
                    onChange={(e) => {
                      setTemplateType(e.target.value as TemplateType);
                      setHasChanges(true);
                    }}
                    className="w-full border border-ghost-300 px-4 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none"
                  >
                    {Object.entries(templateTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="font-mono text-xs text-ghost-600 uppercase block mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setHasChanges(true);
                    }}
                    className="w-full border border-ghost-300 px-4 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none"
                    placeholder="e.g., Sales, HR, Procurement"
                  />
                </div>

                {/* Jurisdiction */}
                <div>
                  <label className="font-mono text-xs text-ghost-600 uppercase block mb-2">
                    Jurisdiction
                  </label>
                  <input
                    type="text"
                    value={jurisdiction}
                    onChange={(e) => {
                      setJurisdiction(e.target.value);
                      setHasChanges(true);
                    }}
                    className="w-full border border-ghost-300 px-4 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none"
                    placeholder="e.g., US, UK, EU"
                  />
                </div>

                {/* Language */}
                <div>
                  <label className="font-mono text-xs text-ghost-600 uppercase block mb-2">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => {
                      setLanguage(e.target.value);
                      setHasChanges(true);
                    }}
                    className="w-full border border-ghost-300 px-4 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                    <option value="zh">Chinese</option>
                    <option value="ja">Japanese</option>
                  </select>
                </div>

                {/* Default Toggle */}
                <div className="md:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDefault}
                      onChange={(e) => {
                        setIsDefault(e.target.checked);
                        setHasChanges(true);
                      }}
                      className="h-4 w-4 border-ghost-300 text-purple-900 focus:ring-purple-900"
                    />
                    <span className="font-mono text-sm text-ghost-700">
                      Set as default template for this type
                    </span>
                  </label>
                </div>

                {/* Tags */}
                <div className="md:col-span-2">
                  <label className="font-mono text-xs text-ghost-600 uppercase block mb-2">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        className="font-mono text-xs bg-ghost-100 text-ghost-700 flex items-center gap-1"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                      className="flex-1 border border-ghost-300 px-4 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none"
                      placeholder="Add tag"
                    />
                    <button
                      onClick={handleAddTag}
                      className="border border-ghost-300 px-4 py-2 font-mono text-xs hover:border-purple-900 hover:bg-ghost-50"
                    >
                      ADD
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Sections Tab */}
          <TabsContent value="sections" className="mt-6">
            <div className="border border-ghost-300 bg-white">
              <div className="border-b border-ghost-300 px-4 py-3 flex justify-between items-center">
                <h3 className="font-mono text-sm font-semibold text-purple-900 uppercase">
                  Template Sections
                </h3>
                <button
                  onClick={() => openSectionModal()}
                  className="border border-ghost-300 px-3 py-1.5 font-mono text-xs hover:border-purple-900 hover:bg-ghost-50 flex items-center gap-2"
                >
                  <Plus className="h-3 w-3" />
                  ADD SECTION
                </button>
              </div>

              {!template.sections || template.sections.length === 0 ? (
                <div className="p-12 text-center">
                  <Layers className="h-12 w-12 text-ghost-300 mx-auto mb-4" />
                  <p className="font-mono text-sm text-ghost-600 mb-2">
                    No sections defined
                  </p>
                  <button
                    onClick={() => openSectionModal()}
                    className="font-mono text-xs text-purple-900 hover:underline"
                  >
                    Add your first section
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-ghost-200">
                  {template.sections
                    .filter((s) => !s.parent_section_id)
                    .sort((a, b) => a.section_order - b.section_order)
                    .map((section, index) => (
                      <EditableSectionRow
                        key={section.id}
                        section={section}
                        index={index}
                        totalSections={template.sections?.filter((s) => !s.parent_section_id).length || 0}
                        onEdit={() => openSectionModal(section)}
                        onDelete={() => {
                          setItemToDelete({ type: 'section', id: section.id });
                          setDeleteConfirmOpen(true);
                        }}
                        onMoveUp={() => {
                          // Move section up logic
                        }}
                        onMoveDown={() => {
                          // Move section down logic
                        }}
                      />
                    ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Variables Tab */}
          <TabsContent value="variables" className="mt-6">
            <div className="border border-ghost-300 bg-white">
              <div className="border-b border-ghost-300 px-4 py-3 flex justify-between items-center">
                <h3 className="font-mono text-sm font-semibold text-purple-900 uppercase">
                  Template Variables
                </h3>
                <button
                  onClick={() => openVariableModal()}
                  className="border border-ghost-300 px-3 py-1.5 font-mono text-xs hover:border-purple-900 hover:bg-ghost-50 flex items-center gap-2"
                >
                  <Plus className="h-3 w-3" />
                  ADD VARIABLE
                </button>
              </div>

              {!template.variables || template.variables.length === 0 ? (
                <div className="p-12 text-center">
                  <Variable className="h-12 w-12 text-ghost-300 mx-auto mb-4" />
                  <p className="font-mono text-sm text-ghost-600 mb-2">
                    No variables defined
                  </p>
                  <button
                    onClick={() => openVariableModal()}
                    className="font-mono text-xs text-purple-900 hover:underline"
                  >
                    Add your first variable
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-ghost-200">
                  {template.variables
                    .sort((a, b) => a.display_order - b.display_order)
                    .map((variable, index) => (
                      <EditableVariableRow
                        key={variable.id}
                        variable={variable}
                        index={index}
                        totalVariables={template.variables?.length || 0}
                        onEdit={() => openVariableModal(variable)}
                        onDelete={() => {
                          setItemToDelete({ type: 'variable', id: variable.id });
                          setDeleteConfirmOpen(true);
                        }}
                      />
                    ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Section Modal */}
      <SectionModal
        open={sectionModalOpen}
        onClose={() => {
          setSectionModalOpen(false);
          setEditingSection(null);
        }}
        section={editingSection}
        templateId={templateId}
        onSave={async (data) => {
          if (editingSection) {
            await updateSectionMutation.mutateAsync({
              sectionId: editingSection.id,
              templateId,
              data,
            });
          } else {
            await createSectionMutation.mutateAsync({
              ...data,
              template_id: templateId,
            } as CreateSectionPayload);
          }
          setSectionModalOpen(false);
          setEditingSection(null);
        }}
        isLoading={createSectionMutation.isPending || updateSectionMutation.isPending}
      />

      {/* Variable Modal */}
      <VariableModal
        open={variableModalOpen}
        onClose={() => {
          setVariableModalOpen(false);
          setEditingVariable(null);
        }}
        variable={editingVariable}
        templateId={templateId}
        onSave={async (data) => {
          if (editingVariable) {
            await updateVariableMutation.mutateAsync({
              variableId: editingVariable.id,
              templateId,
              data,
            });
          } else {
            await createVariableMutation.mutateAsync({
              ...data,
              template_id: templateId,
            } as CreateVariablePayload);
          }
          setVariableModalOpen(false);
          setEditingVariable(null);
        }}
        isLoading={createVariableMutation.isPending || updateVariableMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono text-lg text-purple-900">
              Delete {itemToDelete?.type === 'section' ? 'Section' : 'Variable'}
            </DialogTitle>
            <DialogDescription className="font-mono text-sm text-ghost-600">
              Are you sure you want to delete this {itemToDelete?.type}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button
              onClick={() => setDeleteConfirmOpen(false)}
              className="border border-ghost-300 px-4 py-2 font-mono text-xs hover:border-ghost-500"
            >
              CANCEL
            </button>
            <button
              onClick={handleDeleteItem}
              disabled={deleteSectionMutation.isPending || deleteVariableMutation.isPending}
              className="border border-red-600 bg-red-600 text-white px-4 py-2 font-mono text-xs hover:bg-red-700 disabled:opacity-50"
            >
              DELETE
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// EDITABLE SECTION ROW
// ============================================================================

interface EditableSectionRowProps {
  section: TemplateSection;
  index: number;
  totalSections: number;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function EditableSectionRow({
  section,
  index,
  totalSections,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: EditableSectionRowProps) {
  return (
    <div className="px-4 py-3 hover:bg-ghost-50 flex items-center gap-3">
      <div className="flex flex-col gap-0.5">
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          className="p-0.5 hover:bg-ghost-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronUp className="h-3 w-3 text-ghost-500" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={index === totalSections - 1}
          className="p-0.5 hover:bg-ghost-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronDown className="h-3 w-3 text-ghost-500" />
        </button>
      </div>
      <GripVertical className="h-4 w-4 text-ghost-300 cursor-grab" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium text-purple-900">
            {section.title}
          </span>
          {section.is_optional && (
            <Badge className="font-mono text-[10px] bg-ghost-100 text-ghost-600">
              OPTIONAL
            </Badge>
          )}
        </div>
        <div className="font-mono text-xs text-ghost-500 line-clamp-1 mt-1">
          {section.content.substring(0, 80)}
          {section.content.length > 80 && '...'}
        </div>
      </div>
      <Badge className="font-mono text-[10px] bg-ghost-100 text-ghost-600">
        {section.numbering_style}
      </Badge>
      <div className="flex items-center gap-1">
        <button
          onClick={onEdit}
          className="p-2 hover:bg-ghost-200 rounded"
        >
          <FileText className="h-4 w-4 text-ghost-500" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 hover:bg-red-100 rounded"
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// EDITABLE VARIABLE ROW
// ============================================================================

interface EditableVariableRowProps {
  variable: TemplateVariable;
  index: number;
  totalVariables: number;
  onEdit: () => void;
  onDelete: () => void;
}

function EditableVariableRow({
  variable,
  onEdit,
  onDelete,
}: EditableVariableRowProps) {
  return (
    <div className="px-4 py-3 hover:bg-ghost-50 flex items-center gap-4">
      <GripVertical className="h-4 w-4 text-ghost-300 cursor-grab" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <code className="font-mono text-sm font-medium text-purple-900 bg-purple-50 px-2 py-0.5">
            {`{{${variable.variable_name}}}`}
          </code>
          {variable.is_required && (
            <Badge className="font-mono text-[10px] bg-red-100 text-red-700">
              REQUIRED
            </Badge>
          )}
        </div>
        <div className="font-mono text-xs text-ghost-600 mt-1">
          {variable.variable_label}
        </div>
      </div>
      <Badge className="font-mono text-xs bg-ghost-100 text-ghost-600">
        {variableTypeLabels[variable.variable_type]}
      </Badge>
      <div className="flex items-center gap-1">
        <button
          onClick={onEdit}
          className="p-2 hover:bg-ghost-200 rounded"
        >
          <Variable className="h-4 w-4 text-ghost-500" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 hover:bg-red-100 rounded"
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// SECTION MODAL
// ============================================================================

interface SectionModalProps {
  open: boolean;
  onClose: () => void;
  section: TemplateSection | null;
  templateId: string;
  onSave: (data: UpdateSectionPayload) => Promise<void>;
  isLoading: boolean;
}

function SectionModal({
  open,
  onClose,
  section,
  templateId: _templateId,
  onSave,
  isLoading,
}: SectionModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [numberingStyle, setNumberingStyle] = useState<NumberingStyle>('numeric');
  const [isOptional, setIsOptional] = useState(false);

  useEffect(() => {
    if (section) {
      setTitle(section.title);
      setContent(section.content);
      setNumberingStyle(section.numbering_style);
      setIsOptional(section.is_optional);
    } else {
      setTitle('');
      setContent('');
      setNumberingStyle('numeric');
      setIsOptional(false);
    }
  }, [section, open]);

  const handleSave = async () => {
    await onSave({
      title,
      content,
      numbering_style: numberingStyle,
      is_optional: isOptional,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-mono text-lg text-purple-900">
            {section ? 'Edit Section' : 'Add Section'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="font-mono text-xs text-ghost-600 uppercase block mb-2">
              Section Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-ghost-300 px-4 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none"
              placeholder="e.g., Definitions, Payment Terms, Confidentiality"
            />
          </div>

          <div>
            <label className="font-mono text-xs text-ghost-600 uppercase block mb-2">
              Content *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="w-full border border-ghost-300 px-4 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none resize-none"
              placeholder="Enter section content. Use {{variable_name}} for variables."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-mono text-xs text-ghost-600 uppercase block mb-2">
                Numbering Style
              </label>
              <select
                value={numberingStyle}
                onChange={(e) => setNumberingStyle(e.target.value as NumberingStyle)}
                className="w-full border border-ghost-300 px-4 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none"
              >
                <option value="numeric">Numeric (1, 2, 3)</option>
                <option value="alpha">Alphabetic (a, b, c)</option>
                <option value="roman">Roman (i, ii, iii)</option>
                <option value="none">None</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isOptional}
                  onChange={(e) => setIsOptional(e.target.checked)}
                  className="h-4 w-4 border-ghost-300 text-purple-900 focus:ring-purple-900"
                />
                <span className="font-mono text-sm text-ghost-700">
                  Optional section
                </span>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <button
            onClick={onClose}
            className="border border-ghost-300 px-4 py-2 font-mono text-xs hover:border-ghost-500"
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || !title || !content}
            className="border border-purple-900 bg-purple-900 text-white px-4 py-2 font-mono text-xs hover:bg-purple-800 disabled:opacity-50"
          >
            {isLoading ? 'SAVING...' : section ? 'UPDATE' : 'ADD'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// VARIABLE MODAL
// ============================================================================

interface VariableModalProps {
  open: boolean;
  onClose: () => void;
  variable: TemplateVariable | null;
  templateId: string;
  onSave: (data: UpdateVariablePayload) => Promise<void>;
  isLoading: boolean;
}

function VariableModal({
  open,
  onClose,
  variable,
  templateId: _templateId,
  onSave,
  isLoading,
}: VariableModalProps) {
  const [variableName, setVariableName] = useState('');
  const [variableLabel, setVariableLabel] = useState('');
  const [variableType, setVariableType] = useState<VariableType>('text');
  const [defaultValue, setDefaultValue] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [description, setDescription] = useState('');
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    if (variable) {
      setVariableName(variable.variable_name);
      setVariableLabel(variable.variable_label);
      setVariableType(variable.variable_type);
      setDefaultValue(variable.default_value ? String(variable.default_value) : '');
      setIsRequired(variable.is_required);
      setDescription(variable.description || '');
      setGroupName(variable.group_name || '');
    } else {
      setVariableName('');
      setVariableLabel('');
      setVariableType('text');
      setDefaultValue('');
      setIsRequired(false);
      setDescription('');
      setGroupName('');
    }
  }, [variable, open]);

  const handleSave = async () => {
    await onSave({
      variable_name: variableName,
      variable_label: variableLabel,
      variable_type: variableType,
      default_value: defaultValue || undefined,
      is_required: isRequired,
      description: description || undefined,
      group_name: groupName || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-mono text-lg text-purple-900">
            {variable ? 'Edit Variable' : 'Add Variable'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="font-mono text-xs text-ghost-600 uppercase block mb-2">
              Variable Name *
            </label>
            <input
              type="text"
              value={variableName}
              onChange={(e) => setVariableName(e.target.value.replace(/\s/g, '_').toLowerCase())}
              className="w-full border border-ghost-300 px-4 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none"
              placeholder="e.g., client_name, contract_value"
            />
            <p className="font-mono text-xs text-ghost-400 mt-1">
              Use in template as: {`{{${variableName || 'variable_name'}}}`}
            </p>
          </div>

          <div>
            <label className="font-mono text-xs text-ghost-600 uppercase block mb-2">
              Display Label *
            </label>
            <input
              type="text"
              value={variableLabel}
              onChange={(e) => setVariableLabel(e.target.value)}
              className="w-full border border-ghost-300 px-4 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none"
              placeholder="e.g., Client Name, Contract Value"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-mono text-xs text-ghost-600 uppercase block mb-2">
                Variable Type
              </label>
              <select
                value={variableType}
                onChange={(e) => setVariableType(e.target.value as VariableType)}
                className="w-full border border-ghost-300 px-4 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none"
              >
                {Object.entries(variableTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-mono text-xs text-ghost-600 uppercase block mb-2">
                Group
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full border border-ghost-300 px-4 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none"
                placeholder="e.g., Parties, Financial"
              />
            </div>
          </div>

          <div>
            <label className="font-mono text-xs text-ghost-600 uppercase block mb-2">
              Default Value
            </label>
            <input
              type="text"
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
              className="w-full border border-ghost-300 px-4 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none"
              placeholder="Default value (optional)"
            />
          </div>

          <div>
            <label className="font-mono text-xs text-ghost-600 uppercase block mb-2">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-ghost-300 px-4 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none"
              placeholder="Help text for users filling this variable"
            />
          </div>

          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                className="h-4 w-4 border-ghost-300 text-purple-900 focus:ring-purple-900"
              />
              <span className="font-mono text-sm text-ghost-700">
                Required field
              </span>
            </label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <button
            onClick={onClose}
            className="border border-ghost-300 px-4 py-2 font-mono text-xs hover:border-ghost-500"
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || !variableName || !variableLabel}
            className="border border-purple-900 bg-purple-900 text-white px-4 py-2 font-mono text-xs hover:bg-purple-800 disabled:opacity-50"
          >
            {isLoading ? 'SAVING...' : variable ? 'UPDATE' : 'ADD'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
