"use client";

import { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, FileText, Clock, XCircle, FileX, Archive, AlertCircle, Building, Calendar, DollarSign, Download, Edit, Eye, MoreHorizontal, Plus, Trash, AlertTriangle, Globe, Shield, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useMemo } from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { DataTableFacetedFilter } from '@/components/ui/data-table-faceted-filter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useContracts, useContractMutations } from '@/hooks/useContracts';
import { format } from '@/lib/date';
import type { Id } from '@/types/id.types';

interface ContractListProps {
  enterpriseId?: Id<"enterprises">; // Optional, kept for backwards compatibility (hook gets from AuthContext)
  status?: string;
}

// Contract type for table
interface ContractRow {
  _id: string;
  title: string;
  vendorName?: string;
  contractType?: string | null;
  status: string;
  value?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  analysisStatus?: string | null;
  _creationTime: number;
  // Tariff fields
  totalTariffExposure?: number | null;
  tariffRiskLevel?: 'none' | 'low' | 'medium' | 'high' | 'critical' | 'unknown' | null;
  tariffByCountry?: Record<string, number> | null;
}

// Extended contract type to handle fields not yet in generated types
interface ContractWithTariff {
  id: string;
  title: string;
  contract_type: string | null;
  status: 'active' | 'draft' | 'expired' | 'terminated' | 'archived' | 'pending_analysis';
  total_value?: number | null;
  start_date: string | null;
  end_date: string | null;
  analysis_status: string | null;
  created_at: string;
  vendors?: { name?: string };
  // Tariff fields (added to schema but not yet in generated types)
  total_tariff_exposure?: number | null;
  tariff_risk_level?: string | null;
  tariff_by_country?: Record<string, number> | null;
}

const statusOptions = [
  { value: 'active', label: 'Active', icon: CheckCircle },
  { value: 'draft', label: 'Draft', icon: FileText },
  { value: 'pending', label: 'Pending', icon: Clock },
  { value: 'expired', label: 'Expired', icon: XCircle },
  { value: 'terminated', label: 'Terminated', icon: FileX },
  { value: 'archived', label: 'Archived', icon: Archive },
];

const contractTypeOptions = [
  { value: 'saas', label: 'SaaS' },
  { value: 'msa', label: 'MSA' },
  { value: 'sow', label: 'SOW' },
  { value: 'nda', label: 'NDA' },
  { value: 'employment', label: 'Employment' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'service', label: 'Service' },
  { value: 'license', label: 'License' },
  { value: 'other', label: 'Other' },
];

