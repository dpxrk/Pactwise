'use client'

import React, { useState } from "react";
import { Plus, X, Check, Edit2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useDashboardStore } from "../../../stores/dashboard-store";

interface VendorCategory {
  id: string;
  name: string;
  isDefault?: boolean;
}

interface VendorCategoriesProps {
  selectedCategory?: string;
  onCategoryChange: (category: string) => void;
}

export const VendorCategories: React.FC<VendorCategoriesProps> = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  selectedCategory: propSelectedCategory,
  onCategoryChange,
}) => {
  // Default categories that can't be removed
  const defaultCategories: VendorCategory[] = [
    { id: "all", name: "All Vendors", isDefault: true },
    { id: "active", name: "Active", isDefault: true },
    { id: "inactive", name: "Inactive", isDefault: true },
  ];

  // Use Zustand store for categories
  const { selectedType, setSelectedType } = useDashboardStore();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Use local state for categories but could be moved to Zustand if needed across components
  const [categories, setCategories] = useState<VendorCategory[]>([
    ...defaultCategories,
  ]);

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      const newCategory: VendorCategory = {
        id: `category-${Date.now()}`,
        name: newCategoryName.trim(),
      };
      setCategories([...categories, newCategory]);
      setNewCategoryName("");
      setIsAddingCategory(false);
      setIsDialogOpen(false);
    }
  };

  const handleEditCategory = (categoryId: string, newName: string) => {
    setCategories(
      categories.map((cat) =>
        cat.id === categoryId ? { ...cat, name: newName } : cat
      )
    );
    setEditingCategory(null);
  };

  const handleDeleteCategory = (categoryId: string) => {
    setCategories(categories.filter((cat) => cat.id !== categoryId));
    if (selectedType === categoryId) {
      setSelectedType("all");
      onCategoryChange("all");
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedType(categoryId);
    onCategoryChange(categoryId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Tabs value={selectedType} className="w-full">
          <TabsList className="flex overflow-visible bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            {categories.map((category) => (
              <TabsTrigger
                key={category.id}
                value={category.id}
                onClick={() => handleCategoryChange(category.id)}
                className="relative group flex items-center space-x-1 px-4 py-2"
              >
                <span className="relative">
                  {category.name}
                  {!category.isDefault && (
                    <div
                      className="absolute -top-8 -right-3 hidden group-hover:flex items-center space-x-1 z-50 
                                  transition-all duration-200 ease-in-out opacity-0 group-hover:opacity-100 
                                  scale-95 group-hover:scale-100 bg-background/80 rounded-md p-1 shadow-md"
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 p-1 bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm
                                 hover:bg-primary hover:text-primary-foreground
                                 transition-all duration-200 ease-in-out
                                 hover:scale-110 hover:-translate-y-0.5
                                 focus:scale-105 focus:ring-2 focus:ring-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCategory(category.id);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 p-1 bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm
                                 hover:bg-destructive hover:text-destructive-foreground
                                 transition-all duration-200 ease-in-out
                                 hover:scale-110 hover:-translate-y-0.5
                                 focus:scale-105 focus:ring-2 focus:ring-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(category.id);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 h-8 w-8 hover:scale-110 transition-transform duration-200 ease-in-out"
              onClick={() => setIsAddingCategory(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
            </DialogHeader>
            <div className="flex items-center space-x-2">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter category name"
                className="flex-1"
              />
              <Button onClick={handleAddCategory}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Category Dialog */}
      {editingCategory && (
        <Dialog
          open={!!editingCategory}
          onOpenChange={() => setEditingCategory(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
            </DialogHeader>
            <div className="flex items-center space-x-2">
              <Input
                value={
                  categories.find((cat) => cat.id === editingCategory)?.name ||
                  ""
                }
                onChange={(e) =>
                  handleEditCategory(editingCategory, e.target.value)
                }
                placeholder="Enter category name"
                className="flex-1"
              />
              <Button
                onClick={() => setEditingCategory(null)}
                className="shrink-0"
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default VendorCategories;
