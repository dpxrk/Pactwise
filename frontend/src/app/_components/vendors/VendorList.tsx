"use client";

import {
  AlertCircle,
  ArrowUpDown,
  Building,
  DollarSign,
  FileText,
  Filter,
  Plus,
  Search,
  Star,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState, useMemo } from 'react';

import { GridDataWrapper } from '@/app/_components/common/DataStateWrapper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useVendors, useVendorMutations } from '@/hooks/useVendors';
import { formatDistanceToNow } from '@/lib/date';
import { Tables } from '@/types/database.types';

import { VendorCreateDialog } from './VendorCreateDialog';

// VendorListProps: enterpriseId is now taken from auth context inside the hook
type VendorListProps = Record<string, never>;

type SortOption = 'name' | 'contractCount' | 'totalValue' | 'lastActivity';
type CategoryFilter = 'all' | 'technology' | 'marketing' | 'legal' | 'finance' | 'hr' | 'facilities' | 'logistics' | 'manufacturing' | 'consulting' | 'other';

export function VendorList({}: VendorListProps) {
  const router = useRouter();
  const { userProfile } = useAuth();
  const enterpriseId = userProfile?.enterprise_id || '';
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Fetch vendors with enhanced data using Supabase hook
  const { vendors, isLoading, error: _error, refetch: _refetch, isSubscribed: _isSubscribed } = useVendors({
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    orderBy: sortBy === 'name' ? 'name' : sortBy === 'lastActivity' ? 'updated_at' : undefined,
    ascending: sortOrder === 'asc',
    realtime: true // Enable real-time updates
  });

  // Use vendor mutations
  const { deleteVendor: _deleteVendor } = useVendorMutations();

  // Filter vendors based on search query
  const filteredVendors = useMemo(() => {
    if (!searchQuery) return vendors;
    
    const query = searchQuery.toLowerCase();
    return vendors.filter(vendor =>
      vendor.name?.toLowerCase().includes(query) ||
      vendor.primary_contact_email?.toLowerCase().includes(query) ||
      vendor.primary_contact_name?.toLowerCase().includes(query)
    );
  }, [vendors, searchQuery]);

  // Calculate summary statistics
  const stats = useMemo(() => {
    return {
      totalVendors: filteredVendors.length,
      activeVendors: filteredVendors.filter(v => v.status === 'active').length,
      totalValue: filteredVendors.reduce((sum, v) => {
        // Sum up contract values if available
        const contracts = (v as Tables<'vendors'> & { contracts?: Tables<'contracts'>[] }).contracts;
        return sum + (contracts?.reduce((cSum, c) => cSum + (c.value || 0), 0) || 0);
      }, 0),
      averagePerformance: filteredVendors.reduce((sum, v) => {
        // Get performance score from vendor
        return sum + (v.performance_score || 0);
      }, 0) / (filteredVendors.length || 1),
    };
  }, [filteredVendors]);

  const handleVendorClick = (vendorId: string) => {
    router.push(`/dashboard/vendors/${vendorId}`);
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceIcon = (score: number) => {
    if (score >= 90) return <TrendingUp className="h-4 w-4" />;
    if (score >= 70) return <Star className="h-4 w-4" />;
    return <TrendingDown className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Vendors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVendors}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Vendors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.activeVendors}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Contract Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.totalValue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPerformanceColor(stats.averagePerformance)}`}>
              {Math.round(stats.averagePerformance)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={categoryFilter} onValueChange={(value: CategoryFilter) => setCategoryFilter(value)}>
          <SelectTrigger className="w-full md:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
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
        
        <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
          <SelectTrigger className="w-full md:w-[200px]">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="contractCount">Contract Count</SelectItem>
            <SelectItem value="totalValue">Total Value</SelectItem>
            <SelectItem value="lastActivity">Last Activity</SelectItem>
          </SelectContent>
        </Select>
        
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        >
          <ArrowUpDown className={`h-4 w-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
        </Button>
        
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Vendor
        </Button>
      </div>

      {/* Vendor Cards */}
      <GridDataWrapper
        items={filteredVendors}
        loading={isLoading}
        error={null}
        emptyMessage={
          searchQuery || categoryFilter !== 'all' 
            ? 'No vendors found matching your criteria.'
            : 'No vendors found. Click "Add Vendor" to create your first vendor.'
        }
        emptyAction={
          searchQuery || categoryFilter !== 'all' 
            ? undefined
            : { label: 'Add Vendor', onClick: () => setShowCreateDialog(true) }
        }
        renderItem={(vendor) => (
            <Card
              key={vendor.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleVendorClick(vendor.id)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      {vendor.name}
                    </CardTitle>
                    <CardDescription>
                      {vendor.category ? (
                        <Badge variant="secondary" className="mt-1">
                          {vendor.category}
                        </Badge>
                      ) : null}
                    </CardDescription>
                  </div>
                  <div className={`flex items-center gap-1 ${getPerformanceColor(vendor.performance_score || 0)}`}>
                    {getPerformanceIcon(vendor.performance_score || 0)}
                    <span className="font-semibold">{vendor.performance_score || 0}%</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>Contracts</span>
                    </div>
                    <span className="font-medium">
                      {vendor.active_contracts || 0} active contracts
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span>Total Value</span>
                    </div>
                    <span className="font-medium">
                      ${(vendor.total_contract_value || 0).toLocaleString()}
                    </span>
                  </div>
                  
                  {vendor.primary_contact_email && (
                    <div className="text-sm text-muted-foreground truncate">
                      {vendor.primary_contact_email}
                    </div>
                  )}
                  
                  {vendor.updated_at && (
                    <div className="text-xs text-muted-foreground">
                      Last activity {formatDistanceToNow(new Date(vendor.updated_at))} ago
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-2">
                    <Badge 
                      variant={vendor.status === 'active' ? 'default' : 'secondary'}
                    >
                      {vendor.status || 'active'}
                    </Badge>
                    <Badge
                      variant={vendor.compliance_score && vendor.compliance_score >= 90 ? 'default' : 'error'}
                      className="gap-1"
                    >
                      <AlertCircle className="h-3 w-3" />
                      {vendor.compliance_score || 100}% Compliant
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
      />

      {/* Create Vendor Dialog */}
      <VendorCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        enterpriseId={enterpriseId}
        onVendorCreated={(vendorId) => {
          setShowCreateDialog(false);
          router.push(`/dashboard/vendors/${vendorId}`);
        }}
      />
    </div>
  );
}