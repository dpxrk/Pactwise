"use client";

import { useState } from "react";
// import { useQuery, useMutation } from "convex/react";
// import { api } from "../../../../convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, AlertCircle } from "lucide-react";
import { format } from "@/lib/date";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Budget {
  _id: string;
  name: string;
  totalBudget: number;
  allocatedAmount: number;
  startDate: string;
  endDate: string;
}

interface Contract {
  _id: string;
  title: string;
  value: number;
  startDate: string;
  endDate: string;
  vendorName?: string;
}

interface Allocation {
  _id: string;
  contractId: string;
  contractTitle: string;
  allocatedAmount: number;
  budgetId: string;
  vendorName?: string;
  allocationType: 'full' | 'prorated' | 'custom';
}

interface BudgetAllocationDialogProps {
  budget: Budget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BudgetAllocationDialog({
  budget,
  open,
  onOpenChange,
}: BudgetAllocationDialogProps) {
  const [selectedContracts, setSelectedContracts] = useState<Set<string>>(new Set());
  const [allocationType, setAllocationType] = useState<"full" | "prorated" | "custom">("prorated");
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock unallocated contracts - replace with Supabase implementation
  const unallocatedContracts: Contract[] = [
    { _id: '1', title: 'Software License Agreement', value: 25000, startDate: '2024-01-01', endDate: '2024-12-31' },
    { _id: '2', title: 'Marketing Services Contract', value: 15000, startDate: '2024-02-01', endDate: '2024-11-30' },
    { _id: '3', title: 'Consulting Agreement', value: 35000, startDate: '2024-03-01', endDate: '2024-12-31' }
  ];

  // Mock current allocations - replace with Supabase implementation
  const currentAllocations: Allocation[] = [
    { _id: 'alloc1', contractId: '4', contractTitle: 'Office Lease', allocatedAmount: 50000, budgetId: budget._id, allocationType: 'full' },
    { _id: 'alloc2', contractId: '5', contractTitle: 'Equipment Purchase', allocatedAmount: 20000, budgetId: budget._id, allocationType: 'full' }
  ];

  // Mock allocation mutations - replace with Supabase implementation
  const allocateContracts = async (params: { budgetId: string; allocations: { contractId: string; allocatedAmount: number; allocationType: string; }[] }) => {
    console.log('Allocating contracts:', params);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true };
  };
  
