'use client';

import { Building, TrendingUp, TrendingDown, DollarSign, FileText, Star } from 'lucide-react';
import React, { useMemo, CSSProperties } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Id } from '@/types/id.types';

interface VendorData {
  _id: Id<"vendors">;
  name: string;
  category: string;
  contractCount: number;
  totalValue: number;
  riskScore?: number;
  performanceScore?: number;
  lastActivity?: string;
}

interface VirtualizedVendorListProps {
  vendors: VendorData[];
  onViewVendor: (vendorId: Id<"vendors">) => void;
  className?: string;
  width?: number;
  height?: number;
}

interface CellData {
  vendors: VendorData[];
  onViewVendor: (vendorId: Id<"vendors">) => void;
  columnCount: number;
}

const VendorCard = ({ 
  vendor, 
  onViewVendor 
}: { 
  vendor: VendorData; 
  onViewVendor: (vendorId: Id<"vendors">) => void;
}) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      technology: "bg-blue-100 text-blue-800",
      marketing: "bg-purple-100 text-purple-800",
      legal: "bg-orange-100 text-orange-800",
      finance: "bg-green-100 text-green-800",
      hr: "bg-pink-100 text-pink-800",
      facilities: "bg-yellow-100 text-yellow-800",
      logistics: "bg-indigo-100 text-indigo-800",
      manufacturing: "bg-red-100 text-red-800",
      consulting: "bg-teal-100 text-teal-800",
      other: "bg-gray-100 text-gray-800",
    };
    return colors[category] || colors.other;
  };

  const getRiskColor = (score?: number): string => {
    if (!score) return "text-gray-500";
    if (score >= 7) return "text-red-600";
    if (score >= 4) return "text-yellow-600";
    return "text-green-600";
  };

  return (
    <Card 
      className={cn(
        "group hover:shadow-xl transition-all duration-300 cursor-pointer",
        "hover:-translate-y-1 hover:border-primary/50"
      )}
      onClick={() => onViewVendor(vendor._id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <Building className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg group-hover:text-primary transition-colors">
                {vendor.name}
              </CardTitle>
              <Badge className={cn("mt-1", getCategoryColor(vendor.category))}>
                {vendor.category}
              </Badge>
            </div>
          </div>
          {vendor.performanceScore && (
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="text-sm font-medium">{vendor.performanceScore.toFixed(1)}</span>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Contracts</p>
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{vendor.contractCount}</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total Value</p>
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{formatCurrency(vendor.totalValue)}</span>
            </div>
          </div>
        </div>

        {vendor.riskScore !== undefined && (
          <div className="flex items-center justify-between pt-3 border-t">
            <span className="text-xs text-muted-foreground">Risk Score</span>
            <div className={cn("flex items-center space-x-1", getRiskColor(vendor.riskScore))}>
              {vendor.riskScore >= 7 ? (
                <TrendingUp className="h-4 w-4" />
              ) : vendor.riskScore >= 4 ? (
                <TrendingDown className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="font-semibold">{vendor.riskScore}/10</span>
            </div>
          </div>
        )}

        {vendor.lastActivity && (
          <div className="text-xs text-muted-foreground pt-2">
            Last activity: {vendor.lastActivity}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const Cell = ({ columnIndex, rowIndex, style, data }: {
  columnIndex: number;
  rowIndex: number;
  style: CSSProperties;
  data: CellData;
}) => {
  const { vendors, onViewVendor, columnCount } = data;
  const index = rowIndex * columnCount + columnIndex;
  const vendor = vendors[index];

  if (!vendor) return null;

  return (
    <div style={{ ...style, padding: '0.75rem' }}>
      <VendorCard vendor={vendor} onViewVendor={onViewVendor} />
    </div>
  );
};

export const VirtualizedVendorList: React.FC<VirtualizedVendorListProps> = ({
  vendors,
  onViewVendor,
  className,
  width = 1200,
  height = 800
}) => {
  const columnCount = useMemo(() => {
    // Calculate columns based on width
    if (width < 640) return 1;  // Mobile
    if (width < 1024) return 2; // Tablet
    if (width < 1536) return 3; // Desktop
    return 4; // Large desktop
  }, [width]);

  const columnWidth = width / columnCount;
  const rowHeight = 280; // Card height + padding

  const rowCount = Math.ceil(vendors.length / columnCount);

  const cellData: CellData = useMemo(() => ({
    vendors,
    onViewVendor,
    columnCount
  }), [vendors, onViewVendor, columnCount]);

  if (vendors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Building className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <div className="text-muted-foreground">No vendors found</div>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <Grid
        columnCount={columnCount}
        columnWidth={columnWidth}
        height={height}
        rowCount={rowCount}
        rowHeight={rowHeight}
        width={width}
        itemData={cellData}
      >
        {Cell}
      </Grid>
    </div>
  );
};
