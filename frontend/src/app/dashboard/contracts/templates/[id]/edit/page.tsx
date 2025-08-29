"use client";

import { ArrowLeft, Plus, Trash2, GripVertical, History } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Id } from '@/types/id.types';

// Mock Id type
type Id<T extends string> = string & { __tableName: T };

const TEMPLATE_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "nda", label: "Non-Disclosure Agreement" },
  { value: "service", label: "Service Agreement" },
  { value: "sales", label: "Sales Agreement" },
  { value: "employment", label: "Employment" },
  { value: "partnership", label: "Partnership" },
  { value: "licensing", label: "Licensing" },
  { value: "custom", label: "Custom" },
];

const CONTRACT_TYPES = [
  { value: "nda", label: "NDA" },
  { value: "msa", label: "Master Service Agreement" },
  { value: "sow", label: "Statement of Work" },
  { value: "saas", label: "SaaS Agreement" },
  { value: "lease", label: "Lease Agreement" },
  { value: "employment", label: "Employment Agreement" },
  { value: "partnership", label: "Partnership Agreement" },
  { value: "other", label: "Other" },
];

interface TemplateVariable {
  name: string;
  type: "text" | "date" | "number" | "select";
  defaultValue?: string;
  options?: string[];
  required: boolean;
  description?: string;
}

interface TemplateSection {
  id: string;
  title: string;
  content: string;
  isRequired: boolean;
  variables?: TemplateVariable[];
}

interface TemplateVersion {
  version: number;
  changes: string;
  createdAt: number;
}

