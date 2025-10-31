'use client';

import { PlusCircle } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';

import { NewContractModal } from './NewContractModal';

interface NewContractButtonProps {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  buttonText?: string;
  showIcon?: boolean;
  className?: string;
  onContractCreated?: () => void;
}

export const NewContractButton: React.FC<NewContractButtonProps> = ({
  variant = 'default',
  size = 'default',
  buttonText = 'New Contract',
  showIcon = true,
  className,
  onContractCreated,
  ...props
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        className={className}
        {...props}
      >
        {showIcon && <PlusCircle className="mr-2 h-4 w-4" />}
        {buttonText}
      </Button>

      <NewContractModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onContractCreated={onContractCreated}
      />
    </>
  );
};

export default NewContractButton;