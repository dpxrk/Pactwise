'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Command as CommandIcon,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Edit,
  MoreHorizontal,
  Star,
  DollarSign,
  Activity,
  Users,
  Filter,
  SortAsc,
  ChevronRight,
  FileText,
  Settings,
  Plus,
  X,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Building2,
  CreditCard,
  Shield
} from 'lucide-react';
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from 'cmdk';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparklines, SparklinesLine } from 'react-sparklines';
import { mockVendors } from '../vendor/mockData';
import type { VendorData } from '../vendor/types';

// Compute vendor importance score
const calculateImportance = (vendor: VendorData): number => {
  const spendWeight = (vendor.annualSpend / 5000000) * 40; // Max 40 points
  const performanceWeight = (vendor.performanceScore / 100) * 30; // Max 30 points
  const contractWeight = Math.min(vendor.contractCount * 3, 30); // Max 30 points
  return Math.min(spendWeight + performanceWeight + contractWeight, 100);
};

// Generate mock sparkline data (3-month trend)
const generateSpendTrend = (baseSpend: number): number[] => {
  const variation = 0.15; // 15% variation
  return Array.from({ length: 12 }, (_, i) => {
    const trend = Math.sin(i / 2) * variation;
    const random = (Math.random() - 0.5) * 0.1;
    return baseSpend * (1 + trend + random);
  });
};

type ViewMode = 'all' | 'focus' | 'grouped';
type SortField = 'name' | 'spend' | 'performance' | 'contracts';
type FilterCondition = {
  field: 'spend' | 'performance' | 'risk' | 'status' | 'category';
  operator: '>' | '<' | '=' | '!=';
  value: string | number;
};
type FilterPreset = 'all' | 'high-risk' | 'top-performers' | 'needs-review' | 'custom';

