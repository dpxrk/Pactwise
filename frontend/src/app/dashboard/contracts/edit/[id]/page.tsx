'use client';

import React from 'react';
import type { Id } from '@/types/id.types';
import { ContractForm } from '@/app/_components/contracts/ContractForm';
import { useParams } from 'next/navigation';

const EditContractPage = () => {
  const params = useParams();
  const contractId = params?.id as string;

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

  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Edit Contract</h1>
        <p className="text-muted-foreground mt-1">
          Update the contract details below.
        </p>
      </div>

      <ContractForm contractId={contractId as Id<"contracts">} />
    </div>
  );
};

export default EditContractPage;
