"use client";

import { useState } from "react";
// import { useQuery, useMutation } from "convex/react";
// import { api } from "../../../../../convex/_generated/api";
import { Plus, Copy, Edit, Trash2, FileText, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/premium";

export default function ContractTemplatesPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [includePublic, setIncludePublic] = useState(true);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

  // Fetch templates
  const templates = useQuery(api.templates.contractTemplates.getTemplates, {
    category: selectedCategory === "all" ? undefined : selectedCategory,
    includePublic,
    searchTerm: searchTerm || undefined,
  });

  // Fetch categories
  const categories = useQuery(api.templates.contractTemplates.getTemplateCategories);

  // Mutations
  const deleteTemplate = useMutation(api.templates.contractTemplates.deleteTemplate);
  const cloneTemplate = useMutation(api.templates.contractTemplates.cloneTemplate);

  const handleDelete = async () => {
    if (!deleteTemplateId) return;

    try {
      await deleteTemplate({ templateId: deleteTemplateId as any });
      toast.success("Template deleted successfully");
      setDeleteTemplateId(null);
    } catch (error) {
      toast.error("Failed to delete template");
    }
  };

  const handleClone = async (templateId: string, currentName: string) => {
    try {
      const result = await cloneTemplate({
        templateId: templateId as any,
        newName: `${currentName} (Copy)`,
      });
      toast.success("Template cloned successfully");
      router.push(`/dashboard/contracts/templates/${result.id}/edit`);
    } catch (error) {
      toast.error("Failed to clone template");
    }
  };

  const handleCreateNew = () => {
    router.push("/dashboard/contracts/templates/new");
  };

  const handleEdit = (templateId: string) => {
    router.push(`/dashboard/contracts/templates/${templateId}/edit`);
  };

  const handleUseTemplate = (templateId: string) => {
    router.push(`/dashboard/contracts/new?templateId=${templateId}`);
  };

  if (!templates || !categories) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="h-64">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contract Templates</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage reusable contract templates
          </p>
        </div>
        <Button onClick={handleCreateNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Template
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.category} value={cat.category}>
                    {cat.label} ({cat.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={includePublic ? "default" : "outline"}
              onClick={() => setIncludePublic(!includePublic)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              {includePublic ? "Showing Public" : "Private Only"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No templates found"
          description={
            searchTerm || selectedCategory !== "all"
              ? "Try adjusting your filters"
              : "Create your first template to get started"
          }
          action={
            searchTerm || selectedCategory !== "all" ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("all");
                }}
              >
                Clear Filters
              </Button>
            ) : (
              <Button onClick={handleCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card
              key={template._id}
              className="group hover:shadow-lg transition-all duration-200 relative overflow-hidden"
            >
              {!template.isOwn && (
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary">Public</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle className="flex items-start justify-between">
                  <span className="truncate pr-2">{template.name}</span>
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {template.description || "No description"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{template.category}</Badge>
                  <Badge variant="outline">{template.contractType}</Badge>
                  {template.version > 1 && (
                    <Badge variant="outline">v{template.version}</Badge>
                  )}
                </div>

                <div className="text-sm text-muted-foreground">
                  <p>Used {template.usageCount} times</p>
                  <p>By {template.creatorName}</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleUseTemplate(template._id)}
                  >
                    Use Template
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleClone(template._id, template.name)}
                    title="Clone template"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  {template.isOwn && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(template._id)}
                        title="Edit template"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteTemplateId(template._id)}
                        title="Delete template"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTemplateId}
        onOpenChange={() => setDeleteTemplateId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}