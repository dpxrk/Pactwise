// @ts-nocheck
"use client";

import React, { memo, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { VariableSizeList as List } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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

import type { Id } from "@/types/id.types";
import { VendorType } from "@/types/vendor.types";
import { useDebounce } from "@/hooks/useDebounce";

// ===== NEW: Use React Query for data + Zustand for UI state =====
import { useVendorList, useUpdateVendor, useDeleteVendor } from "@/hooks/queries/useVendors";
import {
  useVendorSelection,
  useVendorSearch,
  useVendorFilters,
  type VendorStatus,
  type VendorRiskLevel,
} from "@/stores/vendorUIStore";

import {
  Building,
  MoreVertical,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Plus,
  Loader2,
} from "lucide-react";

interface OptimizedVendorListProps {
  enterpriseId: Id<"enterprises">;
  initialStatus?: string;
}

// Memoized vendor row component
const VendorRow = memo(({
  vendor,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  isSelected,
  onSelectToggle,
  style,
}: {
  vendor: VendorType;
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
    inactive: "bg-gray-100 text-gray-800",
    pending: "bg-yellow-100 text-yellow-800",
  };

  const riskColors = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-red-100 text-red-800",
  };

  const RiskIcon = {
    low: CheckCircle,
    medium: AlertTriangle,
    high: XCircle,
  }[vendor.risk_level || "low"];

  return (
    <div style={style} className="flex items-center px-4 py-3 border-b hover:bg-gray-50 transition-colors">
      <div className="w-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelectToggle(vendor.id)}
          aria-label={`Select ${vendor.name}`}
        />
      </div>

      <div className="flex-1 grid grid-cols-7 gap-4 items-center">
        <div className="col-span-2">
          <button
            onClick={() => onView(vendor.id)}
            className="text-left hover:underline focus:outline-none focus:underline"
          >
            <p className="font-medium text-gray-900 truncate">{vendor.name}</p>
            <p className="text-sm text-gray-500 truncate">{vendor.category}</p>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Badge className={statusColors[vendor.status as keyof typeof statusColors] || "bg-gray-100"}>
            {vendor.status}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <RiskIcon className="w-4 h-4" />
          <Badge className={riskColors[vendor.risk_level as keyof typeof riskColors] || "bg-gray-100"}>
            {vendor.risk_level || "low"}
          </Badge>
        </div>

        <div className="text-sm text-gray-600">
          {/* Will need to calculate active contracts from contracts */}
          0 contracts
        </div>

        <div className="text-sm font-medium text-gray-900">
          ${((vendor.metadata?.total_spend || 0) / 1000).toFixed(1)}k
        </div>

        <div className="flex items-center gap-1">
          <div className="text-sm font-medium text-gray-900">
            {vendor.performance_score || 0}%
          </div>
          <div className="w-16 bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all"
              style={{ width: `${vendor.performance_score || 0}%` }}
            />
          </div>
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
            <DropdownMenuItem onClick={() => onView(vendor.id)}>
              <Eye className="mr-2 h-4 w-4" /> View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(vendor.id)}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onStatusChange(vendor.id, "inactive")}>
              <XCircle className="mr-2 h-4 w-4" /> Deactivate
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(vendor.id)}
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

VendorRow.displayName = "VendorRow";

