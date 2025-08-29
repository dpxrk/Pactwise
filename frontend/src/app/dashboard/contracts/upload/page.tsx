"use client";

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

import ContractFormModal from '@/app/_components/contracts/ContractFormModal';
import { Button } from '@/components/ui/button';
import type { Id } from '@/types/id.types';


export default function UploadContractPage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(true);

  const handleSuccess = (contractId: Id<"contracts">) => {
    router.push(`/dashboard/contracts/${contractId}`);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    router.push('/dashboard/contracts');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Upload Contract</h1>
          <p className="text-muted-foreground mt-1">
            Upload a contract document for AI-powered analysis
          </p>
        </div>
      </div>

      <ContractFormModal
        isOpen={isModalOpen}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