export default function VendorFluidTable() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [sortField, setSortField] = useState<SortField>('spend');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ vendorId: string; field: string } | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [filterPreset, setFilterPreset] = useState<FilterPreset>('all');
  const [customFilters, setCustomFilters] = useState<FilterCondition[]>([]);

  // Compute vendor importance and sort
  const processedVendors = useMemo(() => {
    let vendors = mockVendors.map(v => ({
      ...v,
      importance: calculateImportance(v),
      spendTrend: generateSpendTrend(v.annualSpend)
    }));

    // Apply filter presets
    if (filterPreset === 'high-risk') {
      vendors = vendors.filter(v => v.riskLevel === 'high');
    } else if (filterPreset === 'top-performers') {
      vendors = vendors.filter(v => v.performanceScore >= 90);
    } else if (filterPreset === 'needs-review') {
      vendors = vendors.filter(v => v.riskLevel === 'medium' || v.status === 'pending');
    }

    // Apply custom filters
    if (filterPreset === 'custom' && customFilters.length > 0) {
      vendors = vendors.filter(v => {
        return customFilters.every(filter => {
          switch (filter.field) {
            case 'spend':
              const spend = v.annualSpend;
              if (filter.operator === '>') return spend > Number(filter.value);
              if (filter.operator === '<') return spend < Number(filter.value);
              return spend === Number(filter.value);
            case 'performance':
              const perf = v.performanceScore;
              if (filter.operator === '>') return perf > Number(filter.value);
              if (filter.operator === '<') return perf < Number(filter.value);
              return perf === Number(filter.value);
            case 'risk':
              return filter.operator === '=' ? v.riskLevel === filter.value : v.riskLevel !== filter.value;
            case 'status':
              return filter.operator === '=' ? v.status === filter.value : v.status !== filter.value;
            case 'category':
              return filter.operator === '=' ? v.category === filter.value : v.category !== filter.value;
            default:
              return true;
          }
        });
      });
    }

    // Filter by search
    if (searchQuery) {
      vendors = vendors.filter(v =>
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    vendors.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'spend':
          comparison = a.annualSpend - b.annualSpend;
          break;
        case 'performance':
          comparison = a.performanceScore - b.performanceScore;
          break;
        case 'contracts':
          comparison = a.contractCount - b.contractCount;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return vendors;
  }, [mockVendors, searchQuery, sortField, sortDirection, filterPreset, customFilters]);

  // Group by category
  const groupedVendors = useMemo(() => {
    const groups: Record<string, typeof processedVendors> = {};
    processedVendors.forEach(v => {
      if (!groups[v.category]) groups[v.category] = [];
      groups[v.category].push(v);
    });
    return groups;
  }, [processedVendors]);

  // Command actions
  const runCommand = useCallback((command: () => void) => {
    setCommandOpen(false);
    command();
  }, []);

  // Navigate to next/previous vendor in preview
  const navigatePreview = useCallback((direction: 'next' | 'prev') => {
    if (!selectedVendor || processedVendors.length === 0) return;

    const currentIndex = processedVendors.findIndex(v => v.id === selectedVendor);
    if (currentIndex === -1) return;

    const newIndex = direction === 'next'
      ? Math.min(currentIndex + 1, processedVendors.length - 1)
      : Math.max(currentIndex - 1, 0);

    setSelectedVendor(processedVendors[newIndex].id);
    setSelectedIndex(newIndex);
  }, [selectedVendor, processedVendors]);

  // Keyboard shortcuts
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Command palette (⌘K or Ctrl+K)
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !editingCell)) {
        e.preventDefault();
        setCommandOpen(true);
      }

      // Preview panel navigation with arrow keys (when preview is open)
      if (previewOpen && selectedVendor) {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          navigatePreview('next');
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          navigatePreview('prev');
        }
      }

      // Arrow navigation (when not editing and preview not open)
      if (!editingCell && !previewOpen && processedVendors.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, processedVendors.length - 1));
          setSelectedVendor(processedVendors[Math.min(selectedIndex + 1, processedVendors.length - 1)].id);
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          setSelectedVendor(processedVendors[Math.max(selectedIndex - 1, 0)].id);
        }
      }

      // Edit mode (E key)
      if (e.key === 'e' && !editingCell && selectedVendor) {
        e.preventDefault();
        setEditingCell({ vendorId: selectedVendor, field: 'name' });
      }

      // Escape to clear selection/editing/preview
      if (e.key === 'Escape') {
        if (previewOpen) {
          setPreviewOpen(false);
        } else {
          setSelectedVendor(null);
          setEditingCell(null);
        }
      }

      // View mode shortcuts
      if (e.key === '1' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setViewMode('all');
      }
      if (e.key === '2' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setViewMode('focus');
      }
      if (e.key === '3' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setViewMode('grouped');
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [selectedVendor, editingCell, selectedIndex, processedVendors, previewOpen, navigatePreview]);

  // Get row height based on importance
  const getRowHeight = (importance: number): string => {
    if (viewMode === 'focus' && selectedVendor) return 'h-16';
    if (importance >= 80) return 'h-24'; // High importance - expanded
    if (importance >= 50) return 'h-20'; // Medium importance
    return 'h-16'; // Low importance - collapsed
  };

  // Risk badge color
  const getRiskColor = (risk: VendorData['riskLevel']) => {
    switch (risk) {
      case 'low': return 'bg-green-50 text-green-700 border-green-200';
      case 'medium': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'high': return 'bg-red-50 text-red-700 border-red-200';
    }
  };

  // Status badge color
  const getStatusColor = (status: VendorData['status']) => {
    switch (status) {
      case 'active': return 'bg-purple-50 text-purple-900 border-purple-200';
      case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'inactive': return 'bg-ghost-200 text-ghost-700 border-ghost-300';
    }
  };

  const VendorCard = ({ vendor, index }: { vendor: VendorData & { importance: number; spendTrend: number[] }; index: number }) => {
    const isFocused = selectedVendor === vendor.id;

    return (
      <div
        className="relative group cursor-pointer h-full"
        style={{ perspective: '1000px' }}
        onClick={() => {
          setSelectedVendor(vendor.id);
          setPreviewOpen(true);
        }}
      >
        {/* Card Background with 3D effect */}
        <div
          className={`
            h-full p-5 rounded-xl
            bg-white
            border
            transition-all duration-300 ease-out
            flex flex-col
            transform-gpu
            ${isFocused
              ? 'border-purple-400 ring-2 ring-purple-200 -translate-y-2'
              : 'border-ghost-200 hover:border-purple-200 hover:-translate-y-1'
            }
          `}
          style={{
            transformStyle: 'preserve-3d',
            boxShadow: isFocused
              ? '0 25px 50px -12px rgba(158, 130, 156, 0.3), 0 12px 24px -8px rgba(158, 130, 156, 0.2), 0 8px 16px -4px rgba(158, 130, 156, 0.15)'
              : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          }}
        >
          {/* Shine effect overlay */}
          <div
            className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 100%)',
              transform: 'translateZ(1px)',
            }}
          />

          {/* Importance indicator bar */}
          <div
            className="absolute top-0 left-0 right-0 h-1 rounded-t-xl z-10"
            style={{
              background: vendor.importance >= 80
                ? 'linear-gradient(to right, #9e829c, #291528)'
                : vendor.importance >= 50
                ? 'linear-gradient(to right, #c388bb, #9e829c)'
                : '#e1e0e9'
            }}
          />

        <div className="flex flex-col gap-3 flex-1 relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-ghost-900 text-base group-hover:text-purple-900 transition-colors truncate">
                {vendor.name}
              </h3>
              <p className="text-xs text-ghost-600 mt-1">{vendor.category}</p>
            </div>
            <Badge className={`${getStatusColor(vendor.status)} text-xs px-2 py-1 shrink-0`}>
              {vendor.status}
            </Badge>
          </div>

          {/* Contact */}
          <div className="text-xs text-ghost-600 space-y-1">
            <div className="flex items-center gap-2 truncate">
              <Users className="w-3 h-3 shrink-0" />
              <span className="truncate">{vendor.contactPerson}</span>
            </div>
            <div className="flex items-center gap-2 truncate">
              <Mail className="w-3 h-3 shrink-0" />
              <span className="truncate">{vendor.email}</span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-ghost-200 my-1"></div>

          {/* Metrics */}
          <div className="space-y-3">
            {/* Spend */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-ghost-600">Annual Spend</span>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-ghost-900 text-sm">
                    ${(vendor.annualSpend / 1000000).toFixed(1)}M
                  </span>
                  {vendor.annualSpend > 1000000 ? (
                    <TrendingUp className="w-3 h-3 text-green-600" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-amber-600" />
                  )}
                </div>
              </div>
              <Sparklines data={vendor.spendTrend} height={32} margin={2}>
                <SparklinesLine
                  color={vendor.annualSpend > 1000000 ? '#059669' : '#9e829c'}
                  style={{ strokeWidth: 1.5, fill: 'none' }}
                />
              </Sparklines>
            </div>

            {/* Performance */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-ghost-600">Performance</span>
                <span className="text-xs font-medium text-ghost-700">
                  {vendor.performanceScore}%
                </span>
              </div>
              <div className="h-2 bg-ghost-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    vendor.performanceScore >= 90 ? 'bg-green-500' :
                    vendor.performanceScore >= 75 ? 'bg-purple-500' :
                    'bg-amber-500'
                  }`}
                  style={{ width: `${vendor.performanceScore}%` }}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-auto pt-3 border-t border-ghost-200">
            <Badge className={`${getRiskColor(vendor.riskLevel)} text-xs px-2 py-1 flex items-center gap-1`}>
              {vendor.riskLevel === 'high' && <AlertTriangle className="w-3 h-3" />}
              {vendor.riskLevel === 'low' && <CheckCircle className="w-3 h-3" />}
              {vendor.riskLevel === 'medium' && <Clock className="w-3 h-3" />}
              {vendor.riskLevel}
            </Badge>
            <span className="text-xs text-ghost-600">{vendor.contractCount} contracts</span>
          </div>
        </div>
        </div>
      </div>
    );
  };

  const CategoryGroup = ({ category, vendors }: { category: string; vendors: (VendorData & { importance: number; spendTrend: number[] })[] }) => {
    const totalSpend = vendors.reduce((sum, v) => sum + v.annualSpend, 0);
    const avgPerformance = vendors.reduce((sum, v) => sum + v.performanceScore, 0) / vendors.length;

    return (
      <div className="mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-ghost-200 px-6 py-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 flex-1">
              <ChevronRight className="w-4 h-4 text-purple-600" />
              <h2 className="font-semibold text-ghost-900 uppercase text-xs tracking-wide">
                {category}
              </h2>
              <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                {vendors.length}
              </Badge>
            </div>
            <div className="flex items-center gap-6 text-xs text-ghost-600">
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                ${(totalSpend / 1000000).toFixed(1)}M total
              </span>
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                {avgPerformance.toFixed(0)}% avg performance
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {vendors.map((vendor, idx) => (
            <VendorCard key={vendor.id} vendor={vendor} index={idx} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Command Palette */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => runCommand(() => console.log('New vendor'))}>
              <Plus className="mr-2 h-4 w-4" />
              <span>Add New Vendor</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setViewMode('focus'))}>
              <Eye className="mr-2 h-4 w-4" />
              <span>Toggle Focus Mode</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setViewMode('grouped'))}>
              <ChevronRight className="mr-2 h-4 w-4" />
              <span>Group by Category</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Sort By">
            <CommandItem onSelect={() => runCommand(() => setSortField('spend'))}>
              <DollarSign className="mr-2 h-4 w-4" />
              <span>Annual Spend</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setSortField('performance'))}>
              <Activity className="mr-2 h-4 w-4" />
              <span>Performance Score</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setSortField('name'))}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Name</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Vendors">
            {processedVendors.slice(0, 8).map((vendor) => (
              <CommandItem
                key={vendor.id}
                onSelect={() => runCommand(() => setSelectedVendor(vendor.id))}
              >
                <Users className="mr-2 h-4 w-4" />
                <span>{vendor.name}</span>
                <span className="ml-auto text-xs text-ghost-500">
                  ${(vendor.annualSpend / 1000000).toFixed(1)}M
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* Header */}
      <div className="border-b border-ghost-200 bg-white sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-ghost-900">Vendor Management</h1>
              <p className="text-sm text-ghost-600 mt-1">
                {processedVendors.length} vendors • Variable density view
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className={`${viewMode === 'all' ? 'bg-purple-50 border-purple-200 text-purple-900' : ''}`}
                onClick={() => setViewMode('all')}
              >
                All View
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`${viewMode === 'focus' ? 'bg-purple-50 border-purple-200 text-purple-900' : ''}`}
                onClick={() => setViewMode('focus')}
              >
                <Eye className="w-4 h-4 mr-2" />
                Focus Mode
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`${viewMode === 'grouped' ? 'bg-purple-50 border-purple-200 text-purple-900' : ''}`}
                onClick={() => setViewMode('grouped')}
              >
                Grouped
              </Button>
            </div>
          </div>

          {/* Search & Controls */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ghost-400" />
              <Input
                placeholder="Search vendors... (⌘K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-ghost-300 focus:border-purple-500 focus:ring-purple-500"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-ghost-500 bg-ghost-100 border border-ghost-300 rounded">
                ⌘K
              </kbd>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <SortAsc className="w-4 h-4" />
              Sort: {sortField}
            </Button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 mt-3">
            <Filter className="w-4 h-4 text-ghost-500" />
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className={`h-7 text-xs ${filterPreset === 'all' ? 'bg-purple-50 border-purple-200 text-purple-900' : ''}`}
                onClick={() => setFilterPreset('all')}
              >
                All Vendors
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`h-7 text-xs ${filterPreset === 'high-risk' ? 'bg-red-50 border-red-200 text-red-900' : ''}`}
                onClick={() => setFilterPreset('high-risk')}
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                High Risk
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`h-7 text-xs ${filterPreset === 'top-performers' ? 'bg-green-50 border-green-200 text-green-900' : ''}`}
                onClick={() => setFilterPreset('top-performers')}
              >
                <Star className="w-3 h-3 mr-1" />
                Top Performers
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`h-7 text-xs ${filterPreset === 'needs-review' ? 'bg-amber-50 border-amber-200 text-amber-900' : ''}`}
                onClick={() => setFilterPreset('needs-review')}
              >
                <Clock className="w-3 h-3 mr-1" />
                Needs Review
              </Button>
            </div>
            {filterPreset !== 'all' && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-ghost-500 hover:text-ghost-900"
                onClick={() => setFilterPreset('all')}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="bg-gradient-to-b from-ghost-50 to-ghost-100 min-h-screen py-6 px-6">
        {viewMode === 'grouped' ? (
          Object.entries(groupedVendors).map(([category, vendors]) => (
            <CategoryGroup key={category} category={category} vendors={vendors} />
          ))
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {processedVendors.map((vendor, idx) => (
              <VendorCard key={vendor.id} vendor={vendor} index={idx} />
            ))}
          </div>
        )}
      </div>

      {/* Quick Preview Panel */}
      <AnimatePresence>
        {previewOpen && selectedVendor && processedVendors.find(v => v.id === selectedVendor) && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-screen w-[480px] bg-white border-l border-ghost-300 shadow-2xl z-50 overflow-y-auto"
          >
            {(() => {
              const vendor = processedVendors.find(v => v.id === selectedVendor)!;
              const currentIndex = processedVendors.findIndex(v => v.id === selectedVendor);

              return (
                <div className="h-full flex flex-col">
                  {/* Header */}
                  <div className="sticky top-0 bg-white border-b border-ghost-200 px-6 py-4 z-10">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-xl font-bold text-ghost-900">{vendor.name}</h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setPreviewOpen(false)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(vendor.status)}>
                        {vendor.status}
                      </Badge>
                      <Badge className={getRiskColor(vendor.riskLevel)}>
                        {vendor.riskLevel} risk
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-3 text-xs text-ghost-600">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={currentIndex === 0}
                        onClick={() => navigatePreview('prev')}
                      >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Prev
                      </Button>
                      <span className="text-ghost-500">
                        {currentIndex + 1} / {processedVendors.length}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={currentIndex === processedVendors.length - 1}
                        onClick={() => navigatePreview('next')}
                      >
                        Next
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 px-6 py-6 space-y-6 overflow-y-auto">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-purple-50 to-white p-4 rounded-lg border border-purple-100">
                        <div className="text-xs text-ghost-600 mb-1 flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          Annual Spend
                        </div>
                        <div className="text-2xl font-bold text-purple-900">
                          ${(vendor.annualSpend / 1000000).toFixed(2)}M
                        </div>
                        <div className="mt-3">
                          <Sparklines data={vendor.spendTrend} height={40}>
                            <SparklinesLine color="#9e829c" style={{ strokeWidth: 2, fill: 'none' }} />
                          </Sparklines>
                        </div>
                        <div className="text-xs text-ghost-600 mt-2">12-month trend</div>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-white p-4 rounded-lg border border-green-100">
                        <div className="text-xs text-ghost-600 mb-1 flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          Performance Score
                        </div>
                        <div className="text-2xl font-bold text-green-900">
                          {vendor.performanceScore}%
                        </div>
                        <div className="flex items-center gap-0.5 mt-3">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < Math.floor(vendor.performanceScore / 20)
                                  ? 'fill-purple-500 text-purple-500'
                                  : 'text-ghost-300'
                              }`}
                            />
                          ))}
                        </div>
                        <div className="text-xs text-ghost-600 mt-2">
                          {vendor.performanceScore >= 90 ? 'Excellent' : vendor.performanceScore >= 75 ? 'Good' : 'Needs Improvement'}
                        </div>
                      </div>
                    </div>

                    {/* Additional Metrics */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-ghost-50 p-3 rounded-lg text-center">
                        <FileText className="w-5 h-5 mx-auto text-ghost-600 mb-1" />
                        <div className="text-lg font-bold text-ghost-900">{vendor.contractCount}</div>
                        <div className="text-xs text-ghost-600">Contracts</div>
                      </div>
                      <div className="bg-ghost-50 p-3 rounded-lg text-center">
                        <Shield className="w-5 h-5 mx-auto text-ghost-600 mb-1" />
                        <div className="text-lg font-bold text-ghost-900 capitalize">{vendor.riskLevel}</div>
                        <div className="text-xs text-ghost-600">Risk Level</div>
                      </div>
                      <div className="bg-ghost-50 p-3 rounded-lg text-center">
                        <Activity className="w-5 h-5 mx-auto text-ghost-600 mb-1" />
                        <div className="text-lg font-bold text-ghost-900">{vendor.importance.toFixed(0)}</div>
                        <div className="text-xs text-ghost-600">Importance</div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="bg-white border border-ghost-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-ghost-900 mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-600" />
                        Contact Information
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <Users className="w-4 h-4 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <div className="text-xs text-ghost-600">Contact Person</div>
                            <div className="text-sm font-medium text-ghost-900">{vendor.contactPerson}</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <Mail className="w-4 h-4 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <div className="text-xs text-ghost-600">Email Address</div>
                            <div className="text-sm text-purple-700 hover:underline cursor-pointer">{vendor.email}</div>
                          </div>
                        </div>
                        {vendor.phone && (
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                              <Phone className="w-4 h-4 text-purple-600" />
                            </div>
                            <div className="flex-1">
                              <div className="text-xs text-ghost-600">Phone Number</div>
                              <div className="text-sm font-medium text-ghost-900">{vendor.phone}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Vendor Details */}
                    <div className="bg-white border border-ghost-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-ghost-900 mb-3 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-purple-600" />
                        Vendor Details
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm py-2 border-b border-ghost-100">
                          <span className="text-ghost-600">Category</span>
                          <Badge className="bg-purple-50 text-purple-700 border-purple-200 capitalize">
                            {vendor.category}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm py-2 border-b border-ghost-100">
                          <span className="text-ghost-600">Status</span>
                          <Badge className={getStatusColor(vendor.status) + ' capitalize'}>
                            {vendor.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm py-2 border-b border-ghost-100">
                          <span className="text-ghost-600">Risk Assessment</span>
                          <Badge className={getRiskColor(vendor.riskLevel) + ' capitalize'}>
                            {vendor.riskLevel === 'high' && <AlertTriangle className="w-3 h-3 mr-1" />}
                            {vendor.riskLevel === 'low' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {vendor.riskLevel === 'medium' && <Clock className="w-3 h-3 mr-1" />}
                            {vendor.riskLevel} risk
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm py-2">
                          <span className="text-ghost-600">Importance Score</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-ghost-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"
                                style={{ width: `${vendor.importance}%` }}
                              />
                            </div>
                            <span className="font-semibold text-ghost-900 text-xs">{vendor.importance.toFixed(0)}/100</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white border border-ghost-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-ghost-900 mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-purple-600" />
                        Recent Activity
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 text-sm">
                          <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                          <div className="flex-1">
                            <div className="text-ghost-900">Contract renewal completed</div>
                            <div className="text-xs text-ghost-500">2 days ago</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 text-sm">
                          <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5" />
                          <div className="flex-1">
                            <div className="text-ghost-900">Performance review submitted</div>
                            <div className="text-xs text-ghost-500">1 week ago</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 text-sm">
                          <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5" />
                          <div className="flex-1">
                            <div className="text-ghost-900">Payment processed</div>
                            <div className="text-xs text-ghost-500">2 weeks ago</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="sticky bottom-0 bg-white pt-4 pb-2 border-t border-ghost-200">
                      <div className="grid grid-cols-2 gap-3">
                        <Button className="w-full gap-2 bg-purple-900 hover:bg-purple-800 text-white">
                          <Edit className="w-4 h-4" />
                          Edit Vendor
                        </Button>
                        <Button variant="outline" className="w-full gap-2 border-purple-200 text-purple-900 hover:bg-purple-50">
                          <FileText className="w-4 h-4" />
                          View Contracts
                        </Button>
                      </div>
                      <Button variant="ghost" className="w-full mt-2 text-ghost-600 hover:text-ghost-900">
                        View Full Profile →
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard hints */}
      <div className={`fixed bottom-6 bg-white border border-ghost-300 rounded-lg shadow-lg p-4 text-xs text-ghost-600 transition-all ${previewOpen ? 'right-[496px]' : 'right-6'}`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-ghost-100 border border-ghost-300 rounded">⌘K</kbd>
            <span>Command</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-ghost-100 border border-ghost-300 rounded">↑↓</kbd>
            <span>Navigate</span>
          </div>
          {previewOpen && (
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-ghost-100 border border-ghost-300 rounded">←→</kbd>
              <span>Preview Nav</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-ghost-100 border border-ghost-300 rounded">E</kbd>
            <span>Edit</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-ghost-100 border border-ghost-300 rounded">ESC</kbd>
            <span>Clear</span>
          </div>
        </div>
      </div>
    </div>
  );
}
