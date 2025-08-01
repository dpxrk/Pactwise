'use client';

import React, { useCallback, useMemo } from 'react';
import { VirtualList } from '@/components/performance/VirtualList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  FileText, 
  Star, 
  AlertCircle 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

interface Vendor {
  _id: string;
  name: string;
  category?: string;
  performanceScore?: number;
  activeContractCount?: number;
  contractCount?: number;
  totalValue?: number;
  contactEmail?: string;
  lastActivity?: number;
  status?: string;
  complianceScore?: number;
}

interface OptimizedVendorGridProps {
  vendors: Vendor[];
  onVendorClick?: (vendorId: string) => void;
  columns?: number;
}

export const OptimizedVendorGrid = React.memo<OptimizedVendorGridProps>(({ 
  vendors, 
  onVendorClick,
  columns = 3 
}) => {
  const router = useRouter();

  // Group vendors into rows for virtual scrolling
  const vendorRows = useMemo(() => {
    const rows: Vendor[][] = [];
    for (let i = 0; i < vendors.length; i += columns) {
      rows.push(vendors.slice(i, i + columns));
    }
    return rows;
  }, [vendors, columns]);

  const handleVendorClick = useCallback((vendorId: string) => {
    if (onVendorClick) {
      onVendorClick(vendorId);
    } else {
      router.push(`/dashboard/vendors/${vendorId}`);
    }
  }, [onVendorClick, router]);

  const getPerformanceColor = useCallback((score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  }, []);

  const getPerformanceIcon = useCallback((score: number) => {
    if (score >= 90) return <TrendingUp className="h-4 w-4" />;
    if (score >= 70) return <Star className="h-4 w-4" />;
    return <TrendingDown className="h-4 w-4" />;
  }, []);

  const renderVendorCard = useCallback((vendor: Vendor) => (
    <Card 
      key={vendor._id}
      className="hover:shadow-lg transition-shadow cursor-pointer h-full"
      onClick={() => handleVendorClick(vendor._id)}
    >
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building className="h-4 w-4" />
              {vendor.name}
            </CardTitle>
            {vendor.category && (
              <Badge variant="secondary" className="mt-1">
                {vendor.category}
              </Badge>
            )}
          </div>
          <div className={`flex items-center gap-1 ${getPerformanceColor(vendor.performanceScore || 0)}`}>
            {getPerformanceIcon(vendor.performanceScore || 0)}
            <span className="font-semibold">{vendor.performanceScore || 0}%</span>
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
              {vendor.activeContractCount || 0} active / {vendor.contractCount || 0} total
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>Total Value</span>
            </div>
            <span className="font-medium">
              ${(vendor.totalValue || 0).toLocaleString()}
            </span>
          </div>
          
          {vendor.contactEmail && (
            <div className="text-sm text-muted-foreground truncate">
              {vendor.contactEmail}
            </div>
          )}
          
          {vendor.lastActivity && vendor.lastActivity > 0 && (
            <div className="text-xs text-muted-foreground">
              Last activity {formatDistanceToNow(new Date(vendor.lastActivity))} ago
            </div>
          )}
          
          <div className="flex items-center justify-between pt-2">
            <Badge 
              variant={vendor.status === 'active' ? 'default' : 'secondary'}
            >
              {vendor.status || 'active'}
            </Badge>
            <Badge 
              variant={vendor.complianceScore && vendor.complianceScore >= 90 ? 'default' : 'destructive'}
              className="gap-1"
            >
              <AlertCircle className="h-3 w-3" />
              {vendor.complianceScore || 100}% Compliant
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  ), [handleVendorClick, getPerformanceColor, getPerformanceIcon]);

  const renderRow = useCallback((row: Vendor[], index: number, style: React.CSSProperties) => (
    <div style={style} className="px-4 py-2">
      <div className={`grid grid-cols-1 md:grid-cols-${columns} gap-4`}>
        {row.map(vendor => renderVendorCard(vendor))}
        {/* Fill empty cells in the last row */}
        {row.length < columns && 
          Array.from({ length: columns - row.length }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))
        }
      </div>
    </div>
  ), [columns, renderVendorCard]);

  if (vendors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Building className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">No vendors found</p>
      </div>
    );
  }

  return (
    <div className="h-[800px]">
      <VirtualList
        items={vendorRows}
        itemHeight={280} // Approximate height of a vendor card row
        renderItem={renderRow}
        overscan={2}
        className="w-full"
      />
    </div>
  );
});

OptimizedVendorGrid.displayName = 'OptimizedVendorGrid';