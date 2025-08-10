'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
// import { api } from '../../../../convex/_generated/api';
// import { Id } from '../../../../convex/_generated/dataModel';
import type { ContractStatus } from '@/types/contract.types';
import type { ContractEntity } from '@/types/core-entities';
import { useAuth } from '@/contexts/AuthContext';

// UI Components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Icons
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Eye,
  Edit,
  FileText,
  Calendar,
  Building,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContractTableProps {
  onContractSelect?: (contractId: Id<"contracts">) => void;
  statusFilter?: ContractStatus;
  showSearch?: boolean;
  showFilters?: boolean;
  pageSize?: number;
}

type SortField = 'title' | 'status' | 'vendorName' | 'createdAt' | 'extractedEndDate';
type SortDirection = 'asc' | 'desc';

// Status color mapping
const statusColors: Record<ContractStatus, string> = {
  draft: 'bg-blue-100 text-blue-800 dark:bg-blue-900/70 dark:text-blue-300',
  pending_analysis: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/70 dark:text-yellow-300',
  active: 'bg-green-100 text-green-800 dark:bg-green-900/70 dark:text-green-300',
  expired: 'bg-red-100 text-red-800 dark:bg-red-900/70 dark:text-red-300',
  terminated: 'bg-orange-100 text-orange-800 dark:bg-orange-900/70 dark:text-orange-300',
  archived: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
};

export const ContractTable = ({
  onContractSelect,
  statusFilter,
  showSearch = true,
  showFilters = true,
  pageSize = 10
}: ContractTableProps) => {
  const router = useRouter();
  const { user, userProfile, isLoading } = useAuth();
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ContractStatus | 'all'>(statusFilter || 'all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Get enterpriseId from user metadata
  const enterpriseId = clerkUser?.publicMetadata?.enterpriseId as Id<"enterprises"> | undefined;

  // Fetch contracts
    const data = null;
  const isLoading = false;
  const error = null;
//     api.contracts.getContracts,
    (enterpriseId) ? { enterpriseId } : "skip"
  );

  // Memoized filtered and sorted contracts
  const processedContracts = useMemo(() => {
    if (!contracts) return [];
    
    const contractsList = Array.isArray(contracts) ? contracts : contracts.contracts || [];

    const filtered = contractsList.filter((contract: ContractEntity) => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesTitle = contract.title.toLowerCase().includes(searchLower);
        const matchesVendor = contract.vendor?.name.toLowerCase().includes(searchLower);
        const matchesType = contract.contractType?.toLowerCase().includes(searchLower);
        
        if (!matchesTitle && !matchesVendor && !matchesType) {
          return false;
        }
      }

      // Status filter
      if (selectedStatus !== 'all' && contract.status !== selectedStatus) {
        return false;
      }

      return true;
    });

    // Sort contracts
    filtered.sort((a: ContractEntity, b: ContractEntity) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'vendorName':
          aValue = a.vendor?.name.toLowerCase() || '';
          bValue = b.vendor?.name.toLowerCase() || '';
          break;
        case 'createdAt':
          aValue = a._creationTime || 0;
          bValue = b._creationTime || 0;
          break;
        case 'extractedEndDate':
          aValue = a.extractedEndDate ? new Date(a.extractedEndDate).getTime() : 0;
          bValue = b.extractedEndDate ? new Date(b.extractedEndDate).getTime() : 0;
          break;
        default:
          aValue = 0;
          bValue = 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [contracts, searchTerm, selectedStatus, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(processedContracts.length / pageSize);
  const paginatedContracts = processedContracts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Handlers
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleView = (contractId: Id<"contracts">) => {
    if (onContractSelect) {
      onContractSelect(contractId);
    } else {
      // Navigate to contract details page if no custom handler
      router.push(`/dashboard/contracts/${contractId}`);
    }
  };

  const handleEdit = (contractId: Id<"contracts">) => {
    router.push(`/dashboard/contracts/edit/${contractId}`);
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(isNaN(Number(dateString)) ? dateString : Number(dateString));
      if (isNaN(date.getTime())) return 'N/A';
      return format(date, 'MMM dd, yyyy');
    } catch {
      return 'N/A';
    }
  };

  const formatStatusLabel = (status: string): string => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <SortAsc className="h-4 w-4 ml-1" /> : 
      <SortDesc className="h-4 w-4 ml-1" />;
  };

  if (false) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!enterpriseId) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Enterprise information is missing. Please contact support.
        </AlertDescription>
      </Alert>
    );
  }

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
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Contracts ({processedContracts.length})
          </CardTitle>
          
          {/* Search and Filters */}
          {(showSearch || showFilters) && (
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {showSearch && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search contracts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-full sm:w-64"
                  />
                </div>
              )}
              
              {showFilters && (
                <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as ContractStatus | 'all')}>
                  <SelectTrigger className="w-full sm:w-40">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending_analysis">Pending Analysis</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            <span className="ml-3 text-muted-foreground">Loading contracts...</span>
          </div>
        ) : paginatedContracts.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No contracts found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchTerm || selectedStatus !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Get started by creating your first contract'}
            </p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-accent/60 hover:scale-[1.02] select-none transition-all duration-200 ease-out"
                      onClick={() => handleSort('title')}
                    >
                      <div className="flex items-center">
                        Contract Title
                        <SortIcon field="title" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-accent/60 hover:scale-[1.02] select-none transition-all duration-200 ease-out"
                      onClick={() => handleSort('vendorName')}
                    >
                      <div className="flex items-center">
                        Vendor
                        <SortIcon field="vendorName" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-accent/60 hover:scale-[1.02] select-none transition-all duration-200 ease-out"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center">
                        Status
                        <SortIcon field="status" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-accent/60 hover:scale-[1.02] select-none transition-all duration-200 ease-out"
                      onClick={() => handleSort('extractedEndDate')}
                    >
                      <div className="flex items-center">
                        End Date
                        <SortIcon field="extractedEndDate" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-accent/60 hover:scale-[1.02] select-none transition-all duration-200 ease-out"
                      onClick={() => handleSort('createdAt')}
                    >
                      <div className="flex items-center">
                        Created
                        <SortIcon field="createdAt" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedContracts.map((contract: ContractEntity) => (
                    <TableRow key={contract._id} className="hover:bg-accent/50 hover:shadow-md hover:scale-[1.005] transition-all duration-200 ease-out cursor-pointer group">
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground truncate max-w-xs">
                            {contract.title}
                          </span>
                          {contract.contractType && (
                            <span className="text-xs text-muted-foreground">
                              {formatStatusLabel(contract.contractType)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate max-w-xs">
                            {contract.vendor?.name || 'Unknown Vendor'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(statusColors[contract.status as ContractStatus] || statusColors.draft, "text-xs")}>
                          {formatStatusLabel(contract.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(contract.extractedEndDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {formatDate(contract._creationTime?.toString())}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(contract._id)}
                            className="h-8 w-8 p-0 hover:bg-primary/10 hover:scale-110 transition-all duration-200 ease-out"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(contract._id)}
                            className="h-8 w-8 p-0 hover:bg-primary/10 hover:scale-110 transition-all duration-200 ease-out"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, processedContracts.length)} of {processedContracts.length} contracts
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default React.memo(ContractTable);