const analysisStatusOptions = [
  { value: 'pending', label: 'Pending Analysis' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

const tariffRiskOptions = [
  { value: 'none', label: 'No Tariff', icon: Shield },
  { value: 'low', label: 'Low Risk', icon: Shield },
  { value: 'medium', label: 'Medium Risk', icon: TrendingUp },
  { value: 'high', label: 'High Risk', icon: AlertTriangle },
  { value: 'critical', label: 'Critical', icon: AlertTriangle },
  { value: 'unknown', label: 'Unknown', icon: AlertCircle },
];

export function ContractList({ status }: ContractListProps) {
  const router = useRouter();

  // Fetch contracts using the proper Supabase hook
  const { contracts, isLoading, refetch } = useContracts({
    status: status as 'draft' | 'pending_analysis' | 'active' | 'expired' | 'terminated' | 'archived' | undefined,
    realtime: true,
  });

  // Contract mutations
  const { deleteContract: deleteContractMutation, updateContract } = useContractMutations();

  // Transform contracts to table rows
  const tableData: ContractRow[] = useMemo(() => {
    if (!contracts || contracts.length === 0) return [];

    // Cast contracts to include tariff fields not yet in generated types
    const typedContracts = contracts as unknown as ContractWithTariff[];

    return typedContracts.map(contract => ({
      _id: contract.id,
      title: contract.title,
      vendorName: contract.vendors?.name,
      contractType: contract.contract_type,
      status: contract.status,
      value: contract.total_value?.toString() ?? null,
      startDate: contract.start_date,
      endDate: contract.end_date,
      analysisStatus: contract.analysis_status,
      _creationTime: new Date(contract.created_at).getTime(),
      // Tariff fields
      totalTariffExposure: contract.total_tariff_exposure,
      tariffRiskLevel: contract.tariff_risk_level as ContractRow['tariffRiskLevel'],
      tariffByCountry: contract.tariff_by_country,
    }));
  }, [contracts]);

  const handleDelete = async (contractId: string) => {
    if (!confirm('Are you sure you want to delete this contract?')) return;

    await deleteContractMutation(contractId, {
      onSuccess: () => {
        toast.success('Contract deleted successfully');
        refetch();
      },
      onError: (err) => {
        toast.error('Failed to delete contract');
        console.error('Delete error:', err);
      }
    });
  };

  const handleStatusChange = async (contractId: string, newStatus: string) => {
    await updateContract(contractId, {
      status: newStatus as "draft" | "pending_analysis" | "active" | "expired" | "terminated" | "archived"
    }, {
      onSuccess: () => {
        toast.success('Contract status updated');
        refetch();
      },
      onError: (err) => {
        toast.error('Failed to update contract status');
        console.error('Status update error:', err);
      }
    });
  };

  const getStatusIcon = (status: string) => {
    const option = statusOptions.find(opt => opt.value === status);
    const Icon = option?.icon || AlertCircle;
    return <Icon className="h-4 w-4" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'draft': return 'secondary';
      case 'pending': return 'outline';
      case 'expired': return 'error';
      case 'terminated': return 'error';
      case 'archived': return 'secondary';
      default: return 'secondary';
    }
  };

  const getTariffRiskColor = (level: string) => {
    switch (level) {
      case 'none': return 'bg-green-50 text-green-700 border-green-200';
      case 'low': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'medium': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'high': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'critical': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getTariffRiskIcon = (level: string) => {
    if (level === 'critical' || level === 'high') return <AlertTriangle className="h-3 w-3" />;
    if (level === 'medium') return <TrendingUp className="h-3 w-3" />;
    return <Shield className="h-3 w-3" />;
  };

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const columns: ColumnDef<ContractRow>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Title" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.getValue('title')}</span>
        </div>
      ),
    },
    {
      accessorKey: 'vendorName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Vendor" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 text-muted-foreground" />
          <span>{row.getValue('vendorName') || 'Unassigned'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'contractType',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => {
        const type = row.getValue('contractType') as string;
        return type ? (
          <Badge variant="outline" className="capitalize">
            {type.replace('_', ' ')}
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return (
          <Badge variant={getStatusColor(status)} className="gap-1">
            {getStatusIcon(status)}
            <span className="capitalize">{status}</span>
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'value',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Value" />
      ),
      cell: ({ row }) => {
        const value = row.getValue('value') as string;
        return value ? (
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span>{value}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      accessorKey: 'endDate',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="End Date" />
      ),
      cell: ({ row }) => {
        const date = row.getValue('endDate') as string;
        if (!date) return <span className="text-muted-foreground">-</span>;
        
        const endDate = new Date(date);
        const isExpiringSoon = endDate < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        
        return (
          <div className={`flex items-center gap-1 ${isExpiringSoon ? 'text-orange-600' : ''}`}>
            <Calendar className="h-4 w-4" />
            <span>{format(endDate, 'MMM dd, yyyy')}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'analysisStatus',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Analysis" />
      ),
      cell: ({ row }) => {
        const status = row.getValue('analysisStatus') as string;
        if (!status) return <span className="text-muted-foreground">-</span>;

        const color = status === 'completed' ? 'text-green-600' :
                     status === 'failed' ? 'text-red-600' :
                     status === 'processing' ? 'text-blue-600' :
                     'text-gray-600';

        return (
          <span className={`text-sm ${color} capitalize`}>
            {status}
          </span>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'totalTariffExposure',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Tariff Exposure" />
      ),
      cell: ({ row }) => {
        const exposure = row.getValue('totalTariffExposure') as number | undefined;
        if (!exposure) return <span className="text-muted-foreground">-</span>;

        return (
          <div className="flex items-center gap-1 font-mono text-sm">
            <DollarSign className="h-3 w-3 text-purple-600" />
            <span className="text-purple-900">{formatCurrency(exposure)}</span>
          </div>
        );
      },
      sortingFn: 'alphanumeric',
    },
    {
      accessorKey: 'tariffRiskLevel',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Tariff Risk" />
      ),
      cell: ({ row }) => {
        const risk = row.getValue('tariffRiskLevel') as string;
        if (!risk || risk === 'unknown') return <span className="text-muted-foreground">-</span>;

        return (
          <Badge className={`gap-1 text-xs border ${getTariffRiskColor(risk)}`}>
            {getTariffRiskIcon(risk)}
            <span className="capitalize">{risk}</span>
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'tariffByCountry',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Countries" />
      ),
      cell: ({ row }) => {
        const byCountry = row.getValue('tariffByCountry') as Record<string, number> | undefined;
        const countries = byCountry ? Object.keys(byCountry) : [];

        if (countries.length === 0) return <span className="text-muted-foreground">-</span>;

        return (
          <div className="flex items-center gap-1">
            <Globe className="h-3 w-3 text-ghost-400" />
            <span className="text-xs font-mono">
              {countries.slice(0, 2).join(', ')}
              {countries.length > 2 && ` +${countries.length - 2}`}
            </span>
          </div>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const contract = row.original;
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => router.push(`/dashboard/contracts/${contract._id}`)}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push(`/dashboard/contracts/${contract._id}/edit`)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleStatusChange(contract._id, 'archived')}
                disabled={contract.status === 'archived'}
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDelete(contract._id)}
                className="text-red-600"
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!contracts || contracts.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Contracts</h2>
          <Button onClick={() => router.push('/dashboard/contracts/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Contract
          </Button>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No contracts found. Create your first contract to get started.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Contracts</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast.info('Export feature coming soon')}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => router.push('/dashboard/contracts/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Contract
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={tableData}
        searchKey="title"
        toolbar={(table) => (
          <>
            <DataTableFacetedFilter
              column={table.getColumn("status")}
              title="Status"
              options={statusOptions}
            />
            <DataTableFacetedFilter
              column={table.getColumn("contractType")}
              title="Type"
              options={contractTypeOptions}
            />
            <DataTableFacetedFilter
              column={table.getColumn("analysisStatus")}
              title="Analysis"
              options={analysisStatusOptions}
            />
            <DataTableFacetedFilter
              column={table.getColumn("tariffRiskLevel")}
              title="Tariff Risk"
              options={tariffRiskOptions}
            />
          </>
        )}
      />
    </div>
  );
}
