'use client'

import React from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
// import { Id } from '../../../../../convex/_generated/dataModel';
import LoadingSpinner from '@/app/_components/common/LoadingSpinner';

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