'use client'

import React from 'react';
import { useParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useConvexQuery } from '@/lib/api-client';
// import { api } from '../../../../../convex/_generated/api';
// import { Id } from '../../../../../convex/_generated/dataModel';
import VendorDetails from '@/app/_components/vendor/VendorDetails';
import LoadingSpinner from '@/app/_components/common/LoadingSpinner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';

const VendorDetailsPage = () => {
  const params = useParams();
  const vendorId = params.id as Id<"vendors">;
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();

  // Get enterpriseId from Clerk user's public metadata
  const enterpriseId = clerkUser?.publicMetadata?.enterpriseId as Id<"enterprises"> | undefined;

  // Fetch vendor data
  const { data: vendor, isLoading, error } = useConvexQuery(
    api.vendors.getVendorById,
    (vendorId && enterpriseId) ? { vendorId, enterpriseId } : "skip"
  );

  if (!isClerkLoaded || isLoading) {
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