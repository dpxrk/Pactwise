'use client'

import {
  Search,
  PlusCircle,
  AlertCircle,
  Building2,
  X,
  Trash2
} from "lucide-react";
import dynamic from 'next/dynamic';
import React, { useMemo, useState, useCallback, Suspense } from "react";

// Dynamic imports for heavy components
const VendorDetails = dynamic(() => import("@/app/_components/vendor/VendorDetails"), {
  loading: () => (
    <div className="p-6 text-center" role="status" aria-label="Loading">
      <div className="inline-block animate-spin h-8 w-8 border-2 border-purple-900 border-t-transparent" aria-hidden="true"></div>
      <span className="sr-only">Loading...</span>
    </div>
  ),
  ssr: false
});

const VendorForm = dynamic(() => import("@/app/_components/vendor/VendorForm"), {
  loading: () => (
    <div className="p-6 text-center" role="status" aria-label="Loading">
      <div className="inline-block animate-spin h-8 w-8 border-2 border-purple-900 border-t-transparent" aria-hidden="true"></div>
      <span className="sr-only">Loading...</span>
    </div>
  ),
  ssr: false
});

const AnimatePresence = dynamic(() => import('framer-motion').then(mod => ({ default: mod.AnimatePresence })), {
  ssr: false
});

const MotionDiv = dynamic(() => import('framer-motion').then(mod => ({ default: mod.motion.div })), {
  ssr: false
});
import { SkeletonLoader } from "@/components/loading";
import { BannerError } from "@/components/errors";
import { EmptyState } from "@/components/empty-states";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useVendorAnalytics, getRiskAssessment, getPerformanceMetrics, getAIInsights, getRecentActivity, calculateVendorSpend, getDefaultInsights, formatSpend, normalizePercentage } from "@/hooks/useVendorAnalytics";
import { useVendors, useVendorMutations } from "@/hooks/useVendors";
import { useDashboardStore } from "@/stores/dashboard-store";
import { Tables } from "@/types/database.types";

type Vendor = Tables<'vendors'>;

// Extended vendor type for form data that includes fields not in database schema
type VendorFormData = Partial<Vendor> & {
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  notes?: string;
};

// Helper function moved outside component to prevent recreation
const formatTimeAgo = (dateStr: string) => {
  const daysAgo = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (daysAgo === 0) return 'today';
  if (daysAgo === 1) return 'yesterday';
  if (daysAgo < 7) return `${daysAgo} days ago`;
  if (daysAgo < 30) return `${Math.floor(daysAgo / 7)} weeks ago`;
  return `${Math.floor(daysAgo / 30)} months ago`;
};

