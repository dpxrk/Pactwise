'use client';

import { useParams, useRouter } from 'next/navigation';
import React, { useState } from 'react';

import { ContractFormModal } from '@/app/_components/contracts/ContractFormModal';
import { Button } from '@/components/ui/button';
import type { Id } from '@/types/id.types';

const EditContractPage = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const contractId = params?.id as string;
  const [isOpen, setIsOpen] = useState(true);

  if (!contractId) {
    return (
      <div className="container mx-auto py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
          <h2 className="text-yellow-800 font-medium">Contract ID Missing</h2>
          <p className="text-yellow-700 mt-1">
            No contract ID was provided. Please select a contract to edit.
          </p>
        </div>
      </div>
    );
  }

  const handleClose = () => {
    setIsOpen(false);
    router.push('/dashboard/contracts');
  };

  const handleSuccess = () => {
    setIsOpen(false);
    router.push('/dashboard/contracts');
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#291528' }}>Edit Contract</h1>
            <p className="text-muted-foreground mt-1">
              Update the contract details below.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/contracts')}
          >
            Back to Contracts
          </Button>
        </div>
      </div>

      <ContractFormModal
        isOpen={isOpen}
        onClose={handleClose}
        contractId={contractId as Id<"contracts">}
        onSuccess={handleSuccess}
      />
    </div>
  );
};

export default EditContractPage;
