"use client";

import { CalendarIcon, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBudgetMutations } from '@/hooks/useBudgets';
import { useDepartments } from '@/hooks/useDepartments';
import { format, addMonths, startOfMonth, endOfMonth } from "@/lib/date";
import { cn } from "@/lib/utils";
import { Tables } from '@/types/database.types';



interface CreateBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type BudgetType = "annual" | "quarterly" | "monthly" | "project" | "department";

type Department = Tables<'departments'>;

interface FormData {
  name: string;
  budgetType: BudgetType;
  departmentId: string;
  totalBudget: string;
  description: string;
}

export function CreateBudgetDialog({ open, onOpenChange }: CreateBudgetDialogProps) {
  // Use Supabase hooks
  const { createBudget, isLoading: isCreating } = useBudgetMutations();
  const { departments, isLoading: isDepartmentsLoading } = useDepartments();

  const [formData, setFormData] = useState<FormData>({
    name: "",
    budgetType: "monthly",
    departmentId: "",
    totalBudget: "",
    description: "",
  });

  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>(() => {
    const today = new Date();
    return {
      from: startOfMonth(today),
      to: endOfMonth(today),
    };
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name || !formData.totalBudget || !dateRange.from || !dateRange.to) {
      toast.error("Please fill in all required fields");
      return;
    }

    const budget = parseFloat(formData.totalBudget);
    if (isNaN(budget) || budget <= 0) {
      toast.error("Please enter a valid budget amount");
      return;
    }

    setIsSubmitting(true);
    try {
      await createBudget({
        name: formData.name,
        budgetType: formData.budgetType,
        departmentId: formData.departmentId || undefined,
        totalBudget: budget,
        startDate: format(dateRange.from, "yyyy-MM-dd"),
        endDate: format(dateRange.to, "yyyy-MM-dd"),
        description: formData.description || undefined,
      });

      toast.success("Budget created successfully");
      onOpenChange(false);
      
      // Reset form
      setFormData({
        name: "",
        budgetType: "monthly",
        departmentId: "",
        totalBudget: "",
        description: "",
      });
    } catch (error) {
      toast.error("Failed to create budget");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBudgetTypeChange = (type: BudgetType) => {
    setFormData({ ...formData, budgetType: type });
    
    // Auto-adjust date range based on budget type
    const today = new Date();
    switch (type) {
      case "annual":
        setDateRange({
          from: new Date(today.getFullYear(), 0, 1),
          to: new Date(today.getFullYear(), 11, 31),
        });
        break;
      case "quarterly":
        const quarter = Math.floor(today.getMonth() / 3);
        setDateRange({
          from: new Date(today.getFullYear(), quarter * 3, 1),
          to: new Date(today.getFullYear(), quarter * 3 + 2, 31),
        });
        break;
      case "monthly":
        setDateRange({
          from: startOfMonth(today),
          to: endOfMonth(today),
        });
        break;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Budget</DialogTitle>
          <DialogDescription>
            Set up a budget to track contract spending
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Budget Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Q1 Marketing Budget"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="type">Budget Type *</Label>
            <Select
              value={formData.budgetType}
              onValueChange={(value: BudgetType) => handleBudgetTypeChange(value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="annual">Annual</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="project">Project-based</SelectItem>
                <SelectItem value="department">Department</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.budgetType === "department" && departments && (
            <div>
              <Label htmlFor="department">Department</Label>
              <Select
                value={formData.departmentId}
                onValueChange={(value) =>
                  setFormData({ ...formData, departmentId: value })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="amount">Total Budget Amount *</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="amount"
                type="number"
                value={formData.totalBudget}
                onChange={(e) =>
                  setFormData({ ...formData, totalBudget: e.target.value })
                }
                placeholder="0.00"
                className="pl-7"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          <div>
            <Label>Budget Period *</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      format(dateRange.from, "PP")
                    ) : (
                      <span>Start date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) =>
                      setDateRange({ ...dateRange, from: date })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? (
                      format(dateRange.to, "PP")
                    ) : (
                      <span>End date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) =>
                      setDateRange({ ...dateRange, to: date })
                    }
                    disabled={(date) =>
                      dateRange.from ? date < dateRange.from : false
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Additional notes about this budget..."
              className="mt-1"
              rows={3}
            />
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Once created, you can allocate this budget to specific contracts.
              The budget will automatically track spending based on contract values
              and payment schedules.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Budget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
