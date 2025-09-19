"use client";

import React, { memo, useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { VariableSizeList as List } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { format } from "@/lib/date";
import type { Id } from "@/types/id.types";
import { ContractType } from "@/types/contract.types";
import { useContractInfiniteList, useDeleteContract, useUpdateContract } from "@/hooks/queries/useContracts";
import { useDashboardSearchQuery, useDashboardSelectedType, useDashboardActions } from "@/stores/dashboard-store-optimized";
import { useDebounce } from "@/hooks/useDebounce";

import {
  FileText,
  MoreVertical,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash,
  Archive,
  CheckCircle,
  Clock,
  XCircle,
  FileX,
  AlertCircle,
  ChevronDown,
  Loader2,
} from "lucide-react";

interface OptimizedContractListProps {
  enterpriseId: Id<"enterprises">;
  initialStatus?: string;
}

// Memoized contract row component
const ContractRow = memo(({ 
  contract, 
  onView, 
  onEdit, 
  onDelete,
  onStatusChange,
  isSelected,
  onSelectToggle,
  style,
}: {
  contract: ContractType;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  isSelected: boolean;
  onSelectToggle: (id: string) => void;
  style: React.CSSProperties;
}) => {
  const statusColors = {
    active: "bg-green-100 text-green-800",
    draft: "bg-gray-100 text-gray-800",
    pending: "bg-yellow-100 text-yellow-800",
    expired: "bg-red-100 text-red-800",
    terminated: "bg-orange-100 text-orange-800",
    archived: "bg-purple-100 text-purple-800",
  };

  const StatusIcon = {
    active: CheckCircle,
    draft: FileText,
    pending: Clock,
    expired: XCircle,
    terminated: FileX,
    archived: Archive,
  }[contract.status] || AlertCircle;

  return (
    <div style={style} className="flex items-center px-4 py-3 border-b hover:bg-gray-50 transition-colors">
      <div className="w-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelectToggle(contract._id)}
          aria-label={`Select ${contract.title}`}
        />
      </div>
      
      <div className="flex-1 grid grid-cols-6 gap-4 items-center">
        <div className="col-span-2">
          <button
            onClick={() => onView(contract._id)}
            className="text-left hover:underline focus:outline-none focus:underline"
          >
            <p className="font-medium text-gray-900 truncate">{contract.title}</p>
            <p className="text-sm text-gray-500 truncate">
              {contract.vendor?.name || "No vendor"}
            </p>
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <StatusIcon className="w-4 h-4" />
          <Badge className={statusColors[contract.status as keyof typeof statusColors] || "bg-gray-100"}>
            {contract.status}
          </Badge>
        </div>
        
        <div className="text-sm text-gray-600">
          {contract.contractType || "N/A"}
        </div>
        
        <div className="text-sm text-gray-600">
          {contract.extractedPricing || contract.value || "—"}
        </div>
        
        <div className="text-sm text-gray-500">
          {contract.extractedEndDate 
            ? format(new Date(contract.extractedEndDate), "MMM dd, yyyy")
            : "—"}
        </div>
      </div>
      
      <div className="w-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(contract._id)}>
              <Eye className="mr-2 h-4 w-4" /> View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(contract._id)}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onStatusChange(contract._id, "archived")}>
              <Archive className="mr-2 h-4 w-4" /> Archive
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete(contract._id)}
              className="text-red-600"
            >
              <Trash className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

ContractRow.displayName = "ContractRow";

// Main component
export const OptimizedContractList: React.FC<OptimizedContractListProps> = memo(({ 
  enterpriseId, 
  initialStatus 
}) => {
  const router = useRouter();
  
  // Local state for selection
  const [selectedContracts, setSelectedContracts] = useState<Set<string>>(new Set());
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  
  // Use optimized store hooks
  const searchQuery = useDashboardSearchQuery();
  const selectedType = useDashboardSelectedType();
  const { setSearchQuery, setSelectedType } = useDashboardActions();
  
  // Debounced search
  const debouncedSearch = useDebounce(localSearchQuery, 300);
  
  // React Query hooks
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useContractInfiniteList(
    enterpriseId,
    {
      status: selectedType === "All Contracts" ? undefined : selectedType.toLowerCase(),
      search: debouncedSearch,
    },
    20 // Page size
  );
  
  const deleteContract = useDeleteContract();
  const updateContract = useUpdateContract();
  
  // Flatten pages of contracts
  const contracts = useMemo(() => 
    data?.pages.flatMap(page => page.contracts) || [],
    [data]
  );
  
  // Calculate row heights (can be dynamic based on content)
  const getItemSize = useCallback(() => 72, []); // Fixed height for simplicity
  
  // Handle actions
  const handleView = useCallback((id: string) => {
    router.push(`/dashboard/contracts/${id}`);
  }, [router]);
  
  const handleEdit = useCallback((id: string) => {
    router.push(`/dashboard/contracts/${id}/edit`);
  }, [router]);
  
  const handleDelete = useCallback(async (id: string) => {
    if (confirm("Are you sure you want to delete this contract?")) {
      await deleteContract.mutateAsync(id);
    }
  }, [deleteContract]);
  
  const handleStatusChange = useCallback(async (id: string, status: string) => {
    await updateContract.mutateAsync({ id, updates: { status } });
  }, [updateContract]);
  
  const handleSelectToggle = useCallback((id: string) => {
    setSelectedContracts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);
  
  const handleSelectAll = useCallback(() => {
    if (selectedContracts.size === contracts.length) {
      setSelectedContracts(new Set());
    } else {
      setSelectedContracts(new Set(contracts.map(c => c._id)));
    }
  }, [contracts, selectedContracts.size]);
  
  // Handle bulk actions
  const handleBulkDelete = useCallback(async () => {
    if (confirm(`Delete ${selectedContracts.size} contracts?`)) {
      await Promise.all(
        Array.from(selectedContracts).map(id => deleteContract.mutateAsync(id))
      );
      setSelectedContracts(new Set());
    }
  }, [selectedContracts, deleteContract]);
  
  // Row renderer for virtual list
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const contract = contracts[index];
    if (!contract) return null;
    
    // Load more when reaching the end
    if (index === contracts.length - 5 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
    
    return (
      <ContractRow
        contract={contract}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
        isSelected={selectedContracts.has(contract._id)}
        onSelectToggle={handleSelectToggle}
        style={style}
      />
    );
  }, [
    contracts, 
    hasNextPage, 
    isFetchingNextPage, 
    fetchNextPage,
    handleView, 
    handleEdit, 
    handleDelete, 
    handleStatusChange,
    selectedContracts, 
    handleSelectToggle
  ]);
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load contracts: {error.message}
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <Card className="h-full flex flex-col">
      {/* Header with filters */}
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Contracts</h2>
          <div className="flex items-center gap-2">
            {selectedContracts.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {selectedContracts.size} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            )}
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search contracts..."
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Contracts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Contracts">All Contracts</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="terminated">Terminated</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Table header */}
      <div className="px-4 py-2 border-b bg-gray-50 flex items-center">
        <div className="w-10">
          <Checkbox
            checked={selectedContracts.size === contracts.length && contracts.length > 0}
            onCheckedChange={handleSelectAll}
            aria-label="Select all"
          />
        </div>
        <div className="flex-1 grid grid-cols-6 gap-4 text-sm font-medium text-gray-600">
          <div className="col-span-2">Contract</div>
          <div>Status</div>
          <div>Type</div>
          <div>Value</div>
          <div>Expiry</div>
        </div>
        <div className="w-10"></div>
      </div>
      
      {/* Virtualized list body */}
      <div className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : contracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <FileText className="h-12 w-12 mb-4 text-gray-300" />
            <p className="text-lg font-medium">No contracts found</p>
            <p className="text-sm">Try adjusting your filters or add a new contract</p>
          </div>
        ) : (
          <AutoSizer>
            {({ height, width }) => (
              <List
                height={height}
                itemCount={contracts.length}
                itemSize={getItemSize}
                width={width}
                overscanCount={5}
              >
                {Row}
              </List>
            )}
          </AutoSizer>
        )}
      </div>
      
      {/* Loading more indicator */}
      {isFetchingNextPage && (
        <div className="p-4 border-t flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      )}
    </Card>
  );
});

OptimizedContractList.displayName = "OptimizedContractList";

export default OptimizedContractList;