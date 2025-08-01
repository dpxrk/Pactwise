'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

interface NewContractButtonProps {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  buttonText?: string;
  showIcon?: boolean;
  className?:string
}

export const NewContractButton: React.FC<NewContractButtonProps> = ({
  variant = 'default',
  size = 'default',
  buttonText = 'New Contract',
  showIcon = true,
  className,
  ...props
}) => {
  const router = useRouter();

  const handleClick = () => {
    router.push('/dashboard/contracts/new');
  };

  return (
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
  );
};

export default NewContractButton;