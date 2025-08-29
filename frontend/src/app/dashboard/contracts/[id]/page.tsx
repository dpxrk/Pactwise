'use client'

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import React from 'react';

import LoadingSpinner from '@/app/_components/common/LoadingSpinner';
import type { Id } from '@/types/id.types';


const ContractDetails = dynamic(
  () => import('@/app/_components/contracts/ContractDetails'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

const ContractDetailsPage = () => {
  const params = useParams();
  const contractId = params.id as Id<"contracts">;

  return (
    <div className="p-6">
      <ContractDetails contractId={contractId} />
    </div>
  );
};

export default ContractDetailsPage;
