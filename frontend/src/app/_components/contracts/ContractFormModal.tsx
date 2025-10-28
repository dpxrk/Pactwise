import React from 'react';

import { ContractForm } from '@/app/_components/contracts/ContractForm';
import { useContract } from '@/hooks/useContracts';
import type { Id } from '@/types/id.types';

import LoadingSpinner from '../common/LoadingSpinner';

interface ContractFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractId?: Id<"contracts"> | string;
  onSuccess?: (contractId?: Id<"contracts"> | string) => void;
}

export const ContractFormModal: React.FC<ContractFormModalProps> = ({
  isOpen,
  onClose,
  contractId,
  onSuccess
}) => {
  // Fetch contract data if editing
  const { contract, isLoading } = useContract(contractId as string || "");

  // Show loading state while fetching contract data
  if (isLoading && contractId) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <ContractForm
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      contract={contractId ? contract : null}
      onSuccess={() => {
        onSuccess?.(contractId);
      }}
    />
  );
};

export default ContractFormModal;
