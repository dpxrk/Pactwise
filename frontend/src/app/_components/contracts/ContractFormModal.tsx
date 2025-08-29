import dynamic from 'next/dynamic';
import React from 'react';

import type { Id } from '@/types/id.types';

import LoadingSpinner from '../common/LoadingSpinner';

const ContractForm = dynamic(() => import('@/app/_components/contracts/ContractForm').then(mod => ({ default: mod.ContractForm })), {
  loading: () => <LoadingSpinner />,
  ssr: false
});
import { 
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';

interface ContractFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractId?: Id<"contracts">;
  onSuccess?: (contractId: Id<"contracts">) => void;
}

export const ContractFormModal: React.FC<ContractFormModalProps> = ({
  isOpen,
  onClose,
  contractId,
  onSuccess
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-sans text-primary">
            {contractId ? 'Edit Contract' : 'Create New Contract'}
          </DialogTitle>
          <DialogDescription>
            {contractId 
              ? 'Make changes to the existing contract.' 
              : 'Fill out the details to create a new contract.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          <ContractForm 
            {...(contractId && { contractId })}
            isModal={true} 
            onClose={onClose}
            {...(onSuccess && { onSuccess })}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContractFormModal;
