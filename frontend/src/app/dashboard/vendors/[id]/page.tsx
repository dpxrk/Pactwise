'use client'

import { AlertCircle } from 'lucide-react';
import { useParams } from 'next/navigation';
import React from 'react';

import LoadingSpinner from '@/app/_components/common/LoadingSpinner';
import VendorDetails from '@/app/_components/vendor/VendorDetails';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/contexts/AuthContext';
import { useVendor } from '@/hooks/useVendors';
import type { Id } from '@/types/id.types';

const VendorDetailsPage = () => {
  const params = useParams<{ id: string }>();
  const vendorId = params?.id as Id<"vendors">;
  const { isLoading: isAuthLoading } = useAuth();

  // Fetch vendor data using the properly typed hook
  const { vendor, isLoading, error } = useVendor(vendorId);

  if (isAuthLoading || isLoading) {
    return (
      <div className="p-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load vendor: {error.message || 'Unknown error occurred'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!vendor && !isLoading) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not Found</AlertTitle>
          <AlertDescription>
            Vendor not found or you don&apos;t have permission to access it.
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
