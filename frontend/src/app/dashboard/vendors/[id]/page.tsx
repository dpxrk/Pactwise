'use client'

import React from 'react';
import type { Id } from '@/types/id.types';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import VendorDetails from '@/app/_components/vendor/VendorDetails';
import LoadingSpinner from '@/app/_components/common/LoadingSpinner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';

const VendorDetailsPage = () => {
  const params = useParams();
  const vendorId = params.id as Id<"vendors">;
  const { user, userProfile, isLoading: isAuthLoading } = useAuth();

  // Get enterpriseId from user profile
  const enterpriseId = userProfile?.enterprise_id;

  // Fetch vendor data
    const data = null;
  const isLoading = false;
  const error = null;
  // api.vendors.getVendorById,
  // (vendorId && enterpriseId) ? { vendorId, enterpriseId } : "skip"
  // );

  if (isAuthLoading || isLoading) {
    return (
      <div className="p-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (!enterpriseId) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Configuration Error</AlertTitle>
          <AlertDescription>
            Enterprise information is missing for your user account. Please contact support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error ? `Failed to load vendor: ${error.message}` : 'Vendor not found or access denied.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6">
      <VendorDetails vendor={vendor} />
    </div>
  );
};

export default VendorDetailsPage;