  const removeAllocation = async (params: { allocationId: string }) => {
    console.log('Removing allocation:', params);
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true };
  };

  const availableBudget = budget.totalBudget - budget.allocatedAmount;

  const calculateAllocation = (contract: Contract) => {
    if (allocationType === "full") {
      return contract.value || 0;
    } else if (allocationType === "prorated") {
      // Calculate prorated amount based on budget period overlap
      const contractStart = new Date(contract.startDate || budget.startDate);
      const contractEnd = new Date(contract.endDate || budget.endDate);
      const budgetStart = new Date(budget.startDate);
      const budgetEnd = new Date(budget.endDate);

      const overlapStart = contractStart > budgetStart ? contractStart : budgetStart;
      const overlapEnd = contractEnd < budgetEnd ? contractEnd : budgetEnd;

      if (overlapStart > overlapEnd) return 0;

      const overlapDays = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24));
      const contractDays = Math.ceil((contractEnd.getTime() - contractStart.getTime()) / (1000 * 60 * 60 * 24));

      return (contract.value || 0) * (overlapDays / contractDays);
    } else {
      return parseFloat(customAmounts[contract._id] || "0");
    }
  };

  const getTotalAllocation = () => {
    if (!unallocatedContracts) return 0;
    
    return Array.from(selectedContracts).reduce((total, contractId) => {
      const contract = unallocatedContracts.find(c => c._id === contractId);
      if (!contract) return total;
      return total + calculateAllocation(contract);
    }, 0);
  };

  const handleAllocate = async () => {
    if (selectedContracts.size === 0) {
      toast.error("Please select at least one contract");
      return;
    }

    const totalAllocation = getTotalAllocation();
    if (totalAllocation > availableBudget) {
      toast.error("Total allocation exceeds available budget");
      return;
    }

    setIsSubmitting(true);
    try {
      const allocations = Array.from(selectedContracts).map(contractId => {
        const contract = unallocatedContracts?.find(c => c._id === contractId);
        if (!contract) throw new Error("Contract not found");

        return {
          contractId,
          allocatedAmount: calculateAllocation(contract),
          allocationType,
        };
      });

      await allocateContracts({
        budgetId: budget._id,
        allocations,
      });

      toast.success(`Allocated ${allocations.length} contracts to budget`);
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to allocate contracts");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAllocation = async (allocationId: string) => {
    try {
      await removeAllocation({ allocationId });
      toast.success("Allocation removed");
    } catch (err) {
      toast.error("Failed to remove allocation");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Manage Budget Allocations</DialogTitle>
          <DialogDescription>
            Allocate contracts to {budget.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Budget Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">${budget.totalBudget.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Total Budget</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">
                  ${budget.allocatedAmount.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Allocated</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">
                  ${availableBudget.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Available</p>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Current Allocations */}
          {currentAllocations && currentAllocations.length > 0 && (
            <>
              <div>
                <h3 className="text-sm font-medium mb-3">Current Allocations</h3>
                <ScrollArea className="h-48">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contract</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentAllocations.map((allocation) => (
                        <TableRow key={allocation._id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{allocation.contractTitle}</p>
                              <p className="text-xs text-muted-foreground">
                                {allocation.vendorName || "No vendor"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {allocation.allocationType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            ${allocation.allocatedAmount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveAllocation(allocation._id)}
                            >
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
              <Separator />
            </>
          )}

          {/* Allocation Type */}
          <div>
            <Label>Allocation Method</Label>
            <Select value={allocationType} onValueChange={(value: "full" | "prorated" | "custom") => setAllocationType(value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full Contract Value</SelectItem>
                <SelectItem value="prorated">Prorated (Based on Period)</SelectItem>
                <SelectItem value="custom">Custom Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Unallocated Contracts */}
          <div>
            <h3 className="text-sm font-medium mb-3">Available Contracts</h3>
            {unallocatedContracts && unallocatedContracts.length > 0 ? (
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {unallocatedContracts.map((contract) => {
                    const allocation = calculateAllocation(contract);
                    const isSelected = selectedContracts.has(contract._id);
                    
                    return (
                      <div
                        key={contract._id}
                        className={cn(
                          "flex items-center space-x-3 p-3 rounded-lg border",
                          isSelected && "bg-accent"
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked: boolean) => {
                            const newSelected = new Set(selectedContracts);
                            if (checked) {
                              newSelected.add(contract._id);
                            } else {
                              newSelected.delete(contract._id);
                            }
                            setSelectedContracts(newSelected);
                          }}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{contract.title}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{contract.vendorName || "No vendor"}</span>
                            <span>•</span>
                            <span>${contract.value?.toLocaleString() || 0}</span>
                            <span>•</span>
                            <span>
                              {contract.startDate && format(new Date(contract.startDate), "MMM d, yyyy")} - 
                              {contract.endDate && format(new Date(contract.endDate), "MMM d, yyyy")}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          {allocationType === "custom" ? (
                            <Input
                              type="number"
                              value={customAmounts[contract._id] || ""}
                              onChange={(e) => setCustomAmounts({
                                ...customAmounts,
                                [contract._id]: e.target.value
                              })}
                              placeholder="0.00"
                              className="w-32 text-right"
                              disabled={!isSelected}
                            />
                          ) : (
                            <div>
                              <p className="font-medium">${allocation.toLocaleString()}</p>
                              {allocationType === "prorated" && (
                                <p className="text-xs text-muted-foreground">prorated</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No unallocated contracts available for this budget period.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Total Allocation */}
          {selectedContracts.size > 0 && (
            <Alert>
              <DollarSign className="h-4 w-4" />
              <AlertDescription>
                Total allocation: ${getTotalAllocation().toLocaleString()} 
                {getTotalAllocation() > availableBudget && (
                  <span className="text-red-600 ml-2">
                    (Exceeds available budget by ${(getTotalAllocation() - availableBudget).toLocaleString()})
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAllocate}
            disabled={
              isSubmitting ||
              selectedContracts.size === 0 ||
              getTotalAllocation() > availableBudget
            }
          >
            {isSubmitting ? "Allocating..." : `Allocate ${selectedContracts.size} Contracts`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Card component (since it's used but not imported)
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}>
      {children}
    </div>
  );
}

function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("p-6", className)}>{children}</div>;
}
