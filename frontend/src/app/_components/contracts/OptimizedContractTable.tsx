'use client';

import React, { useMemo, useCallback } from 'react';
import { VirtualList } from '@/components/performance/VirtualList';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Eye, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
// import { Id } from '../../../../convex/_generated/dataModel';

interface Contract {
  _id: Id<"contracts">;
  title?: string;
  fileName?: string;
  status: string;
  analysisStatus?: string;
  extractedStartDate?: string;
  extractedEndDate?: string;
  vendor?: { name: string };
}

interface OptimizedContractTableProps {
  contracts: Contract[];
  onContractClick?: (contractId: Id<"contracts">) => void;
}

export const OptimizedContractTable = React.memo<OptimizedContractTableProps>(({ 
  contracts, 
  onContractClick 
}) => {
  const router = useRouter();

  const handleContractClick = useCallback((contractId: Id<"contracts">) => {
    if (onContractClick) {
      onContractClick(contractId);
    } else {
      router.push(`/dashboard/contracts/${contractId}`);
    }
  }, [onContractClick, router]);

  const getStatusBadgeClass = useCallback((status: string): string => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "pending_analysis": return "bg-yellow-100 text-yellow-800";
      case "draft": return "bg-blue-100 text-blue-800";
      case "expired": return "bg-red-100 text-red-800";
      case "terminated": return "bg-orange-100 text-orange-800";
      case "archived": return "bg-gray-100 text-gray-800";
      default: return "bg-slate-100 text-slate-800";
    }
  }, []);

  const formatDate = useCallback((dateString?: string): string => {
    if (!dateString) return "Not available";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return "Invalid date";
    }
  }, []);

  const formatStatusLabel = useCallback((status: string): string => {
    if (!status) return "Unknown";
    return status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  }, []);

  const renderContract = useCallback((contract: Contract, index: number, style: React.CSSProperties) => (
    <div
      style={style}
      className="flex items-center px-6 py-4 hover:bg-accent/30 cursor-pointer transition-all duration-200 border-b"
      onClick={() => handleContractClick(contract._id)}
    >
      {/* Contract Info */}
      <div className="flex items-center flex-1 min-w-0">
        <FileText className="h-5 w-5 text-muted-foreground mr-3 flex-shrink-0" />
        <div className="min-w-0">
          <div className="font-semibold text-foreground truncate" title={contract.title}>
            {contract.title || 'Untitled'}
          </div>
          <div className="text-xs text-muted-foreground">{contract.fileName || 'No file'}</div>
        </div>
      </div>

      {/* Vendor */}
      <div className="w-48 px-4">
        <span className="font-medium text-foreground truncate block">
          {contract.vendor?.name || 'N/A'}
        </span>
      </div>

      {/* Status */}
      <div className="w-36 px-4">
        <Badge className={`${getStatusBadgeClass(contract.status)} font-medium`}>
          {formatStatusLabel(contract.status)}
        </Badge>
      </div>

      {/* Analysis Status */}
      <div className="w-36 px-4">
        {contract.analysisStatus ? (
          <Badge className={
            contract.analysisStatus === 'completed' ? 'bg-green-100 text-green-800' :
            contract.analysisStatus === 'processing' ? 'bg-blue-100 text-blue-800' :
            contract.analysisStatus === 'failed' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }>
            {formatStatusLabel(contract.analysisStatus)}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Not analyzed</span>
        )}
      </div>

      {/* Dates */}
      <div className="w-32 px-4">
        <div className="flex items-center text-sm text-foreground">
          <Calendar className="h-3 w-3 mr-1" />
          {formatDate(contract.extractedStartDate)}
        </div>
      </div>

      <div className="w-32 px-4">
        <div className="flex items-center text-sm text-foreground">
          <Calendar className="h-3 w-3 mr-1" />
          {formatDate(contract.extractedEndDate)}
        </div>
      </div>

      {/* Actions */}
      <div className="w-24 px-4 text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleContractClick(contract._id);
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    </div>
  ), [handleContractClick, getStatusBadgeClass, formatStatusLabel, formatDate]);

  if (contracts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">No contracts found</p>
      </div>
    );
  }

  return (
    <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 shadow-elegant overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-muted/50 to-muted/30 border-b border-border/50">
        <div className="flex items-center px-6 py-4">
          <div className="flex-1">Contract</div>
          <div className="w-48 px-4">Vendor</div>
          <div className="w-36 px-4">Status</div>
          <div className="w-36 px-4">Analysis</div>
          <div className="w-32 px-4">Start Date</div>
          <div className="w-32 px-4">End Date</div>
          <div className="w-24 px-4 text-right">Actions</div>
        </div>
      </div>

      {/* Virtual List */}
      <div className="h-[600px]">
        <VirtualList
          items={contracts}
          itemHeight={72}
          renderItem={renderContract}
          overscan={5}
          className="w-full"
        />
      </div>
    </div>
  );
});

OptimizedContractTable.displayName = 'OptimizedContractTable';