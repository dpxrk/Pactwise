'use client';

import { useState, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Grid3x3, Library, Search, PlusCircle } from 'lucide-react';
import dynamic from 'next/dynamic';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

import { mockVendors } from './mockData';
import type { VendorData } from './types';

// Dynamically import 3D components to avoid SSR issues
const VendorLibrary3D = dynamic(
  () => import('./components/VendorLibrary3D'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[600px] bg-ghost-100">
        <LoadingSpinner size="lg" text="Loading 3D Library..." />
      </div>
    )
  }
);

export default function VendorLibraryDemo() {
  const [viewMode, setViewMode] = useState<'3d' | 'grid'>('3d');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedVendor, setSelectedVendor] = useState<VendorData | null>(null);

  // Filter vendors based on search and category
  const filteredVendors = mockVendors.filter((vendor) => {
    const matchesSearch = !searchQuery ||
      vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || vendor.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Calculate stats
  const stats = {
    total: filteredVendors.length,
    active: filteredVendors.filter(v => v.status === 'active').length,
    totalSpend: filteredVendors.reduce((sum, v) => sum + v.annualSpend, 0),
    avgPerformance: Math.round(
      filteredVendors.reduce((sum, v) => sum + v.performanceScore, 0) / filteredVendors.length
    ),
  };

  const handleVendorClick = (vendor: VendorData) => {
    setSelectedVendor(vendor);
  };

  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Header */}
      <div className="border-b border-ghost-300 bg-white">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-purple-900">
                3D Vendor Library Demo
              </h1>
              <p className="text-ghost-700 mt-1">
                An immersive way to explore your vendor ecosystem
              </p>
            </div>
            <Button
              className="bg-purple-900 hover:bg-purple-800 text-white"
            >
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
            <div className="text-center">
              <p className="text-sm text-ghost-600">Total Vendors</p>
              <p className="text-2xl font-bold text-purple-900">{stats.total}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-ghost-600">Active</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-ghost-600">Annual Spend</p>
              <p className="text-2xl font-bold text-purple-900">
                ${(stats.totalSpend / 1000000).toFixed(1)}M
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-ghost-600">Avg Performance</p>
              <p className="text-2xl font-bold text-purple-900">{stats.avgPerformance}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="border-b border-ghost-300 bg-white">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-ghost-500" />
              <Input
                placeholder="Search vendors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white border-ghost-300"
              />
            </div>

            {/* Filters and View Toggle */}
            <div className="flex gap-3">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px] bg-white border-ghost-300">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="services">Services</SelectItem>
                  <SelectItem value="consulting">Consulting</SelectItem>
                  <SelectItem value="manufacturing">Manufacturing</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2 bg-ghost-100 p-1 rounded-lg">
                <Button
                  variant={viewMode === '3d' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('3d')}
                  className={viewMode === '3d' ? 'bg-purple-900 hover:bg-purple-800' : ''}
                >
                  <Library className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={viewMode === 'grid' ? 'bg-purple-900 hover:bg-purple-800' : ''}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {viewMode === '3d' ? (
            <motion.div
              key="3d-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Suspense fallback={
                <div className="flex items-center justify-center h-[600px] bg-white border border-ghost-300 rounded-lg">
                  <LoadingSpinner size="lg" text="Loading 3D Library..." />
                </div>
              }>
                <VendorLibrary3D
                  vendors={filteredVendors}
                  onVendorClick={handleVendorClick}
                  selectedVendor={selectedVendor}
                />
              </Suspense>
            </motion.div>
          ) : (
            <motion.div
              key="grid-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filteredVendors.map((vendor) => (
                <Card
                  key={vendor.id}
                  className="bg-white border-ghost-300 hover:border-purple-500 hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => handleVendorClick(vendor)}
                >
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-semibold text-purple-900">{vendor.name}</h3>
                      <Badge
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
                    </div>
                    <p className="text-sm text-ghost-600 mb-2">{vendor.email}</p>
                    <div className="space-y-2 pt-4 border-t border-ghost-200">
                      <div className="flex justify-between text-sm">
                        <span className="text-ghost-600">Category</span>
                        <span className="font-medium text-purple-900 capitalize">{vendor.category}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-ghost-600">Contracts</span>
                        <span className="font-medium text-purple-900">{vendor.contractCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-ghost-600">Performance</span>
                        <span className="font-medium text-purple-900">{vendor.performanceScore}/100</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Vendor Details Modal */}
      <AnimatePresence>
        {selectedVendor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedVendor(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-purple-900">{selectedVendor.name}</h2>
                  <p className="text-ghost-600 mt-1">{selectedVendor.email}</p>
                </div>
                <Badge
                  className={
                    selectedVendor.status === 'active'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : selectedVendor.status === 'pending'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-ghost-100 text-ghost-600 border-ghost-300'
                  }
                >
                  {selectedVendor.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-sm text-ghost-600 mb-1">Category</p>
                  <p className="font-medium text-purple-900 capitalize">{selectedVendor.category}</p>
                </div>
                <div>
                  <p className="text-sm text-ghost-600 mb-1">Contact Person</p>
                  <p className="font-medium text-purple-900">{selectedVendor.contactPerson}</p>
                </div>
                <div>
                  <p className="text-sm text-ghost-600 mb-1">Active Contracts</p>
                  <p className="font-medium text-purple-900">{selectedVendor.contractCount}</p>
                </div>
                <div>
                  <p className="text-sm text-ghost-600 mb-1">Annual Spend</p>
                  <p className="font-medium text-purple-900">
                    ${(selectedVendor.annualSpend / 1000000).toFixed(2)}M
                  </p>
                </div>
                <div>
                  <p className="text-sm text-ghost-600 mb-1">Performance Score</p>
                  <p className="font-medium text-purple-900">{selectedVendor.performanceScore}/100</p>
                </div>
                <div>
                  <p className="text-sm text-ghost-600 mb-1">Risk Level</p>
                  <Badge
                    variant="outline"
                    className={
                      selectedVendor.riskLevel === 'low'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : selectedVendor.riskLevel === 'medium'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }
                  >
                    {selectedVendor.riskLevel}
                  </Badge>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-ghost-200">
                <Button variant="outline" onClick={() => setSelectedVendor(null)}>
                  Close
                </Button>
                <Button className="bg-purple-900 hover:bg-purple-800 text-white">
                  View Full Details
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
