"use client";

import { useState } from "react";
// import { useMutation } from "convex/react";
// import { api } from "../../../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

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

// Mock useMutation hook
const useMutation = (mutation: any) => {
  return async (args: any) => {
    console.log("Mutation called with:", args);
    return Promise.resolve({ success: true });
  };
};

// Mock api object
const api = {
  templates: {
    contractTemplates: {
      createTemplate: (args: any) => { /* mock function */ }
    }
  }
};

export default function CreateTemplatePage() {
  const router = useRouter();
  const createTemplate = useMutation(api.templates.contractTemplates.createTemplate);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [contractType, setContractType] = useState("other");
  const [isPublic, setIsPublic] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [sections, setSections] = useState<TemplateSection[]>([
    {
      id: "1",
      title: "Introduction",
      content: "This agreement is entered into on {{date}} between {{party1}} and {{party2}}.",
      isRequired: true,
      variables: [],
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }

    if (sections.length === 0) {
      toast.error("Template must have at least one section");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createTemplate({
        name,
        description,
        category,
        contractType,
        content: {
          sections,
          metadata: {
            tags,
          },
        },
        isPublic,
        tags,
      });

      toast.success("Template created successfully");
      router.push("/dashboard/contracts/templates");
    } catch (error) {
      toast.error("Failed to create template");
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <h1 className="text-3xl font-bold">Create Contract Template</h1>
          <p className="text-muted-foreground mt-1">
            Create a reusable template for contracts
          </p>
        </div>
      </div>

      {/* Basic Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Provide basic details about your template
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
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating..." : "Create Template"}
        </Button>
      </div>
    </div>
  );
}