interface Template {
  _id: Id<"contractTemplates">;
  name: string;
  description?: string;
  category: string;
  contractType: string;
  isPublic: boolean;
  tags: string[];
  content: { sections: TemplateSection[] };
  version: number;
  versions: TemplateVersion[];
}

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;

  // Mock data - replace with actual Supabase implementation
  const template: Template | undefined = undefined;
  const useQuery = (query: any, args: any) => ({ data: template });
  const useMutation = (mutation: any) => (args: any) => Promise.resolve();

  // const { data: templateData } = useQuery(api.templates.contractTemplates.getTemplate, {
  //   templateId: templateId as Id<"contractTemplates">,
  // });
  const templateData = null;

  // const updateTemplate = useMutation(api.templates.contractTemplates.updateTemplate);
  const updateTemplate = useMutation(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [contractType, setContractType] = useState("other");
  const [isPublic, setIsPublic] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showChangesDialog, setShowChangesDialog] = useState(false);
  const [changes, setChanges] = useState("");

  // Initialize form with template data
  useEffect(() => {
    if (templateData) {
      setName(templateData.name);
      setDescription(templateData.description || "");
      setCategory(templateData.category);
      setContractType(templateData.contractType);
      setIsPublic(templateData.isPublic);
      setTags(templateData.tags || []);
      setSections(templateData.content.sections);
    }
  }, [templateData]);

  const handleAddSection = () => {
    const newSection: TemplateSection = {
      id: Date.now().toString(),
      title: `Section ${sections.length + 1}`,
      content: "",
      isRequired: false,
      variables: [],
    };
    setSections([...sections, newSection]);
  };

  const handleUpdateSection = (id: string, updates: Partial<TemplateSection>) => {
    setSections(sections.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleDeleteSection = (id: string) => {
    if (sections.length === 1) {
      toast.error("Template must have at least one section");
      return;
    }
    setSections(sections.filter(s => s.id !== id));
  };

  const handleAddVariable = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    const newVariable: TemplateVariable = {
      name: `variable${Date.now()}`,
      type: "text",
      required: true,
    };

    handleUpdateSection(sectionId, {
      variables: [...(section.variables || []), newVariable],
    });
  };

  const handleUpdateVariable = (
    sectionId: string,
    varIndex: number,
    updates: Partial<TemplateVariable>
  ) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section || !section.variables) return;

    const updatedVariables = [...section.variables];
    updatedVariables[varIndex] = { ...updatedVariables[varIndex], ...updates };
    
    handleUpdateSection(sectionId, { variables: updatedVariables });
  };

  const handleDeleteVariable = (sectionId: string, varIndex: number) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section || !section.variables) return;

    const updatedVariables = section.variables.filter((_, i) => i !== varIndex);
    handleUpdateSection(sectionId, { variables: updatedVariables });
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleUpdate = () => {
    setShowChangesDialog(true);
  };

  const handleConfirmUpdate = async () => {
    if (!changes.trim()) {
      toast.error("Please describe the changes made");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateTemplate({
        templateId: templateId as Id<"contractTemplates">,
        name,
        description,
        content: {
          sections,
          metadata: {
            tags,
          },
        },
        isPublic,
        tags,
        changes,
      });

      toast.success("Template updated successfully");
      setShowChangesDialog(false);
      router.push("/dashboard/contracts/templates");
    } catch (error) {
      toast.error("Failed to update template");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!templateData) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-4">
          <Skeleton className="h-12 w-1/2" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Edit Contract Template</h1>
          <p className="text-muted-foreground mt-1">
            Update your contract template
          </p>
        </div>
        <Badge variant="outline">Version {templateData.version}</Badge>
      </div>

      {/* Version History */}
      {templateData.versions && templateData.versions.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-4 w-4" />
              Version History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {templateData.versions.slice(0, 3).map((version) => (
                <div key={version.version} className="flex justify-between text-sm">
                  <span>Version {version.version}</span>
                  <span className="text-muted-foreground">{version.changes}</span>
                  <span className="text-muted-foreground">
                    {new Date(version.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Basic Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Update basic details about your template
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Template Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Standard Service Agreement"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this template is for..."
              className="mt-1"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="contractType">Contract Type</Label>
              <Select value={contractType} onValueChange={setContractType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTRACT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="tags">Tags</Label>
            <div className="mt-1 space-y-2">
              <div className="flex gap-2">
                <Input
                  id="tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add a tag..."
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                />
                <Button type="button" onClick={handleAddTag} size="sm">
                  Add
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="public">Make Public</Label>
              <p className="text-sm text-muted-foreground">
                Allow other organizations to use this template
              </p>
            </div>
            <Switch
              id="public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>
        </CardContent>
      </Card>

      {/* Template Sections */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Template Sections</CardTitle>
          <CardDescription>
            Define the sections of your contract template. Use {"{{variable}}"} syntax
            to create dynamic fields.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sections.map((section, index) => (
            <Card key={section.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={section.title}
                    onChange={(e) => handleUpdateSection(section.id, { title: e.target.value })}
                    placeholder="Section Title"
                    className="font-semibold"
                  />
                  <div className="flex items-center gap-2 ml-auto">
                    <Label htmlFor={`required-${section.id}`} className="text-sm">
                      Required
                    </Label>
                    <Switch
                      id={`required-${section.id}`}
                      checked={section.isRequired}
                      onCheckedChange={(checked) =>
                        handleUpdateSection(section.id, { isRequired: checked })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteSection(section.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={section.content}
                  onChange={(e) => handleUpdateSection(section.id, { content: e.target.value })}
                  placeholder="Section content... Use {{variableName}} for dynamic fields"
                  rows={4}
                />

                {/* Variables */}
                {section.variables && section.variables.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm">Variables</Label>
                    {section.variables.map((variable, varIndex) => (
                      <div key={varIndex} className="flex gap-2 items-end">
                        <Input
                          value={variable.name}
                          onChange={(e) =>
                            handleUpdateVariable(section.id, varIndex, { name: e.target.value })
                          }
                          placeholder="Variable name"
                          className="flex-1"
                        />
                        <Select
                          value={variable.type}
                          onValueChange={(value: TemplateVariable['type']) =>
                            handleUpdateVariable(section.id, varIndex, { type: value })
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="select">Select</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteVariable(section.id, varIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddVariable(section.id)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Variable
                </Button>
              </CardContent>
            </Card>
          ))}

          <Button
            variant="outline"
            onClick={handleAddSection}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Section
          </Button>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          onClick={handleUpdate}
          disabled={isSubmitting}
        >
          Update Template
        </Button>
      </div>

      {/* Changes Dialog */}
      <Dialog open={showChangesDialog} onOpenChange={setShowChangesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Describe Your Changes</DialogTitle>
            <DialogDescription>
              Please describe what changes you made to this template. This helps track
              version history.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={changes}
              onChange={(e) => setChanges(e.target.value)}
              placeholder="e.g., Updated payment terms in section 3, added new termination clause"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowChangesDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmUpdate}
              disabled={isSubmitting || !changes.trim()}
            >
              {isSubmitting ? "Updating..." : "Confirm Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Mock API object for type safety
const api = {
  templates: {
    contractTemplates: {
      getTemplate: (args: { templateId: Id<"contractTemplates"> }) => ({ data: {} as Template | undefined }),
      updateTemplate: (args: any) => Promise.resolve(),
    },
  },
};
