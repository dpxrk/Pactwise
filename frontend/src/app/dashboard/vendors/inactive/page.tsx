'use client'

import {
  Search,
  Building2,
  DollarSign,
  Clock,
  AlertCircle,
  X,
  XCircle
} from "lucide-react";
import dynamic from 'next/dynamic';
import React, { useMemo, useState, Suspense } from "react";

const VendorDetails = dynamic(() => import("@/app/_components/vendor/VendorDetails"), {
  loading: () => <div className="p-6 text-center"><div className="inline-block animate-spin h-8 w-8 border-2 border-purple-900 border-t-transparent"></div></div>,
  ssr: false
});

const VendorForm = dynamic(() => import("@/app/_components/vendor/VendorForm"), {
  loading: () => <div className="p-6 text-center"><div className="inline-block animate-spin h-8 w-8 border-2 border-purple-900 border-t-transparent"></div></div>,
  ssr: false
});

const AnimatePresence = dynamic(() => import('framer-motion').then(mod => ({ default: mod.AnimatePresence })), {
  ssr: false
});

const MotionDiv = dynamic(() => import('framer-motion').then(mod => ({ default: mod.motion.div })), {
  ssr: false
});

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/contexts/AuthContext";
import { useVendors, useVendorMutations } from "@/hooks/useVendors";
import { useDashboardStore } from "@/stores/dashboard-store";
import { Tables } from "@/types/database.types";

type Vendor = Tables<'vendors'>;

// Extended vendor type for form data
type VendorFormData = Partial<Vendor> & {
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  notes?: string;
};