const AllVendors = () => {
  const { userProfile, isLoading: authLoading } = useAuth();
  const { vendors = [], isLoading: vendorsLoading, error: vendorsError, refetch } = useVendors({ realtime: true });
  const { createVendor, updateVendor, deleteVendor, isLoading: mutationLoading } = useVendorMutations();
  const { searchQuery, setSearchQuery } = useDashboardStore();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<keyof Vendor>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isVendorFormOpen, setIsVendorFormOpen] = useState(false);
  const [vendorToEdit, setVendorToEdit] = useState<Vendor | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [selectedVendorIndex, setSelectedVendorIndex] = useState<number>(-1);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Fetch AI-powered vendor analytics for selected vendor
  // Auto-fetch disabled to prevent infinite loading - analytics will use fallback data
  const { analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useVendorAnalytics({
    vendorId: selectedVendor?.id || null,
    autoFetch: false, // Disabled until backend is deployed
  });

  // Filter and sort vendors
  const filteredVendors = useMemo(() => {
    if (!Array.isArray(vendors)) return [];

    const filtered = vendors.filter((vendor: Vendor) => {
      const matchesSearch =
        !searchQuery ||
        vendor.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.primary_contact_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.primary_contact_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        categoryFilter === "all" || vendor.category === categoryFilter;

      const matchesStatus =
        statusFilter === "all" || vendor.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });

    // Sort vendors
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Convert to string for comparison
      aValue = String(aValue).toLowerCase();
      bValue = String(bValue).toLowerCase();

      if (sortDirection === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [vendors, searchQuery, categoryFilter, statusFilter, sortField, sortDirection]);

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

  // Memoize vendor analytics calculations to prevent IIFE recreation on render
  const vendorMetrics = useMemo(() => {
    if (!selectedVendor) return null;

    const totalSpend = calculateVendorSpend(analytics, selectedVendor);
    const performanceScore = analytics?.analysis?.performance?.overallScore !== undefined
      ? normalizePercentage(analytics.analysis.performance.overallScore)
      : normalizePercentage(selectedVendor.performance_score as number);
    const complianceScore = analytics?.analysis?.complianceStatus?.compliant === true ? 95
      : analytics?.analysis?.complianceStatus?.compliant === false ? 60
      : normalizePercentage(selectedVendor.compliance_score as number);

    return { totalSpend, performanceScore, complianceScore };
  }, [analytics, selectedVendor]);

  const riskAssessment = useMemo(() => {
    if (!selectedVendor) return null;
    return getRiskAssessment(analytics, selectedVendor);
  }, [analytics, selectedVendor]);

  const performanceMetrics = useMemo(() => {
    if (!selectedVendor) return null;
    return getPerformanceMetrics(analytics, selectedVendor);
  }, [analytics, selectedVendor]);

  const aiInsights = useMemo(() => {
    if (!selectedVendor) return [];
    const insights = getAIInsights(analytics);
    return insights.length > 0 ? insights.slice(0, 3) : getDefaultInsights(selectedVendor);
  }, [analytics, selectedVendor]);

  const recentActivity = useMemo(() => {
    if (!selectedVendor) return [];
    return getRecentActivity(analytics, selectedVendor);
  }, [analytics, selectedVendor]);

  const handleCreateVendor = useCallback(async (vendorData: VendorFormData) => {
    try {
      // Map camelCase form fields to snake_case database fields
      const mappedData = {
        name: vendorData.name,
        category: vendorData.category as Vendor['category'],
        status: (vendorData.status || 'active') as Vendor['status'],
        primary_contact_email: vendorData.contactEmail ?? null,
        primary_contact_phone: vendorData.contactPhone ?? null,
        primary_contact_name: vendorData.contactName ?? null,
        address: vendorData.address ?? null,
        website: vendorData.website ?? null,
        metadata: {
          ...(vendorData.notes ? { notes: vendorData.notes } : {}),
        },
      };

      await createVendor(mappedData as Parameters<typeof createVendor>[0], {
        onSuccess: () => {
          setIsVendorFormOpen(false);
          // Force a refresh after a short delay to ensure the cache is invalidated
          setTimeout(() => refetch(), 100);
        },
        onError: (error) => {
          console.error('Failed to create vendor:', error);
        }
      });
    } catch (error) {
      console.error('Failed to create vendor:', error);
    }
  }, [createVendor, refetch]);

  const handleEditVendor = useCallback(async (vendorData: VendorFormData) => {
    const vendor = vendorToEdit || selectedVendor;
    if (!vendor) return;

    try {
      // Map camelCase form fields to snake_case database fields
      const existingMetadata = (vendor.metadata || {}) as Record<string, unknown>;
      const mappedData: Partial<Vendor> = {
        name: vendorData.name,
        category: vendorData.category as Vendor['category'],
        status: vendorData.status,
        primary_contact_email: vendorData.contactEmail,
        primary_contact_phone: vendorData.contactPhone,
        primary_contact_name: vendorData.contactName,
        address: vendorData.address,
        website: vendorData.website,
        metadata: {
          ...existingMetadata,
          ...(vendorData.notes !== undefined ? { notes: vendorData.notes } : {}),
        },
      };

      await updateVendor(vendor.id, mappedData, {
        onSuccess: () => {
          const updatedVendor = { ...vendor, ...mappedData } as Vendor;
          setSelectedVendor(updatedVendor);
          setVendorToEdit(null);
          setIsVendorFormOpen(false);
          setTimeout(() => refetch(), 100);
        },
        onError: (error) => {
          console.error('Failed to update vendor:', error);
        }
      });
    } catch (error) {
      console.error('Failed to update vendor:', error);
    }
  }, [vendorToEdit, selectedVendor, updateVendor, refetch]);

  const handleDeleteVendor = useCallback(async (vendorId: string) => {
    if (!confirm('Are you sure you want to delete this vendor? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteVendor(vendorId, {
        onSuccess: () => {
          setSelectedVendor(null);
          setIsDetailsModalOpen(false);
          setTimeout(() => refetch(), 100);
        },
        onError: (error) => {
          console.error('Failed to delete vendor:', error);
          alert('Failed to delete vendor. Please try again.');
        }
      });
    } catch (error) {
      console.error('Failed to delete vendor:', error);
    }
  }, [deleteVendor, refetch]);

  const handleExportVendorReport = useCallback((vendor: Vendor) => {
    // Generate vendor report data
    // Note: website stored in metadata until database types are regenerated
    const metadata = vendor.metadata as Record<string, unknown> | null;
    const reportData = {
      vendor: {
        name: vendor.name,
        category: vendor.category,
        status: vendor.status,
        contact_email: vendor.primary_contact_email,
        contact_phone: vendor.primary_contact_phone,
        contact_name: vendor.primary_contact_name,
        website: vendor.website || metadata?.website as string | undefined,
        address: vendor.address,
        performance_score: vendor.performance_score,
        compliance_score: vendor.compliance_score,
        active_contracts: vendor.active_contracts,
        total_contract_value: vendor.total_contract_value,
      },
      exported_at: new Date().toISOString(),
      exported_by: userProfile?.email,
    };

    // Create and download JSON file
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vendor-report-${vendor.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [userProfile?.email]);

  const _handleViewVendor = useCallback((vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsDetailsModalOpen(true);
  }, []);

  const _handleUpdateVendor = useCallback((updatedVendor: Vendor) => {
    setSelectedVendor(updatedVendor);
  }, []);

  const handleSort = useCallback((field: keyof Vendor) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }, [sortField, sortDirection]);

  const handleSelectVendor = useCallback((vendor: Vendor, index: number) => {
    setSelectedVendor(vendor);
    setSelectedVendorIndex(index);
  }, []);

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isVendorFormOpen || isDetailsModalOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const newIndex = Math.min(selectedVendorIndex + 1, filteredVendors.length - 1);
        if (newIndex >= 0 && filteredVendors[newIndex]) {
          handleSelectVendor(filteredVendors[newIndex], newIndex);
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const newIndex = Math.max(selectedVendorIndex - 1, 0);
        if (newIndex >= 0 && filteredVendors[newIndex]) {
          handleSelectVendor(filteredVendors[newIndex], newIndex);
        }
      } else if (e.key === "Enter" && selectedVendor) {
        e.preventDefault();
        setIsDetailsModalOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedVendorIndex, filteredVendors, selectedVendor, isVendorFormOpen, isDetailsModalOpen]);

  // Loading state - wait for both auth and vendors to load
  if (authLoading || vendorsLoading) {
    return (
      <div className="min-h-screen bg-ghost-100">
        <div className="border-b border-ghost-300 bg-white px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-ghost-400 animate-pulse" />
            <span className="font-mono text-xs text-ghost-700">VENDOR SYSTEM</span>
          </div>
        </div>
        <div className="p-6">
          <SkeletonLoader variant="stats" className="mb-4" />
          <SkeletonLoader variant="vendor-list" count={6} />
        </div>
      </div>
    );
  }

  // Check if user has enterprise access
  if (!userProfile?.enterprise_id) {
    return (
      <div className="p-6 min-h-screen" style={{ backgroundColor: '#f0eff4' }}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Enterprise Access</AlertTitle>
          <AlertDescription>
            You need to be part of an enterprise to view vendors.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Error state
  if (vendorsError) {
    return (
      <div className="min-h-screen bg-ghost-100 p-6">
        <BannerError
          severity="error"
          message="Error Loading Vendors"
          description={vendorsError.message || "An error occurred while loading vendors"}
          action={{ label: 'Retry', onClick: () => refetch() }}
          dismissible
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Top Status Bar */}
      <div className="border-b border-ghost-300 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 animate-pulse"></div>
              <span className="font-mono text-xs text-ghost-700">VENDOR SYSTEM</span>
            </div>
            <div className="font-mono text-xs text-ghost-600">
              LAST UPDATE: {new Date().toLocaleTimeString()}
            </div>
          </div>
          <div className="flex items-center gap-6 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="text-ghost-600">TOTAL:</span>
              <span className="font-semibold text-purple-900">{stats.total}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-ghost-600">ACTIVE:</span>
              <span className="font-semibold text-purple-900">{stats.activeCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-ghost-600">SPEND:</span>
              <span className="font-semibold text-purple-900">${(stats.totalSpend / 1000000).toFixed(1)}M</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Compact Metrics Bar - Bloomberg Style */}
        <div className="border border-ghost-300 bg-white mb-4">
          <div className="grid grid-cols-6 divide-x divide-ghost-300">
            {/* Total Vendors */}
            <div className="p-3">
              <div className="font-mono text-[10px] text-ghost-600 mb-1">TOTAL</div>
              <div className="font-mono text-xl font-bold text-purple-900">{stats.total}</div>
            </div>

            {/* Active */}
            <div className="p-3">
              <div className="font-mono text-[10px] text-ghost-600 mb-1">ACTIVE</div>
              <div className="font-mono text-xl font-bold text-purple-900">{stats.activeCount}</div>
            </div>

            {/* Annual Spend */}
            <div className="p-3">
              <div className="font-mono text-[10px] text-ghost-600 mb-1">SPEND</div>
              <div className="font-mono text-xl font-bold text-purple-900">${(stats.totalSpend / 1000000).toFixed(1)}M</div>
            </div>

            {/* Contracts */}
            <div className="p-3">
              <div className="font-mono text-[10px] text-ghost-600 mb-1">CONTRACTS</div>
              <div className="font-mono text-xl font-bold text-purple-900">{stats.contractCount}</div>
            </div>

            {/* Performance */}
            <div className="p-3">
              <div className="font-mono text-[10px] text-ghost-600 mb-1">PERFORMANCE</div>
              <div className="font-mono text-xl font-bold text-purple-900">{stats.avgPerformance}</div>
            </div>

            {/* At Risk */}
            <div className="p-3">
              <div className="font-mono text-[10px] text-ghost-600 mb-1">AT RISK</div>
              <div className="font-mono text-xl font-bold text-amber-600">{stats.atRisk}</div>
            </div>
          </div>
        </div>

        {/* Toolbar - Bloomberg Style */}
        <div className="flex items-center justify-between mb-4 border border-ghost-300 bg-white p-3">
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-ghost-600">VIEW:</span>
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 border border-ghost-300 ${statusFilter === "all" ? "bg-purple-900 text-white" : "bg-white text-ghost-700 hover:bg-ghost-50"}`}
            >
              ALL
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1 border border-ghost-300 ${statusFilter === "active" ? "bg-purple-900 text-white" : "bg-white text-ghost-700 hover:bg-ghost-50"}`}
            >
              ACTIVE
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1 border border-ghost-300 ${statusFilter === "pending" ? "bg-purple-900 text-white" : "bg-white text-ghost-700 hover:bg-ghost-50"}`}
            >
              PENDING
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-ghost-400" />
              <input
                type="text"
                placeholder="SEARCH VENDORS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border border-ghost-300 bg-white pl-9 pr-4 py-2 font-mono text-xs placeholder:text-ghost-400 focus:outline-none focus:border-purple-900 w-64"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border border-ghost-300 bg-white px-4 py-2 font-mono text-xs text-ghost-700 hover:bg-ghost-50 hover:border-purple-900 focus:outline-none focus:border-purple-900"
            >
              <option value="all">ALL CATEGORIES</option>
              <option value="technology">TECHNOLOGY</option>
              <option value="services">SERVICES</option>
              <option value="manufacturing">MANUFACTURING</option>
              <option value="consulting">CONSULTING</option>
              <option value="supplies">SUPPLIES</option>
            </select>
            <button
              onClick={() => setIsVendorFormOpen(true)}
              className="border border-ghost-300 bg-purple-900 text-white px-4 py-2 font-mono text-xs hover:bg-purple-800 flex items-center gap-2"
            >
              <PlusCircle className="h-3 w-3" />
              NEW VENDOR
            </button>
          </div>
        </div>

        {/* 2-Column Bloomberg Terminal Layout */}
        <div className="grid grid-cols-3 gap-4">
          {/* Left Column: Vendor Table (65%) */}
          <div className="col-span-2 border border-ghost-300 bg-white">
            {/* Table Header */}
            <div className="border-b border-ghost-300 bg-terminal-surface grid grid-cols-12 gap-2 p-2 font-mono text-[10px] text-white uppercase font-semibold">
              <div className="col-span-1">ID</div>
              <button onClick={() => handleSort("name")} className="col-span-3 text-left hover:text-purple-300 flex items-center gap-1">
                NAME {sortField === "name" && (sortDirection === "asc" ? "▲" : "▼")}
              </button>
              <button onClick={() => handleSort("category")} className="col-span-2 text-left hover:text-purple-300 flex items-center gap-1">
                CATEGORY {sortField === "category" && (sortDirection === "asc" ? "▲" : "▼")}
              </button>
              <button onClick={() => handleSort("status")} className="col-span-2 text-left hover:text-purple-300 flex items-center gap-1">
                STATUS {sortField === "status" && (sortDirection === "asc" ? "▲" : "▼")}
              </button>
              <div className="col-span-2 text-right">CONTRACTS</div>
              <div className="col-span-2 text-right">SPEND</div>
            </div>

            {/* Table Body */}
            <div className="max-h-[calc(100vh-400px)] overflow-y-auto">
              {filteredVendors.length === 0 ? (
                <EmptyState
                  icon={<Building2 className="h-12 w-12 text-ghost-400" />}
                  title="No Vendors Found"
                  description={searchQuery ? "Try adjusting your search criteria" : "Add your first vendor to get started"}
                  primaryAction={
                    !searchQuery
                      ? { label: 'Add Vendor', onClick: () => setIsVendorFormOpen(true) }
                      : undefined
                  }
                />
              ) : (
                filteredVendors.map((vendor, index) => (
                  <button
                    key={vendor.id}
                    onClick={() => handleSelectVendor(vendor, index)}
                    className={`w-full grid grid-cols-12 gap-2 p-2 border-b border-ghost-200 last:border-b-0 font-mono text-xs hover:bg-terminal-hover state-transition text-left ${
                      selectedVendor?.id === vendor.id ? "bg-terminal-hover border-l-2 border-l-purple-900" : ""
                    }`}
                  >
                    <div className="col-span-1 text-ghost-600 truncate">V{String(index + 1).padStart(3, "0")}</div>
                    <div className="col-span-3 text-purple-900 font-semibold truncate">{vendor.name}</div>
                    <div className="col-span-2 text-ghost-700 uppercase truncate text-[10px]">{vendor.category || "—"}</div>
                    <div className="col-span-2">
                      {vendor.status === "active" && <span className="text-green-600">● ACTIVE</span>}
                      {vendor.status === "pending" && <span className="text-amber-600">⚠ PENDING</span>}
                      {vendor.status === "inactive" && <span className="text-ghost-500">○ INACTIVE</span>}
                    </div>
                    <div className="col-span-2 text-right text-purple-900 font-semibold">
                      {vendor.active_contracts || vendor.contracts?.length || 0}
                    </div>
                    <div className="col-span-2 text-right text-purple-900 font-semibold">
                      ${((vendor.active_contracts || 0) * 50000 / 1000000).toFixed(1)}M
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Table Footer */}
            <div className="border-t border-ghost-300 bg-terminal-surface p-2 font-mono text-[10px] text-white flex items-center justify-between">
              <span>{filteredVendors.length} VENDORS</span>
              <span className="text-ghost-400">USE ↑/↓ TO NAVIGATE • ENTER TO VIEW DETAILS</span>
            </div>
          </div>

          {/* Right Column: Vendor Analysis Panel (35%) */}
          <div className="col-span-1 border border-ghost-300 bg-white">
            {selectedVendor ? (
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="border-b border-ghost-300 bg-ghost-50 p-3">
                  <div className="font-mono text-[10px] text-ghost-600 mb-1 uppercase">
                    Vendor Analysis {analytics && "(AI-Powered)"}
                  </div>
                  <div className="font-semibold text-purple-900 text-sm">{selectedVendor.name}</div>
                  <div className="font-mono text-[9px] text-ghost-500 mt-0.5">
                    {`V${String(selectedVendorIndex + 1).padStart(3, "0")}`}
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {/* Status Overview */}
                  <div className="border border-ghost-300 bg-ghost-50 p-2">
                    <div className="font-mono text-[10px] text-ghost-600 mb-2 uppercase">Status</div>
                    <div className={`font-mono text-sm font-semibold flex items-center gap-2 ${
                      selectedVendor.status === "active" ? "text-green-600" :
                      selectedVendor.status === "pending" ? "text-amber-600" :
                      "text-ghost-500"
                    }`}>
                      {selectedVendor.status === "active" && "● ACTIVE"}
                      {selectedVendor.status === "pending" && "⚠ PENDING"}
                      {selectedVendor.status === "inactive" && "○ INACTIVE"}
                    </div>
                  </div>

                  {/* Key Metrics Grid */}
                  {vendorMetrics && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="border border-ghost-300 bg-white p-2">
                        <div className="font-mono text-[9px] text-ghost-600 mb-1">CONTRACTS</div>
                        <div className="font-mono text-lg font-bold text-purple-900">
                          {analytics?.rawData?.spend?.contract_count || selectedVendor.active_contracts || 0}
                        </div>
                      </div>
                      <div className="border border-ghost-300 bg-white p-2">
                        <div className="font-mono text-[9px] text-ghost-600 mb-1">SPEND</div>
                        <div className="font-mono text-lg font-bold text-purple-900">
                          {formatSpend(vendorMetrics.totalSpend)}
                        </div>
                      </div>
                      <div className="border border-ghost-300 bg-white p-2">
                        <div className="font-mono text-[9px] text-ghost-600 mb-1">PERFORMANCE</div>
                        <div className="font-mono text-lg font-bold text-green-600">
                          {vendorMetrics.performanceScore}%
                        </div>
                      </div>
                      <div className="border border-ghost-300 bg-white p-2">
                        <div className="font-mono text-[9px] text-ghost-600 mb-1">COMPLIANCE</div>
                        <div className="font-mono text-lg font-bold text-green-600">
                          {vendorMetrics.complianceScore}%
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Risk Assessment */}
                  {riskAssessment && (
                    <div className="border border-ghost-300 bg-white p-2">
                      <div className="font-mono text-[10px] text-ghost-600 mb-2 uppercase">Risk Assessment</div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[9px] text-ghost-700">OVERALL RISK</span>
                          <span className={`font-mono text-xs font-semibold ${
                            riskAssessment.overall === "low" ? "text-green-600" :
                            riskAssessment.overall === "medium" ? "text-amber-600" :
                            "text-red-600"
                          }`}>
                            {riskAssessment.overall.toUpperCase()}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[9px]">
                            <span className="text-ghost-600">FINANCIAL</span>
                            <div className="flex-1 mx-2 h-1 bg-ghost-200 relative">
                              <div className={`absolute h-1 ${riskAssessment.financial > 80 ? 'bg-green-600' : riskAssessment.financial > 60 ? 'bg-amber-600' : 'bg-red-600'}`} style={{ width: `${riskAssessment.financial}%` }}></div>
                            </div>
                            <span className={`font-mono font-semibold ${riskAssessment.financial > 80 ? 'text-green-600' : riskAssessment.financial > 60 ? 'text-amber-600' : 'text-red-600'}`}>{riskAssessment.financial}%</span>
                          </div>
                          <div className="flex items-center justify-between text-[9px]">
                            <span className="text-ghost-600">OPERATIONAL</span>
                            <div className="flex-1 mx-2 h-1 bg-ghost-200 relative">
                              <div className={`absolute h-1 ${riskAssessment.operational > 80 ? 'bg-green-600' : riskAssessment.operational > 60 ? 'bg-amber-600' : 'bg-red-600'}`} style={{ width: `${riskAssessment.operational}%` }}></div>
                            </div>
                            <span className={`font-mono font-semibold ${riskAssessment.operational > 80 ? 'text-green-600' : riskAssessment.operational > 60 ? 'text-amber-600' : 'text-red-600'}`}>{riskAssessment.operational}%</span>
                          </div>
                          <div className="flex items-center justify-between text-[9px]">
                            <span className="text-ghost-600">COMPLIANCE</span>
                            <div className="flex-1 mx-2 h-1 bg-ghost-200 relative">
                              <div className={`absolute h-1 ${riskAssessment.compliance > 80 ? 'bg-green-600' : riskAssessment.compliance > 60 ? 'bg-amber-600' : 'bg-red-600'}`} style={{ width: `${riskAssessment.compliance}%` }}></div>
                            </div>
                            <span className={`font-mono font-semibold ${riskAssessment.compliance > 80 ? 'text-green-600' : riskAssessment.compliance > 60 ? 'text-amber-600' : 'text-red-600'}`}>{riskAssessment.compliance}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Performance Breakdown */}
                  {performanceMetrics && (
                    <div className="border border-ghost-300 bg-white p-2">
                      <div className="font-mono text-[10px] text-ghost-600 mb-2 uppercase">Performance Metrics</div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[9px]">
                          <span className="text-ghost-600">DELIVERY</span>
                          <span className="font-mono font-semibold text-purple-900">{performanceMetrics.delivery}%</span>
                        </div>
                        <div className="flex items-center justify-between text-[9px]">
                          <span className="text-ghost-600">QUALITY</span>
                          <span className="font-mono font-semibold text-purple-900">{performanceMetrics.quality}%</span>
                        </div>
                        <div className="flex items-center justify-between text-[9px]">
                          <span className="text-ghost-600">RESPONSIVENESS</span>
                          <span className="font-mono font-semibold text-purple-900">{performanceMetrics.responsiveness}%</span>
                        </div>
                        <div className="flex items-center justify-between text-[9px]">
                          <span className="text-ghost-600">COST EFFICIENCY</span>
                          <span className="font-mono font-semibold text-purple-900">{performanceMetrics.costEfficiency}%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AI Insights */}
                  <div className="border border-purple-300 bg-purple-50 p-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-mono text-[10px] text-purple-900 uppercase font-semibold">
                        AI Insights {aiInsights.length > 0 && `(${aiInsights.length})`}
                      </div>
                      {!analytics && (
                        <button
                          onClick={() => refetchAnalytics()}
                          disabled={analyticsLoading}
                          className="font-mono text-[8px] px-2 py-1 bg-purple-900 text-white hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Requires backend deployment"
                        >
                          {analyticsLoading ? '...' : 'RUN AI'}
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {aiInsights.map((insight, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className={`font-bold text-xs mt-0.5 ${
                            insight.severity === 'critical' || insight.severity === 'high' ? 'text-red-600' :
                            insight.severity === 'medium' ? 'text-amber-600' :
                            'text-green-600'
                          }`}>
                            {insight.severity === 'critical' || insight.severity === 'high' ? '⚠' :
                             insight.severity === 'medium' ? '!' : '✓'}
                          </span>
                          <p className="text-[9px] text-ghost-700 leading-relaxed">
                            {insight.description}
                          </p>
                        </div>
                      ))}
                      {getAIInsights(analytics).length > 3 && (
                        <div className="text-center pt-1">
                          <span className="text-[8px] text-purple-900 font-semibold">
                            +{getAIInsights(analytics).length - 3} more insights
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact Info */}
                  {(selectedVendor.primary_contact_name || selectedVendor.primary_contact_email) && (
                    <div className="border border-ghost-300 bg-white p-2">
                      <div className="font-mono text-[10px] text-ghost-600 mb-2 uppercase">Contact</div>
                      {selectedVendor.primary_contact_name && (
                        <div className="text-[10px] text-ghost-900 font-semibold">{selectedVendor.primary_contact_name}</div>
                      )}
                      {selectedVendor.primary_contact_email && (
                        <div className="text-[9px] text-ghost-600 mt-0.5">{selectedVendor.primary_contact_email}</div>
                      )}
                      {selectedVendor.primary_contact_phone && (
                        <div className="text-[9px] text-ghost-600 mt-0.5">{selectedVendor.primary_contact_phone}</div>
                      )}
                    </div>
                  )}

                  {/* Recent Activity */}
                  {recentActivity.length > 0 && (
                    <div className="border border-ghost-300 bg-white p-2">
                      <div className="font-mono text-[10px] text-ghost-600 mb-2 uppercase">Recent Activity</div>
                      <div className="space-y-2">
                        {recentActivity.map((activity, idx) => (
                          <div key={idx} className="text-[9px]">
                            <div className="text-ghost-700 leading-relaxed">{activity.description}</div>
                            <div className="text-ghost-500 font-mono mt-0.5">{formatTimeAgo(activity.date)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-2 space-y-2">
                    <button
                      onClick={() => setIsDetailsModalOpen(true)}
                      className="w-full border border-purple-900 bg-purple-900 text-white px-3 py-2 font-mono text-xs hover:bg-purple-800 state-transition"
                    >
                      FULL ANALYSIS →
                    </button>
                    <button
                      onClick={() => handleExportVendorReport(selectedVendor)}
                      className="w-full border border-ghost-300 bg-white text-purple-900 px-3 py-2 font-mono text-xs hover:bg-ghost-50 state-transition"
                    >
                      EXPORT REPORT
                    </button>
                    <button
                      onClick={() => handleDeleteVendor(selectedVendor.id)}
                      disabled={mutationLoading}
                      className="w-full border border-red-300 bg-white text-red-600 px-3 py-2 font-mono text-xs hover:bg-red-50 hover:border-red-500 state-transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      DELETE VENDOR
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-6 text-center">
                <div>
                  <Building2 className="h-12 w-12 mx-auto text-ghost-400 mb-3 opacity-50" />
                  <p className="font-mono text-xs text-ghost-600">SELECT A VENDOR</p>
                  <p className="font-mono text-[10px] text-ghost-500 mt-1">Click a row or use ↑/↓ keys</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vendor Form Modal */}
      <VendorForm
        open={isVendorFormOpen}
        onOpenChange={(open) => {
          setIsVendorFormOpen(open);
          if (!open) setVendorToEdit(null);
        }}
        vendor={vendorToEdit ? {
          name: vendorToEdit.name || '',
          contactEmail: vendorToEdit.primary_contact_email || '',
          contactPhone: vendorToEdit.primary_contact_phone || '',
          contactName: vendorToEdit.primary_contact_name || '',
          address: vendorToEdit.address || '',
          website: vendorToEdit.website || (vendorToEdit.metadata as any)?.website || '',
          status: vendorToEdit.status as 'active' | 'inactive' | 'pending' || 'active',
          category: vendorToEdit.category as any,
          notes: (vendorToEdit.metadata as any)?.notes || '',
        } : null}
        onSubmit={vendorToEdit ? handleEditVendor : handleCreateVendor}
        loading={mutationLoading}
      />

      {/* Vendor Details Side Panel */}
      {isDetailsModalOpen && selectedVendor && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/20 z-40 flex items-center justify-center" role="status" aria-label="Loading">
            <div className="inline-block animate-spin h-12 w-12 border-2 border-white border-t-transparent" aria-hidden="true"></div>
            <span className="sr-only">Loading...</span>
          </div>
        }>
          <AnimatePresence mode="wait">
            <>
              {/* Backdrop */}
              <MotionDiv
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/20 z-40"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  setIsDetailsModalOpen(false);
                }}
              />

              {/* Side Panel */}
              <MotionDiv
                key="panel"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed top-0 right-0 h-screen w-full md:w-[600px] lg:w-[800px] bg-white shadow-2xl z-50 overflow-y-auto"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
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
                      setVendorToEdit(selectedVendor);
                      setIsVendorFormOpen(true);
                    }}
                    onClose={() => setIsDetailsModalOpen(false)}
                  />
                </div>
              </MotionDiv>
            </>
          </AnimatePresence>
        </Suspense>
      )}
    </div>
  );
};

export default AllVendors;
