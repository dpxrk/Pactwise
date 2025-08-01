'use client';

import React, { useMemo, CSSProperties } from 'react';
import { FixedSizeList as List } from 'react-window';
import { ContractType } from '@/types/contract.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Eye, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
// import { Id } from '../../../../convex/_generated/dataModel';

interface VirtualizedContractListProps {
  contracts: ContractType[];
  onViewContract: (contractId: Id<"contracts">) => void;
  className?: string;
  height?: number;
}

interface RowData {
  contracts: ContractType[];
  onViewContract: (contractId: Id<"contracts">) => void;
  getStatusBadgeClass: (status: string) => string;
  formatStatusLabel: (status: string) => string;
  formatDate: (dateString?: string) => string;
}

const ContractRow = ({ index, style, data }: { 
  index: number; 
  style: CSSProperties; 
  data: RowData 
}) => {
  const contract = data.contracts[index];
  const vendor = contract.vendor || { name: 'N/A' };

  return (
    <div
      style={style}
      className={cn(
        "flex items-center px-6 py-4 border-b border-border/30",
        "hover:bg-accent/30 hover:shadow-md transition-all duration-200",
        "cursor-pointer group"
      )}
      onClick={() => data.onViewContract(contract._id)}
    >
      <div className="flex-1 grid grid-cols-7 gap-4 items-center">
        {/* Contract Name */}
        <div className="col-span-2 flex items-center">
          <FileText className="h-5 w-5 text-muted-foreground mr-3 flex-shrink-0 group-hover:text-primary transition-colors duration-200" />
          <div className="overflow-hidden">
            <div className="font-semibold text-foreground group-hover:text-primary transition-colors duration-200 truncate" title={contract.title}>
              {contract.title || 'Untitled'}
            </div>
            <div className="text-xs text-muted-foreground mt-1 truncate">{contract.fileName || 'No file'}</div>
          </div>
        </div>

        {/* Vendor */}
        <div className="truncate">
          <span className="font-medium text-foreground">{vendor.name}</span>
        </div>

        {/* Status */}
        <div>
          <Badge className={cn(
            `${data.getStatusBadgeClass(contract.status)} font-medium`,
            "transition-all duration-200 group-hover:scale-105"
          )}>
            {data.formatStatusLabel(contract.status)}
          </Badge>
        </div>

        {/* Analysis Status */}
        <div>
          {contract.analysisStatus ? (
            <Badge className={cn(
              contract.analysisStatus === 'completed' ? 'bg-green-100 text-green-800' :
              contract.analysisStatus === 'processing' ? 'bg-blue-100 text-blue-800' :
              contract.analysisStatus === 'failed' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800',
              "transition-all duration-200 group-hover:scale-105"
            )}>
              {data.formatStatusLabel(contract.analysisStatus)}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">Not analyzed</span>
          )}
        </div>

        {/* Dates */}
        <div className="text-sm text-foreground">
          {data.formatDate(contract.extractedStartDate)}
        </div>
        <div className="text-sm text-foreground">
          {data.formatDate(contract.extractedEndDate)}
        </div>

        {/* Actions */}
        <div className="text-right">
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-105"
            onClick={(e) => {
              e.stopPropagation();
              data.onViewContract(contract._id);
            }}
          >
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
        </div>
      </div>
    </div>
  );
};

export const VirtualizedContractList: React.FC<VirtualizedContractListProps> = ({
  contracts,
  onViewContract,
  className,
  height = 600
}) => {
  // Helper functions
  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "pending_analysis": return "bg-yellow-100 text-yellow-800";
      case "draft": return "bg-blue-100 text-blue-800";
      case "expired": return "bg-red-100 text-red-800";
      case "terminated": return "bg-orange-100 text-orange-800";
      case "archived": return "bg-gray-100 text-gray-800";
      default: return "bg-slate-100 text-slate-800";
    }
  };

  const formatStatusLabel = (status: string): string => {
    if (!status) return "Unknown";
    return status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return "Not available";
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (e) {
      return "Invalid date";
    }
  };

  const rowData: RowData = useMemo(() => ({
    contracts,
    onViewContract,
    getStatusBadgeClass,
    formatStatusLabel,
    formatDate
  }), [contracts, onViewContract]);

  if (contracts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <div className="text-muted-foreground">No contracts found</div>
      </div>
    );
  }

  return (
    <div className={cn("bg-card/50 backdrop-blur-sm rounded-xl border border-border/50", className)}>
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-muted/50 to-muted/30 border-b border-border/50">
        <div className="grid grid-cols-7 gap-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <div className="col-span-2">Contract</div>
          <div>Vendor</div>
          <div>Status</div>
          <div>Analysis</div>
          <div>Start Date</div>
          <div>End Date</div>
          <div className="text-right">Actions</div>
        </div>
      </div>

      {/* Virtualized List */}
      <List
        height={height}
        itemCount={contracts.length}
        itemSize={88} // Row height
        width="100%"
        itemData={rowData}
      >
        {ContractRow}
      </List>
    </div>
  );
};

export default VirtualizedContractList;