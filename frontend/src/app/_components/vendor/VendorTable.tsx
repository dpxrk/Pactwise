'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format } from '@/lib/date';
// import { api } from '../../../../convex/_generated/api';
// import { Id } from '../../../../convex/_generated/dataModel';
import type { VendorCategory } from '@/types/vendor.types';
import type { VendorEntity } from '@/types/core-entities';
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
import { Progress } from "@/components/ui/progress";

// Icons
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Eye,
  Edit,
  Building,
  Mail,
  Phone,
  Globe,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface VendorTableProps {
  onVendorSelect?: (vendorId: Id<"vendors">) => void;
  statusFilter?: "active" | "inactive" | "pending";
  categoryFilter?: VendorCategory;
  showSearch?: boolean;
  showFilters?: boolean;
  pageSize?: number;
}

type SortField = 'name' | 'category' | 'status' | 'createdAt' | 'total_spend' | 'compliance_score' | 'risk_level';
type SortDirection = 'asc' | 'desc';

// Status color mapping
const statusColors = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/70 dark:text-green-300',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/70 dark:text-yellow-300',
};

// Risk level colors
const riskColors = {
  low: 'text-green-600',
  medium: 'text-yellow-600',
  high: 'text-red-600',
};

// Category colors
const categoryColors: Record<string, string> = {
  technology: 'bg-blue-100 text-blue-800 dark:bg-blue-900/70 dark:text-blue-300',
  marketing: 'bg-purple-100 text-purple-800 dark:bg-purple-900/70 dark:text-purple-300',
  legal: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/70 dark:text-indigo-300',
  finance: 'bg-green-100 text-green-800 dark:bg-green-900/70 dark:text-green-300',
  hr: 'bg-pink-100 text-pink-800 dark:bg-pink-900/70 dark:text-pink-300',
  facilities: 'bg-orange-100 text-orange-800 dark:bg-orange-900/70 dark:text-orange-300',
  logistics: 'bg-teal-100 text-teal-800 dark:bg-teal-900/70 dark:text-teal-300',
  manufacturing: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
  consulting: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/70 dark:text-cyan-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export const VendorTable = ({
  onVendorSelect,
  statusFilter,
  categoryFilter,
  showSearch = true,
  showFilters = true,
  pageSize = 10
}: VendorTableProps) => {
  const router = useRouter();
  const { user, userProfile, isLoading } = useAuth();
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<"active" | "inactive" | "pending" | "all">(statusFilter || 'all');
  const [selectedCategory, setSelectedCategory] = useState<VendorCategory | "all">(categoryFilter || 'all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Get enterpriseId from user metadata
  const enterpriseId = clerkUser?.publicMetadata?.enterpriseId as Id<"enterprises"> | undefined;

  // Fetch vendors
    const data = null;
  const isLoading = false;
  const error = null;
//     api.vendors.getVendors,
    (enterpriseId) ? { enterpriseId } : "skip"
  );

  // Memoized filtered and sorted vendors
  const processedVendors = useMemo(() => {
    if (!vendors) return [];
    
    const vendorsList = Array.isArray(vendors) ? vendors : vendors.vendors || [];

    const filtered = vendorsList.filter((vendor: VendorEntity) => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesName = vendor.name.toLowerCase().includes(searchLower);
        const matchesEmail = vendor.contactEmail?.toLowerCase().includes(searchLower);
        const matchesCategory = vendor.category?.toLowerCase().includes(searchLower);
        
        if (!matchesName && !matchesEmail && !matchesCategory) {
          return false;
        }
      }

      // Status filter
      if (selectedStatus !== 'all' && vendor.status !== selectedStatus) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && vendor.category !== selectedCategory) {
        return false;
      }

      return true;
    });

    // Sort vendors
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'category':
          aValue = a.category || '';
          bValue = b.category || '';
          break;
        case 'status':
          aValue = a.status || 'active';
          bValue = b.status || 'active';
          break;
        case 'createdAt':
          aValue = a._creationTime || 0;
          bValue = b._creationTime || 0;
          break;
        case 'total_spend':
          aValue = a.total_spend || 0;
          bValue = b.total_spend || 0;
          break;
        case 'compliance_score':
          aValue = a.compliance_score || 0;
          bValue = b.compliance_score || 0;
          break;
        case 'risk_level':
          const riskOrder = { low: 1, medium: 2, high: 3 };
          aValue = riskOrder[a.risk_level as keyof typeof riskOrder] || 1;
          bValue = riskOrder[b.risk_level as keyof typeof riskOrder] || 1;
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
  }, [vendors, searchTerm, selectedStatus, selectedCategory, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(processedVendors.length / pageSize);
  const paginatedVendors = processedVendors.slice(
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

  const handleView = (vendorId: Id<"vendors">) => {
    if (onVendorSelect) {
      onVendorSelect(vendorId);
    } else {
      // Navigate to vendor details page if no custom handler
      router.push(`/dashboard/vendors/${vendorId}`);
    }
  };

  const handleEdit = (vendorId: Id<"vendors">) => {
    router.push(`/dashboard/vendors/edit/${vendorId}`);
  };

  const formatDate = (timestamp?: number): string => {
    if (!timestamp) return 'N/A';
    try {
      return format(new Date(timestamp), 'MMM dd, yyyy');
    } catch {
      return 'N/A';
    }
  };

  const formatStatusLabel = (status?: string): string => {
    if (!status) return 'Active';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getComplianceColor = (score?: number): string => {
    if (!score) return 'text-gray-600';
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    return 'text-red-600';
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
          Failed to load vendors: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Vendors ({processedVendors.length})
          </CardTitle>
          
          {/* Search and Filters */}
          {(showSearch || showFilters) && (
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {showSearch && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search vendors..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-full sm:w-64"
                  />
                </div>
              )}
              
              {showFilters && (
                <div className="flex gap-2">
                  <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as typeof selectedStatus)}>
                    <SelectTrigger className="w-full sm:w-32">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as typeof selectedCategory)}>
                    <SelectTrigger className="w-full sm:w-36">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="legal">Legal</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="hr">HR</SelectItem>
                      <SelectItem value="facilities">Facilities</SelectItem>
                      <SelectItem value="logistics">Logistics</SelectItem>
                      <SelectItem value="manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="consulting">Consulting</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            <span className="ml-3 text-muted-foreground">Loading vendors...</span>
          </div>
        ) : paginatedVendors.length === 0 ? (
          <div className="text-center py-8">
            <Building className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No vendors found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchTerm || selectedStatus !== 'all' || selectedCategory !== 'all'
                ? 'Try adjusting your search or filters' 
                : 'Get started by adding your first vendor'}
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
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center">
                        Vendor Name
                        <SortIcon field="name" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-accent/60 hover:scale-[1.02] select-none transition-all duration-200 ease-out"
                      onClick={() => handleSort('category')}
                    >
                      <div className="flex items-center">
                        Category
                        <SortIcon field="category" />
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
                      onClick={() => handleSort('total_spend')}
                    >
                      <div className="flex items-center">
                        Total Spend
                        <SortIcon field="total_spend" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-accent/60 hover:scale-[1.02] select-none transition-all duration-200 ease-out"
                      onClick={() => handleSort('compliance_score')}
                    >
                      <div className="flex items-center">
                        Compliance
                        <SortIcon field="compliance_score" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-accent/60 hover:scale-[1.02] select-none transition-all duration-200 ease-out"
                      onClick={() => handleSort('risk_level')}
                    >
                      <div className="flex items-center">
                        Risk Level
                        <SortIcon field="risk_level" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedVendors.map((vendor) => (
                    <TableRow key={vendor._id} className="hover:bg-accent/50 hover:shadow-md hover:scale-[1.005] transition-all duration-200 ease-out cursor-pointer group">
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground truncate max-w-xs">
                            {vendor.name}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            {vendor.contactEmail && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                <span className="truncate max-w-[120px]">{vendor.contactEmail}</span>
                              </div>
                            )}
                            {vendor.contactPhone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                <span>{vendor.contactPhone}</span>
                              </div>
                            )}
                            {vendor.website && (
                              <div className="flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                <span className="truncate max-w-[100px]">{vendor.website}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {vendor.category ? (
                          <Badge className={cn(categoryColors[vendor.category], "text-xs")}>
                            {vendor.category.charAt(0).toUpperCase() + vendor.category.slice(1)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Uncategorized</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(statusColors[vendor.status as keyof typeof statusColors] || statusColors.active, "text-xs")}>
                          {formatStatusLabel(vendor.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {vendor.total_spend ? `$${vendor.total_spend.toLocaleString()}` : '$0'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2 min-w-[80px]">
                            <Progress value={vendor.compliance_score || 0} className="h-2 w-12" />
                            <span className={cn("text-sm font-medium", getComplianceColor(vendor.compliance_score))}>
                              {vendor.compliance_score || 0}%
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className={cn("h-4 w-4", riskColors[vendor.risk_level as keyof typeof riskColors] || riskColors.low)} />
                          <span className={cn("text-sm font-medium capitalize", riskColors[vendor.risk_level as keyof typeof riskColors] || riskColors.low)}>
                            {vendor.risk_level || 'Low'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(vendor._id)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(vendor._id)}
                            className="h-8 w-8 p-0"
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
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, processedVendors.length)} of {processedVendors.length} vendors
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

export default VendorTable;