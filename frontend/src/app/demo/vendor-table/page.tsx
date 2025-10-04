'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  PlusCircle,
  Download,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  Eye,
  Edit2,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  X
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { mockVendors } from '../vendor/mockData';
import type { VendorData } from '../vendor/types';

type SortField = 'name' | 'category' | 'annualSpend' | 'performanceScore' | 'contractCount';
type SortDirection = 'asc' | 'desc';

export default function VendorTableDemo() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set());
  const [selectedVendor, setSelectedVendor] = useState<VendorData | null>(null);

  // Active filters
  const activeFilters = useMemo(() => {
    const filters = [];
    if (categoryFilter !== 'all') filters.push({ type: 'category', value: categoryFilter });
    if (statusFilter !== 'all') filters.push({ type: 'status', value: statusFilter });
    return filters;
  }, [categoryFilter, statusFilter]);

  // Filter and sort vendors
  const processedVendors = useMemo(() => {
    let result = [...mockVendors];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(vendor =>
        vendor.name.toLowerCase().includes(query) ||
        vendor.email.toLowerCase().includes(query) ||
        vendor.contactPerson.toLowerCase().includes(query) ||
        vendor.category.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(vendor => vendor.category === categoryFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(vendor => vendor.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    return result;
  }, [mockVendors, searchQuery, categoryFilter, statusFilter, sortField, sortDirection]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: processedVendors.length,
      active: processedVendors.filter(v => v.status === 'active').length,
      totalSpend: processedVendors.reduce((sum, v) => sum + v.annualSpend, 0),
      atRisk: processedVendors.filter(v => v.riskLevel === 'high').length,
    };
  }, [processedVendors]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedVendors.size === processedVendors.length) {
      setSelectedVendors(new Set());
    } else {
      setSelectedVendors(new Set(processedVendors.map(v => v.id)));
    }
  };

  const toggleSelectVendor = (id: string) => {
    const newSelected = new Set(selectedVendors);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedVendors(newSelected);
  };

  const removeFilter = (type: string) => {
    if (type === 'category') setCategoryFilter('all');
    if (type === 'status') setStatusFilter('all');
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 text-ghost-400" />;
    return sortDirection === 'asc' ?
      <ArrowUp className="h-4 w-4 text-purple-900" /> :
      <ArrowDown className="h-4 w-4 text-purple-900" />;
  };

  const getTrendIcon = (spend: number) => {
    // Mock trend based on spend
    if (spend > 2000000) return <TrendingUp className="h-3 w-3 text-green-600" />;
    if (spend < 1000000) return <TrendingDown className="h-3 w-3 text-red-600" />;
    return <Minus className="h-3 w-3 text-ghost-500" />;
  };

  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Header */}
      <div className="border-b border-ghost-300 bg-white">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-purple-900">
                Vendor Command Center
              </h1>
              <p className="text-ghost-700 mt-1">
                Enterprise-grade vendor management at scale
              </p>
            </div>
            <Button className="bg-purple-900 hover:bg-purple-800 text-white">
              <PlusCircle className="mr-2 h-4 w-4" />
              New Vendor
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="border-b border-ghost-300 bg-white">
        <div className="container mx-auto px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-ghost-600 uppercase tracking-wide">Total Vendors</p>
              <p className="text-2xl font-bold text-purple-900">{stats.total}</p>
            </div>
            <div>
              <p className="text-xs text-ghost-600 uppercase tracking-wide">Active</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <div>
              <p className="text-xs text-ghost-600 uppercase tracking-wide">Annual Spend</p>
              <p className="text-2xl font-bold text-purple-900">
                ${(stats.totalSpend / 1000000).toFixed(1)}M
              </p>
            </div>
            <div>
              <p className="text-xs text-ghost-600 uppercase tracking-wide">At Risk</p>
              <p className="text-2xl font-bold text-amber-600">{stats.atRisk}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="border-b border-ghost-300 bg-white sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-6 py-4 space-y-4">
          {/* Search Bar */}
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-ghost-500" />
              <Input
                placeholder="Search vendors by name, email, contact, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white border-ghost-300"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-ghost-300">
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="p-2 space-y-2">
                  <div>
                    <p className="text-xs font-semibold text-ghost-700 mb-1">Category</p>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-ghost-300 rounded"
                    >
                      <option value="all">All Categories</option>
                      <option value="technology">Technology</option>
                      <option value="services">Services</option>
                      <option value="consulting">Consulting</option>
                      <option value="manufacturing">Manufacturing</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-ghost-700 mb-1">Status</p>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-ghost-300 rounded"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" className="border-ghost-300">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>

          {/* Active Filters */}
          {activeFilters.length > 0 && (
            <div className="flex gap-2 items-center flex-wrap">
              <span className="text-sm text-ghost-600">Active filters:</span>
              {activeFilters.map((filter, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="bg-purple-50 text-purple-900 border-purple-200"
                >
                  {filter.type}: {filter.value}
                  <X
                    className="ml-1 h-3 w-3 cursor-pointer"
                    onClick={() => removeFilter(filter.type)}
                  />
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCategoryFilter('all');
                  setStatusFilter('all');
                }}
                className="text-xs h-6"
              >
                Clear all
              </Button>
            </div>
          )}

          {/* Selected Count */}
          {selectedVendors.size > 0 && (
            <div className="flex gap-2 items-center">
              <Badge variant="outline" className="bg-purple-900 text-white border-purple-900">
                {selectedVendors.size} selected
              </Badge>
              <Button variant="ghost" size="sm" onClick={() => setSelectedVendors(new Set())}>
                Clear selection
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="container mx-auto px-6 py-6">
        <Card className="bg-white border-ghost-300">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                {/* Table Header */}
                <thead className="bg-ghost-100 border-b border-ghost-300">
                  <tr>
                    <th className="w-12 p-4">
                      <input
                        type="checkbox"
                        checked={selectedVendors.size === processedVendors.length && processedVendors.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-ghost-300"
                      />
                    </th>
                    <th className="text-left p-4">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center gap-2 text-sm font-semibold text-ghost-700 hover:text-purple-900"
                      >
                        Vendor Name
                        <SortIcon field="name" />
                      </button>
                    </th>
                    <th className="text-left p-4">
                      <button
                        onClick={() => handleSort('category')}
                        className="flex items-center gap-2 text-sm font-semibold text-ghost-700 hover:text-purple-900"
                      >
                        Category
                        <SortIcon field="category" />
                      </button>
                    </th>
                    <th className="text-right p-4">
                      <button
                        onClick={() => handleSort('contractCount')}
                        className="flex items-center gap-2 text-sm font-semibold text-ghost-700 hover:text-purple-900 ml-auto"
                      >
                        Contracts
                        <SortIcon field="contractCount" />
                      </button>
                    </th>
                    <th className="text-right p-4">
                      <button
                        onClick={() => handleSort('annualSpend')}
                        className="flex items-center gap-2 text-sm font-semibold text-ghost-700 hover:text-purple-900 ml-auto"
                      >
                        Annual Spend
                        <SortIcon field="annualSpend" />
                      </button>
                    </th>
                    <th className="text-right p-4">
                      <button
                        onClick={() => handleSort('performanceScore')}
                        className="flex items-center gap-2 text-sm font-semibold text-ghost-700 hover:text-purple-900 ml-auto"
                      >
                        Score
                        <SortIcon field="performanceScore" />
                      </button>
                    </th>
                    <th className="text-center p-4">
                      <span className="text-sm font-semibold text-ghost-700">Status</span>
                    </th>
                    <th className="w-12 p-4"></th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-ghost-200">
                  {processedVendors.map((vendor) => (
                    <tr
                      key={vendor.id}
                      className="hover:bg-ghost-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedVendor(vendor)}
                    >
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedVendors.has(vendor.id)}
                          onChange={() => toggleSelectVendor(vendor.id)}
                          className="rounded border-ghost-300"
                        />
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-semibold text-purple-900">{vendor.name}</p>
                          <p className="text-sm text-ghost-600">{vendor.contactPerson}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-ghost-700 capitalize">{vendor.category}</span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-sm font-medium text-ghost-900">{vendor.contractCount}</span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {getTrendIcon(vendor.annualSpend)}
                          <span className="text-sm font-medium text-ghost-900">
                            ${(vendor.annualSpend / 1000000).toFixed(2)}M
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-ghost-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                vendor.performanceScore >= 90 ? 'bg-green-600' :
                                vendor.performanceScore >= 75 ? 'bg-purple-500' :
                                'bg-amber-600'
                              }`}
                              style={{ width: `${vendor.performanceScore}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-ghost-900 w-8">
                            {vendor.performanceScore}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge
                          variant="outline"
                          className={
                            vendor.status === 'active'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : vendor.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-ghost-100 text-ghost-600 border-ghost-300'
                          }
                        >
                          {vendor.status}
                        </Badge>
                      </td>
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit2 className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="border-t border-ghost-200 p-4 flex items-center justify-between">
              <p className="text-sm text-ghost-600">
                Showing {processedVendors.length} of {mockVendors.length} vendors
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled>
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