const InactiveVendors = () => {
  const { userProfile, isLoading: authLoading } = useAuth();
  const { vendors = [], isLoading: vendorsLoading, error: vendorsError, refetch } = useVendors({ status: 'inactive', realtime: true });
  const { updateVendor, isLoading: mutationLoading } = useVendorMutations();
  const { searchQuery, setSearchQuery } = useDashboardStore();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorToEdit, setVendorToEdit] = useState<Vendor | null>(null);
  const [isVendorFormOpen, setIsVendorFormOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Filter vendors based on search and category (already filtered by status='inactive' from hook)
  const filteredVendors = useMemo(() => {
    if (!Array.isArray(vendors)) return [];

    return vendors.filter((vendor: Vendor) => {
      const matchesSearch =
        !searchQuery ||
        vendor.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.primary_contact_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.primary_contact_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        categoryFilter === "all" || vendor.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [vendors, searchQuery, categoryFilter]);

  // Calculate inactive vendor statistics
  const stats = useMemo(() => {
    // Calculate real financial data from contract values
    const totalHistoricalSpend = filteredVendors.reduce((sum, vendor) => {
      return sum + (vendor.contracts || []).reduce((s: number, c: any) => s + (c.value || 0), 0);
    }, 0);

    const recentlyInactive = filteredVendors.filter(vendor => {
      if (!vendor.updated_at) return false;
      const monthsDiff = (new Date().getTime() - new Date(vendor.updated_at).getTime()) / (1000 * 60 * 60 * 24 * 30);
      return monthsDiff <= 3;
    }).length;

    const pendingReview = filteredVendors.filter(v => !(v.metadata as { reviewed?: boolean } | null)?.reviewed).length;

    return {
      total: filteredVendors.length,
      historicalSpend: totalHistoricalSpend,
      recentlyInactive,
      pendingReview,
    };
  }, [filteredVendors]);

  const handleEditVendor = async (vendorData: VendorFormData) => {
    const vendor = vendorToEdit || selectedVendor;
    if (!vendor) return;

    try {
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
  };

  const handleViewVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsDetailsModalOpen(true);
  };

  // Loading state
  if (authLoading || vendorsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#f0eff4' }}>
        <LoadingSpinner size="lg" text={authLoading ? "Loading user data..." : "Loading inactive vendors..."} />
      </div>
    );
  }

  // Check enterprise access
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
    <div className="min-h-screen bg-ghost-100">
      {/* Top Status Bar */}
      <div className="border-b border-ghost-300 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-ghost-400"></div>
              <span className="font-mono text-xs text-ghost-700">INACTIVE VENDORS</span>
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
              <span className="text-ghost-600">RECENT:</span>
              <span className="font-semibold text-purple-900">{stats.recentlyInactive}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-ghost-600">PENDING:</span>
              <span className="font-semibold text-amber-600">{stats.pendingReview}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="border border-ghost-300 bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs text-ghost-600">INACTIVE VENDORS</span>
              <Building2 className="h-4 w-4 text-ghost-400" />
            </div>
            <div className="text-2xl font-bold text-purple-900 mb-1">{stats.total}</div>
            <div className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-ghost-500" />
              <span className="font-mono text-xs text-ghost-600">NOT ACTIVE</span>
            </div>
          </div>

          <div className="border border-ghost-300 bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs text-ghost-600">HISTORICAL SPEND</span>
              <DollarSign className="h-4 w-4 text-ghost-400" />
            </div>
            <div className="text-2xl font-bold text-purple-900 mb-1">
              ${(stats.historicalSpend / 1000000).toFixed(1)}M
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-ghost-600 uppercase">LIFETIME</span>
            </div>
          </div>

          <div className="border border-ghost-300 bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs text-ghost-600">RECENTLY INACTIVE</span>
              <Clock className="h-4 w-4 text-ghost-400" />
            </div>
            <div className="text-2xl font-bold text-purple-900 mb-1">{stats.recentlyInactive}</div>
            <div className="flex items-center gap-1">
              <span className="font-mono text-xs text-ghost-600">LAST 3 MONTHS</span>
            </div>
          </div>

          <div className="border border-ghost-300 bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs text-ghost-600">PENDING REVIEW</span>
              <AlertCircle className="h-4 w-4 text-ghost-400" />
            </div>
            <div className="text-2xl font-bold text-purple-900 mb-1">{stats.pendingReview}</div>
            <div className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-amber-600" />
              <span className="font-mono text-xs text-amber-600">ACTION NEEDED</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-mono text-sm font-semibold text-purple-900 uppercase tracking-wider">Inactive Vendor List</h2>

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
          </div>
        </div>

        {/* Inactive Vendors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredVendors.map((vendor) => {
            const isRecentlyInactive = vendor.updated_at ?
              (new Date().getTime() - new Date(vendor.updated_at).getTime()) / (1000 * 60 * 60 * 24 * 30) <= 3 : false;
            const needsReview = !(vendor.metadata as { reviewed?: boolean } | null)?.reviewed;

            return (
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
                    style={{ backgroundColor: '#e1e0e9' }}
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
                      <div className="flex flex-col gap-1 shrink-0">
                        <XCircle className="h-5 w-5 text-ghost-500" />
                        {needsReview && (
                          <div className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 font-mono rounded">
                            REVIEW
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="text-xs text-ghost-600 space-y-1">
                      {vendor.primary_contact_name && (
                        <div className="flex items-center gap-2 truncate">
                          <Building2 className="w-3 h-3 shrink-0" />
                          <span className="truncate">{vendor.primary_contact_name}</span>
                        </div>
                      )}
                      {vendor.primary_contact_email && (
                        <div className="flex items-center gap-2 truncate">
                          <span className="truncate">{vendor.primary_contact_email}</span>
                        </div>
                      )}
                    </div>

                    {/* Last Active */}
                    {vendor.updated_at && (
                      <div className="text-xs">
                        <span className="text-ghost-600">Last Active: </span>
                        <span className={`font-medium ${isRecentlyInactive ? 'text-amber-600' : 'text-ghost-700'}`}>
                          {new Date(vendor.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-ghost-200">
                      <span className="text-xs text-ghost-600">Historical Spend</span>
                      <span className="text-sm font-bold text-purple-900">
                        ${((vendor.contracts || []).reduce((s: number, c: any) => s + (c.value || 0), 0) / 1000).toFixed(0)}K
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredVendors.length === 0 && (
            <div className="col-span-full">
              <Card className="bg-white border-ghost-300">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="p-4 bg-ghost-100 rounded-full mb-4">
                    <Building2 className="h-8 w-8 text-ghost-500" />
                  </div>
                  <p className="text-lg font-semibold text-purple-900 mb-1">No inactive vendors found</p>
                  <p className="text-sm text-ghost-600 mb-6">
                    {searchQuery || categoryFilter !== "all"
                      ? "Try adjusting your filters"
                      : "All vendors are currently active"}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
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
          status: vendorToEdit.status as 'active' | 'inactive' | 'pending' || 'inactive',
          category: vendorToEdit.category as any,
          notes: (vendorToEdit.metadata as any)?.notes || '',
        } : null}
        onSubmit={handleEditVendor}
        loading={mutationLoading}
      />

      {/* Vendor Details Side Panel */}
      {isDetailsModalOpen && selectedVendor && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/20 z-40 flex items-center justify-center"><div className="inline-block animate-spin h-12 w-12 border-2 border-white border-t-transparent"></div></div>}>
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

export default InactiveVendors;
