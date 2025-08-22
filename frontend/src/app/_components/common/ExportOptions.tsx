'use client';

import React, { useState } from 'react';
import { format } from '@/lib/date';
// import { api } from '../../../../convex/_generated/api';
// import { Id } from '../../../../convex/_generated/dataModel';
import { useAuth } from '@/contexts/AuthContext';
import { ContractEntity, VendorEntity } from '@/types/core-entities';

// UI Components
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

// Icons
import {
  Download,
  FileSpreadsheet,
  FileText,
  Settings,
  Clock,
  FileBarChart
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Type Definitions
export type ExportFormat = 'csv' | 'excel' | 'pdf' | 'json';

interface ExportOptionsProps {
  data?: 'contracts' | 'vendors' | 'analytics' | 'custom';
  entityIds?: string[];
  variant?: 'dropdown' | 'button' | 'inline';
  className?: string;
  onExportComplete?: (result: ExportResult) => void;
}

interface ExportConfig {
  format: ExportFormat;
  includeFields: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  filters?: Record<string, unknown>;
  template?: string;
  includeRelatedData?: boolean;
}

interface ExportResult {
  success: boolean;
  downloadUrl?: string;
  fileName?: string;
  error?: string;
}

// Export format configurations
const exportFormats: Record<ExportFormat, { label: string; icon: React.ElementType; description: string; extension: string; maxRows: number; }> = {
  csv: {
    label: 'CSV (Comma Separated)',
    icon: FileSpreadsheet,
    description: 'Best for spreadsheets and data analysis',
    extension: '.csv',
    maxRows: 50000,
  },
  excel: {
    label: 'Excel Workbook',
    icon: FileSpreadsheet,
    description: 'Full-featured spreadsheet with formatting',
    extension: '.xlsx',
    maxRows: 100000,
  },
  pdf: {
    label: 'PDF Report',
    icon: FileText,
    description: 'Professional formatted document',
    extension: '.pdf',
    maxRows: 10000,
  },
  json: {
    label: 'JSON Data',
    icon: FileBarChart,
    description: 'Raw data for developers',
    extension: '.json',
    maxRows: 100000,
  },
};

// Field configurations for different data types
const fieldConfigs = {
  contracts: {
    basic: ['title', 'status', 'vendor', 'createdAt'],
    financial: ['extractedPricing', 'extractedPaymentSchedule'],
    dates: ['extractedStartDate', 'extractedEndDate'],
    details: ['contractType', 'extractedParties', 'extractedScope'],
    metadata: ['analysisStatus', 'fileName', 'fileType', 'notes'],
  },
  vendors: {
    basic: ['name', 'category', 'status', 'createdAt'],
    contact: ['contactEmail', 'contactPhone', 'website', 'address'],
    performance: ['total_spend', 'compliance_score', 'risk_level'],
    metadata: ['notes', 'active_contracts', 'vendor_number'],
  },
  analytics: {
    summary: ['totalContracts', 'totalVendors', 'totalValue'],
    performance: ['completionRate', 'averageProcessingTime'],
    compliance: ['complianceScore', 'riskDistribution'],
    trends: ['monthlyTrends', 'categoryBreakdown'],
  },
};

export const ExportOptions = ({
  data = 'contracts',
  entityIds = [],
  variant = 'dropdown',
  className,
  onExportComplete
}: ExportOptionsProps) => {
  // State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    format: 'csv',
    includeFields: data !== 'custom' && data in fieldConfigs 
      ? (fieldConfigs as Record<string, { basic: string[]; advanced: string[]; relationships: string[] }>)[data].basic 
      : [],
    includeRelatedData: true,
  });

  const { user, userProfile } = useAuth();
  const enterpriseId = userProfile?.enterprise_id;

  // Fetch data for export preview
    const data = null;
  const contractsLoading = false;
  const contractsError = null;
  // Commented out Convex API call
  // api.contracts.getContracts,
  // data === 'contracts' && enterpriseId ? { enterpriseId } : "skip"
  const contractsData = null;

  const vendorsLoading = false;
  const vendorsError = null;
  // Commented out Convex API call
  // api.vendors.getVendors,
  // data === 'vendors' && enterpriseId ? { enterpriseId } : "skip"
  const vendorsData = null;

  const formatFieldLabel = (field: string): string => {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/([a-z])([A-Z])/g, '$1 $2');
  };

  // Generate filename
  const generateFileName = (): string => {
    const timestamp = format(new Date(), 'yyyy-MM-dd-HHmm');
    const dataLabel = data.charAt(0).toUpperCase() + data.slice(1);
    const formatExt = exportFormats[exportConfig.format].extension;
    
    if (entityIds.length > 0) {
      return `${dataLabel}-Selection-${timestamp}${formatExt}`;
    }
    
    return `${dataLabel}-Export-${timestamp}${formatExt}`;
  };

  // Prepare export data
  const prepareExportData = () => {
    let sourceData: (ContractEntity | VendorEntity)[] = [];
    
    switch (data) {
      case 'contracts':
        sourceData = contractsData?.contracts || [];
        break;
      case 'vendors':
        sourceData = vendorsData?.vendors || [];
        break;
      default:
        sourceData = [];
    }

    // Filter by entityIds if provided
    if (entityIds.length > 0) {
      sourceData = sourceData.filter(item => entityIds.includes(item._id));
    }

    // Apply date range filter if specified
    if (exportConfig.dateRange) {
      const startDate = new Date(exportConfig.dateRange.start);
      const endDate = new Date(exportConfig.dateRange.end);
      
      sourceData = sourceData.filter(item => {
        const itemDate = new Date(item._creationTime || (item as any).createdAt || 0);
        return itemDate >= startDate && itemDate <= endDate;
      });
    }

    // Select only requested fields
    return sourceData.map(item => {
      const exportItem: Record<string, unknown> = {};
      
      exportConfig.includeFields.forEach(field => {
        if (field === 'vendor' && 'vendor' in item && item.vendor) {
          exportItem.vendor = (item.vendor as VendorEntity).name;
        } else if (field === 'createdAt' && item._creationTime) {
          exportItem.createdAt = format(new Date(item._creationTime), 'yyyy-MM-dd HH:mm:ss');
        } else if (field.includes('Date') && (item as any)[field]) {
          exportItem[field] = format(new Date((item as any)[field]), 'yyyy-MM-dd');
        } else {
          exportItem[field] = (item as any)[field] || '';
        }
      });
      
      return exportItem;
    });
  };

  // Convert data to format
  const convertToFormat = (data: Record<string, unknown>[]): string => {
    switch (exportConfig.format) {
      case 'csv':
        return convertToCSV(data);
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'excel':
        return convertToExcel(data);
      case 'pdf':
        return convertToPDF(data);
      default:
        return JSON.stringify(data);
    }
  };

  const convertToCSV = (data: Record<string, unknown>[]): string => {
    if (data.length === 0) return '';
    
    const firstItem = data[0];
    if (!firstItem) return '';
    
    const headers = Object.keys(firstItem);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape CSV values that contain commas or quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');
    
    return csvContent;
  };

  const convertToExcel = (data: Record<string, unknown>[]): string => {
    // In a real implementation, you'd use a library like xlsx
    // For now, return CSV format as placeholder
    return convertToCSV(data);
  };

  const convertToPDF = (data: Record<string, unknown>[]): string => {
    // In a real implementation, you'd use a library like jsPDF
    // For now, return a simple text format
    return data.map(item => Object.values(item).join(' | ')).join('\n');
  };

  // Handle export
  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      // Simulate progress
      setExportProgress(25);
      
      const exportData = prepareExportData();
      setExportProgress(50);
      
      const content = convertToFormat(exportData);
      setExportProgress(75);
      
      // Create download
      const fileName = generateFileName();
      const mimeType = {
        csv: 'text/csv',
        excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        pdf: 'application/pdf',
        json: 'application/json',
      }[exportConfig.format];
      
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      // Download file
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setExportProgress(100);
      
      const result: ExportResult = {
        success: true,
        fileName,
        downloadUrl: url,
      };
      
      onExportComplete?.(result);
      setIsDialogOpen(false);
      
    } catch (error) {
      console.error('Export failed:', error);
      const result: ExportResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed',
      };
      onExportComplete?.(result);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  // Quick export handlers
  const handleQuickExport = (format: ExportFormat) => {
    setExportConfig(prev => ({
      ...prev,
      format,
      includeFields: data !== 'custom' && data in fieldConfigs 
        ? (fieldConfigs as Record<string, { basic: string[]; advanced: string[]; relationships: string[] }>)[data].basic 
        : [],
    }));
    
    // Perform export immediately
    setTimeout(() => {
      handleExport();
    }, 100);
  };

  // Render export dialog
  const renderExportDialog = () => (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export {data.charAt(0).toUpperCase() + data.slice(1)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Format Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Export Format</Label>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(exportFormats).map(([key, format]) => {
                const IconComponent = format.icon;
                return (
                  <Card
                    key={key}
                    className={cn(
                      'cursor-pointer transition-colors border-2',
                      exportConfig.format === key 
                        ? 'border-primary bg-primary/5' 
                        : 'border-muted hover:border-primary/50'
                    )}
                    onClick={() => setExportConfig(prev => ({ ...prev, format: key as ExportFormat }))}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <IconComponent className="h-8 w-8 text-primary" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{format.label}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format.description}
                          </p>
                          <Badge variant="outline" className="text-xs mt-1">
                            Max {format.maxRows.toLocaleString()} rows
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Field Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Fields to Include</Label>
            <div className="grid grid-cols-1 gap-3 max-h-48 overflow-y-auto">
              {data !== 'custom' && data in fieldConfigs && Object.entries(fieldConfigs[data as keyof typeof fieldConfigs]).map(([category, fields]) => (
                <div key={category} className="space-y-2">
                  <Label className="text-sm font-medium capitalize text-muted-foreground">
                    {category}
                  </Label>
                  <div className="grid grid-cols-2 gap-2 pl-4">
                    {(fields as string[]).map(field => (
                      <div key={field} className="flex items-center space-x-2">
                        <Checkbox
                          id={field}
                          checked={exportConfig.includeFields.includes(field)}
                          onCheckedChange={(checked: boolean) => {
                            setExportConfig(prev => ({
                              ...prev,
                              includeFields: checked
                                ? [...prev.includeFields, field]
                                : prev.includeFields.filter(f => f !== field)
                            }));
                          }}
                        />
                        <Label htmlFor={field} className="text-sm">
                          {formatFieldLabel(field)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Options */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Additional Options</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeRelated"
                  checked={exportConfig.includeRelatedData || false}
                  onCheckedChange={(checked: boolean) => 
                    setExportConfig(prev => ({ ...prev, includeRelatedData: !!checked }))
                  }
                />
                <Label htmlFor="includeRelated" className="text-sm">
                  Include related data (vendor info for contracts, etc.)
                </Label>
              </div>
            </div>
          </div>

          {/* Export Preview */}
          {!isExporting && (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Ready to export {prepareExportData().length} records with {exportConfig.includeFields.length} fields
                as {exportFormats[exportConfig.format].label}
              </AlertDescription>
            </Alert>
          )}

          {/* Export Progress */}
          {isExporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Exporting...</span>
                <span className="text-sm text-muted-foreground">{exportProgress}%</span>
              </div>
              <Progress value={exportProgress} className="w-full" />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isExporting}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting || exportConfig.includeFields.length === 0}>
              {isExporting ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export {exportFormats[exportConfig.format].label}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Render based on variant
  switch (variant) {
    case 'button':
      return (
        <>
          <Button
            variant="outline"
            onClick={() => setIsDialogOpen(true)}
            className={className}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          {renderExportDialog()}
        </>
      );

    case 'inline':
      return (
        <Card className={className}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Options
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(exportFormats).map(([key, format]) => {
                const IconComponent = format.icon;
                return (
                  <Button
                    key={key}
                    variant="outline"
                    onClick={() => handleQuickExport(key as ExportFormat)}
                    className="h-20 flex-col gap-2"
                  >
                    <IconComponent className="h-6 w-6" />
                    <span className="text-xs">{format.label}</span>
                  </Button>
                );
              })}
            </div>
            <Button
              variant="ghost"
              onClick={() => setIsDialogOpen(true)}
              className="w-full mt-3"
            >
              <Settings className="h-4 w-4 mr-2" />
              Advanced Options
            </Button>
          </CardContent>
          {renderExportDialog()}
        </Card>
      );

    default: // dropdown
      return (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className={className}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Quick Export</DropdownMenuLabel>
              {Object.entries(exportFormats).map(([key, format]) => {
                const IconComponent = format.icon;
                return (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => handleQuickExport(key as ExportFormat)}
                  >
                    <IconComponent className="h-4 w-4 mr-2" />
                    {format.label}
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsDialogOpen(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Advanced Options...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {renderExportDialog()}
        </>
      );
  }
};

export default ExportOptions;