// Main component
export const OptimizedVendorList: React.FC<OptimizedVendorListProps> = memo(({
  enterpriseId,
  initialStatus,
}) => {
  const router = useRouter();

  // ===== NEW: Use UI store for UI state =====
  const {
    selectedVendorIds,
    selectAll,
    deselectAll,
    toggleVendor,
  } = useVendorSelection();

  const {
    searchQuery,
    setSearchQuery,
  } = useVendorSearch();

  const {
    filters,
    setFilters,
  } = useVendorFilters();

  // Debounced search
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Initialize filters from props
  useEffect(() => {
    if (initialStatus && initialStatus !== "all") {
      setFilters({ status: initialStatus as VendorStatus });
    }
  }, [initialStatus, setFilters]);

  // ===== NEW: Use React Query for server data =====
  const {
    data: vendorsData,
    isLoading,
    error,
  } = useVendorList(enterpriseId, {
    status: filters.status !== 'all' ? filters.status : undefined,
    risk_level: filters.risk_level !== 'all' ? filters.risk_level : undefined,
    search: debouncedSearch || undefined,
    category: filters.category,
  });

  const vendors = vendorsData || [];

  // Mutations
  const updateVendorMutation = useUpdateVendor();
  const deleteVendorMutation = useDeleteVendor();

  // Calculate statistics
  const stats = useMemo(() => {
    const total = vendors.length;
    const active = vendors.filter(v => v.status === "active").length;
    const highRisk = vendors.filter(v => v.risk_level === "high").length;
    const totalSpend = vendors.reduce((sum, v) => sum + (v.metadata?.total_spend || 0), 0);
    const avgPerformance = vendors.length > 0
      ? vendors.reduce((sum, v) => sum + (v.performance_score || 0), 0) / vendors.length
      : 0;

    return { total, active, highRisk, totalSpend, avgPerformance };
  }, [vendors]);

  // Row height calculation
  const getItemSize = useCallback(() => 72, []);

  // Handlers
  const handleView = useCallback((id: string) => {
    router.push(`/dashboard/vendors/${id}`);
  }, [router]);

  const handleEdit = useCallback((id: string) => {
    router.push(`/dashboard/vendors/${id}/edit`);
  }, [router]);

  const handleDelete = useCallback(async (id: string) => {
    if (confirm("Are you sure you want to delete this vendor?")) {
      // Mutation already includes toast notification
      await deleteVendorMutation.mutateAsync(id);
    }
  }, [deleteVendorMutation]);

  const handleStatusChange = useCallback(async (id: string, status: string) => {
    // Mutation already includes toast notification
    await updateVendorMutation.mutateAsync({
      id,
      updates: { status: status as "active" | "inactive" | "pending" }
    });
  }, [updateVendorMutation]);

  const handleSelectToggle = useCallback((id: string) => {
    toggleVendor(id);
  }, [toggleVendor]);

  const handleSelectAll = useCallback(() => {
    if (selectedVendorIds.size === vendors.length) {
      deselectAll();
    } else {
      selectAll(vendors.map(v => v.id));
    }
  }, [vendors, selectedVendorIds.size, selectAll, deselectAll]);

  const handleBulkDelete = useCallback(async () => {
    if (confirm(`Delete ${selectedVendorIds.size} vendors?`)) {
      const count = selectedVendorIds.size;
      await Promise.all(
        Array.from(selectedVendorIds).map(id => deleteVendorMutation.mutateAsync(id))
      );
      deselectAll();
      // Individual mutations already show toast, show summary toast for bulk
      toast.success(`${count} vendors deleted`);
    }
  }, [selectedVendorIds, deleteVendorMutation, deselectAll]);

  // Row renderer
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const vendor = vendors[index];
    if (!vendor) return null;

    return (
      <VendorRow
        vendor={vendor}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
        isSelected={selectedVendorIds.has(vendor.id)}
        onSelectToggle={handleSelectToggle}
        style={style}
      />
    );
  }, [
    vendors,
    handleView,
    handleEdit,
    handleDelete,
    handleStatusChange,
    selectedVendorIds,
    handleSelectToggle,
  ]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load vendors: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      {/* Header with stats */}
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Vendors</h2>
          <div className="flex items-center gap-2">
            {selectedVendorIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {selectedVendorIds.size} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="text-red-600 hover:text-red-700"
                  disabled={deleteVendorMutation.isPending}
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
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Vendor
            </Button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-5 gap-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">Total Vendors</p>
            <p className="text-xl font-semibold">{stats.total}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">Active</p>
            <p className="text-xl font-semibold text-green-700">{stats.active}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">High Risk</p>
            <p className="text-xl font-semibold text-red-700">{stats.highRisk}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">Total Spend</p>
            <p className="text-xl font-semibold text-blue-700">
              ${(stats.totalSpend / 1000000).toFixed(1)}M
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">Avg Performance</p>
            <p className="text-xl font-semibold text-purple-700">
              {stats.avgPerformance.toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select
            value={filters.status}
            onValueChange={(value) => setFilters({ status: value as VendorStatus })}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.risk_level}
            onValueChange={(value) => setFilters({ risk_level: value as VendorRiskLevel })}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Risk Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risks</SelectItem>
              <SelectItem value="low">Low Risk</SelectItem>
              <SelectItem value="medium">Medium Risk</SelectItem>
              <SelectItem value="high">High Risk</SelectItem>
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
            checked={selectedVendorIds.size === vendors.length && vendors.length > 0}
            onCheckedChange={handleSelectAll}
            aria-label="Select all"
          />
        </div>
        <div className="flex-1 grid grid-cols-7 gap-4 text-sm font-medium text-gray-600">
          <div className="col-span-2">Vendor</div>
          <div>Status</div>
          <div>Risk Level</div>
          <div>Contracts</div>
          <div>Spend</div>
          <div>Performance</div>
        </div>
        <div className="w-10"></div>
      </div>

      {/* Virtualized list body */}
      <div className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : vendors.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Building className="h-12 w-12 mb-4 text-gray-300" />
            <p className="text-lg font-medium">No vendors found</p>
            <p className="text-sm">Try adjusting your filters or add a new vendor</p>
          </div>
        ) : (
          <AutoSizer>
            {({ height, width }) => (
              <List
                height={height}
                itemCount={vendors.length}
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

      {/* Mutation loading indicator */}
      {(updateVendorMutation.isPending || deleteVendorMutation.isPending) && (
        <div className="p-4 border-t flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      )}
    </Card>
  );
});

OptimizedVendorList.displayName = "OptimizedVendorList";

export default OptimizedVendorList;
