'use client'

import {
  Search,
  PlusCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Award,
  AlertTriangle,
  CheckCircle2,
  Building2,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  X
} from "lucide-react";
import React, { useMemo, useState, useEffect } from "react";
import { Sparklines, SparklinesLine } from 'react-sparklines';
import { motion, AnimatePresence } from 'framer-motion';

import VendorDetails from "@/app/_components/vendor/VendorDetails";
import VendorForm from "@/app/_components/vendor/VendorForm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVendors, useVendorMutations } from "@/hooks/useVendors";
import { useDashboardStore } from "@/stores/dashboard-store";
import { Tables } from "@/types/database.types";

type Vendor = Tables<'vendors'>;

const AllVendors = () => {
  const { vendors = [], isLoading: vendorsLoading, error: vendorsError, refetch } = useVendors({ realtime: true });
  const { createVendor, updateVendor, isLoading: mutationLoading } = useVendorMutations();
  const { searchQuery, setSearchQuery } = useDashboardStore();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isVendorFormOpen, setIsVendorFormOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter vendors based on search and category
  const filteredVendors = useMemo(() => {
    if (!Array.isArray(vendors)) return [];

    return vendors.filter((vendor: Vendor) => {
      const matchesSearch =
        !searchQuery ||
        vendor.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.email?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        categoryFilter === "all" || vendor.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [vendors, searchQuery, categoryFilter]);

  // Calculate comprehensive vendor statistics
  const stats = useMemo(() => {
    const contractCount = filteredVendors.reduce(
      (sum, vendor) => sum + (vendor.contracts?.length || 0),
      0
    );

    // Mock financial data - in production, this would come from contracts
    const totalSpend = filteredVendors.reduce((sum, vendor) => {
      return sum + (vendor.contracts?.length || 0) * 50000; // Mock calculation
    }, 0);

    const activeVendors = filteredVendors.filter((v) => v.status === "active");
    const pendingVendors = filteredVendors.filter((v) => v.status === "pending");
    const inactiveVendors = filteredVendors.filter((v) => v.status === "inactive");

    // Mock performance metrics
    const avgPerformance = 87; // Mock average performance score
    const highPerformers = Math.floor(activeVendors.length * 0.65); // 65% high performers
    const atRisk = Math.floor(activeVendors.length * 0.15); // 15% at risk

    return {
      total: filteredVendors.length,
      activeCount: activeVendors.length,
      pendingCount: pendingVendors.length,
      inactiveCount: inactiveVendors.length,
      contractCount,
      totalSpend,
      avgPerformance,
      highPerformers,
      atRisk,
      monthlyChange: 5.2, // Mock monthly growth
      spendChange: -8.5, // Mock spend reduction
    };
  }, [filteredVendors]);

  const handleCreateVendor = async (vendorData: Partial<Vendor>) => {
    try {
      await createVendor(vendorData as any, {
        onSuccess: () => {
          setIsVendorFormOpen(false);
          refetch();
        },
        onError: (error) => {
          console.error('Failed to create vendor:', error);
        }
      });
    } catch (error) {
      console.error('Failed to create vendor:', error);
    }
  };

  const handleEditVendor = async (vendorData: Partial<Vendor>) => {
    if (!selectedVendor) return;

    try {
      await updateVendor(selectedVendor.id, vendorData as any, {
        onSuccess: () => {
          setSelectedVendor({ ...selectedVendor, ...vendorData } as Vendor);
          refetch();
        },
        onError: (error) => {
          console.error('Failed to update vendor:', error);
        }
      });
    } catch (error) {
      console.error('Failed to update vendor:', error);
    }
  };

  const handleViewVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsDetailsModalOpen(true);
  };

  const handleUpdateVendor = (updatedVendor: Vendor) => {
    setSelectedVendor(updatedVendor);
  };

  if (!mounted) {
    return null;
  }

  // Loading state
  if (vendorsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#f0eff4' }}>
        <LoadingSpinner size="lg" text="Loading vendors..." />
      </div>
    );
  }

  // Error state
  if (vendorsError) {
    return (
      <div className="p-6 min-h-screen" style={{ backgroundColor: '#f0eff4' }}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Vendors</AlertTitle>
          <AlertDescription>
            {vendorsError.message || "An error occurred while loading vendors"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 min-h-screen bg-ghost-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-purple-900">Vendor Management</h1>
          <p className="text-ghost-700 mt-1">Comprehensive vendor analytics and performance tracking</p>
        </div>
        <Button
          className="bg-purple-900 hover:bg-purple-800 text-white"
          onClick={() => setIsVendorFormOpen(true)}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          New Vendor
        </Button>
      </div>

      {/* Key Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Spend */}
        <Card className="bg-white border-ghost-300 hover:shadow-lg transition-all">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-ghost-700">Total Annual Spend</CardTitle>
              <div className="p-2 bg-purple-50 rounded-lg">
                <DollarSign className="h-4 w-4 text-purple-900" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-purple-900">
                ${(stats.totalSpend / 1000000).toFixed(1)}M
              </div>
              <div className="flex items-center gap-1 text-sm">
                {stats.spendChange < 0 ? (
                  <>
                    <ArrowDownRight className="h-4 w-4 text-green-600" />
                    <span className="text-green-600 font-medium">{Math.abs(stats.spendChange)}% savings</span>
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="h-4 w-4 text-purple-500" />
                    <span className="text-purple-500 font-medium">{stats.spendChange}% increase</span>
                  </>
                )}
                <span className="text-ghost-500">vs last month</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Vendors */}
        <Card className="bg-white border-ghost-300 hover:shadow-lg transition-all">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-ghost-700">Active Vendors</CardTitle>
              <div className="p-2 bg-purple-50 rounded-lg">
                <Building2 className="h-4 w-4 text-purple-900" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-purple-900">{stats.activeCount}</div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  {stats.pendingCount} pending
                </Badge>
                <Badge variant="outline" className="text-xs bg-ghost-100 text-ghost-600 border-ghost-300">
                  {stats.inactiveCount} inactive
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Score */}
        <Card className="bg-white border-ghost-300 hover:shadow-lg transition-all">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-ghost-700">Avg Performance</CardTitle>
              <div className="p-2 bg-purple-50 rounded-lg">
                <Award className="h-4 w-4 text-purple-900" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-purple-900">{stats.avgPerformance}/100</div>
              <div className="flex items-center gap-1 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-ghost-600">{stats.highPerformers} high performers</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* At Risk */}
        <Card className="bg-white border-ghost-300 hover:shadow-lg transition-all">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-ghost-700">Risk Overview</CardTitle>
              <div className="p-2 bg-purple-50 rounded-lg">
                <BarChart3 className="h-4 w-4 text-purple-900" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-purple-900">{stats.atRisk}</div>
              <div className="flex items-center gap-1 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-ghost-600">vendors need attention</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Different Views */}
      <Tabs defaultValue="all" className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TabsList className="bg-white border border-ghost-300">
            <TabsTrigger value="all" className="data-[state=active]:bg-purple-900 data-[state=active]:text-white">
              All Vendors
            </TabsTrigger>
            <TabsTrigger value="active" className="data-[state=active]:bg-purple-900 data-[state=active]:text-white">
              Active
            </TabsTrigger>
            <TabsTrigger value="performance" className="data-[state=active]:bg-purple-900 data-[state=active]:text-white">
              Performance
            </TabsTrigger>
            <TabsTrigger value="risk" className="data-[state=active]:bg-purple-900 data-[state=active]:text-white">
              At Risk
            </TabsTrigger>
          </TabsList>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-ghost-500" />
              <Input
                placeholder="Search vendors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white border-ghost-300"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-white border-ghost-300">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="technology">Technology</SelectItem>
                <SelectItem value="services">Services</SelectItem>
                <SelectItem value="manufacturing">Manufacturing</SelectItem>
                <SelectItem value="consulting">Consulting</SelectItem>
                <SelectItem value="supplies">Supplies</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* All Vendors Tab */}
        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredVendors.map((vendor) => (
              <div
                key={vendor.id}
                className="relative group cursor-pointer h-full"
                style={{ perspective: '1000px' }}
                onClick={() => handleViewVendor(vendor)}
              >
                <div
                  className="h-full p-5 rounded-xl bg-white border border-ghost-200 transition-all duration-300 ease-out flex flex-col transform-gpu hover:border-purple-200 hover:-translate-y-1"
                  style={{
                    transformStyle: 'preserve-3d',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
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

                  {/* Status indicator bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1 rounded-t-xl z-10"
                    style={{
                      background: vendor.status === 'active'
                        ? 'linear-gradient(to right, #9e829c, #291528)'
                        : vendor.status === 'pending'
                        ? 'linear-gradient(to right, #d97706, #f59e0b)'
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
                        <p className="text-xs text-ghost-600 mt-1 capitalize">{vendor.category || 'Uncategorized'}</p>
                      </div>
                      <Badge
                        className={`text-xs px-2 py-1 shrink-0 ${
                          vendor.status === "active"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : vendor.status === "pending"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-ghost-100 text-ghost-600 border-ghost-300"
                        }`}
                      >
                        {vendor.status}
                      </Badge>
                    </div>

                    {/* Contact */}
                    <div className="text-xs text-ghost-600 space-y-1">
                      {vendor.contact_person && (
                        <div className="flex items-center gap-2 truncate">
                          <Building2 className="w-3 h-3 shrink-0" />
                          <span className="truncate">{vendor.contact_person}</span>
                        </div>
                      )}
                      {vendor.email && (
                        <div className="flex items-center gap-2 truncate">
                          <span className="truncate">{vendor.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Spend Trend Sparkline */}
                    {vendor.metadata?.spend_trend && Array.isArray(vendor.metadata.spend_trend) && vendor.metadata.spend_trend.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-ghost-600 mb-1 flex items-center justify-between">
                          <span>12-Month Spend Trend</span>
                          <span className="font-semibold text-purple-900">
                            ${((vendor.metadata.spend_trend[vendor.metadata.spend_trend.length - 1] as number) / 1000000).toFixed(2)}M
                          </span>
                        </div>
                        <Sparklines data={vendor.metadata.spend_trend as number[]} width={180} height={40}>
                          <SparklinesLine color="#9e829c" style={{ strokeWidth: 2, fill: 'rgba(158, 130, 156, 0.1)' }} />
                        </Sparklines>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-ghost-200">
                      <span className="text-xs text-ghost-600">Active Contracts</span>
                      <span className="text-sm font-bold text-purple-900">{vendor.active_contracts || vendor.contracts?.length || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredVendors.length === 0 && (
              <div className="col-span-full">
                <Card className="bg-white border-ghost-300">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <div className="p-4 bg-ghost-100 rounded-full mb-4">
                      <Building2 className="h-8 w-8 text-ghost-500" />
                    </div>
                    <p className="text-lg font-semibold text-purple-900 mb-1">No vendors found</p>
                    <p className="text-sm text-ghost-600 mb-6">
                      {searchQuery || categoryFilter !== "all"
                        ? "Try adjusting your filters"
                        : "Get started by creating your first vendor"}
                    </p>
                    {!searchQuery && categoryFilter === "all" && (
                      <Button
                        onClick={() => setIsVendorFormOpen(true)}
                        className="bg-purple-900 hover:bg-purple-800 text-white"
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Vendor
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Active Vendors Tab */}
        <TabsContent value="active" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredVendors
              .filter(v => v.status === 'active')
              .map((vendor) => (
                <div
                  key={vendor.id}
                  className="relative group cursor-pointer h-full"
                  style={{ perspective: '1000px' }}
                  onClick={() => handleViewVendor(vendor)}
                >
                  <div
                    className="h-full p-5 rounded-xl bg-white border border-ghost-200 transition-all duration-300 ease-out flex flex-col transform-gpu hover:border-purple-200 hover:-translate-y-1"
                    style={{
                      transformStyle: 'preserve-3d',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    }}
                  >
                    <div
                      className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 100%)',
                        transform: 'translateZ(1px)',
                      }}
                    />
                    <div
                      className="absolute top-0 left-0 right-0 h-1 rounded-t-xl z-10"
                      style={{ background: 'linear-gradient(to right, #059669, #10b981)' }}
                    />
                    <div className="flex flex-col gap-3 flex-1 relative z-10">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-ghost-900 text-base group-hover:text-purple-900 transition-colors truncate">
                            {vendor.name}
                          </h3>
                          <p className="text-xs text-ghost-600 mt-1 capitalize">{vendor.category || 'Uncategorized'}</p>
                        </div>
                        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                      </div>
                      <div className="text-xs text-ghost-600 space-y-1">
                        {vendor.contact_person && (
                          <div className="flex items-center gap-2 truncate">
                            <Building2 className="w-3 h-3 shrink-0" />
                            <span className="truncate">{vendor.contact_person}</span>
                          </div>
                        )}
                        {vendor.email && (
                          <div className="flex items-center gap-2 truncate">
                            <span className="truncate">{vendor.email}</span>
                          </div>
                        )}
                      </div>

                      {/* Spend Trend Sparkline */}
                      {vendor.metadata?.spend_trend && Array.isArray(vendor.metadata.spend_trend) && vendor.metadata.spend_trend.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs text-ghost-600 mb-1 flex items-center justify-between">
                            <span>12-Month Spend Trend</span>
                            <span className="font-semibold text-green-600">
                              ${((vendor.metadata.spend_trend[vendor.metadata.spend_trend.length - 1] as number) / 1000000).toFixed(2)}M
                            </span>
                          </div>
                          <Sparklines data={vendor.metadata.spend_trend as number[]} width={180} height={40}>
                            <SparklinesLine color="#059669" style={{ strokeWidth: 2, fill: 'rgba(5, 150, 105, 0.1)' }} />
                          </Sparklines>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-ghost-200">
                        <span className="text-xs text-ghost-600">Active Contracts</span>
                        <span className="text-sm font-bold text-purple-900">{vendor.active_contracts || vendor.contracts?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card className="bg-white border-ghost-300">
            <CardHeader>
              <CardTitle className="text-purple-900">Top Performing Vendors</CardTitle>
              <CardDescription className="text-ghost-600">Vendors with highest performance scores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredVendors.slice(0, 5).map((vendor, index) => {
                  const mockScore = 95 - (index * 3); // Mock performance scores
                  return (
                    <div
                      key={vendor.id}
                      className="flex items-center justify-between p-3 bg-ghost-50 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer"
                      onClick={() => handleViewVendor(vendor)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-purple-900 text-white rounded-full font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-purple-900">{vendor.name}</p>
                          <p className="text-xs text-ghost-600 capitalize">{vendor.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-purple-900">{mockScore}</span>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* At Risk Tab */}
        <TabsContent value="risk" className="space-y-4">
          <Card className="bg-white border-ghost-300">
            <CardHeader>
              <CardTitle className="text-purple-900">Vendors Requiring Attention</CardTitle>
              <CardDescription className="text-ghost-600">Vendors with compliance or performance issues</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredVendors.slice(0, 3).map((vendor) => (
                  <div
                    key={vendor.id}
                    className="flex items-center justify-between p-4 border border-amber-200 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
                    onClick={() => handleViewVendor(vendor)}
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      <div>
                        <p className="font-medium text-purple-900">{vendor.name}</p>
                        <p className="text-sm text-ghost-600">Contract renewal needed - expires soon</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-purple-900 text-purple-900 hover:bg-purple-900 hover:text-white"
                    >
                      Review
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Vendor Form Modal */}
      <VendorForm
        open={isVendorFormOpen}
        onOpenChange={setIsVendorFormOpen}
        onSubmit={handleCreateVendor}
        loading={mutationLoading}
      />

      {/* Vendor Details Side Panel */}
      <AnimatePresence mode="wait">
        {isDetailsModalOpen && selectedVendor && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-40"
              onClick={(e) => {
                e.stopPropagation();
                setIsDetailsModalOpen(false);
              }}
            />

            {/* Side Panel */}
            <motion.div
              key="panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 h-screen w-full md:w-[600px] lg:w-[800px] bg-white shadow-2xl z-50 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <div className="sticky top-0 bg-white border-b border-ghost-200 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-xl font-bold text-purple-900">Vendor Details</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDetailsModalOpen(false);
                  }}
                  className="hover:bg-ghost-100"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="p-6">
                <VendorDetails
                  vendor={selectedVendor}
                  onEdit={() => {
                    setIsDetailsModalOpen(false);
                    // TODO: Open edit form
                  }}
                  onClose={() => setIsDetailsModalOpen(false)}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AllVendors;
