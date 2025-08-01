'use client';

import React, { createContext, useContext, useState } from 'react';
// import { Id } from '../../../convex/_generated/dataModel';
import { GlobalAIChat } from './GlobalAIChat';

interface AIChatContextType {
  setContractContext: (contractId: Id<"contracts"> | undefined) => void;
  setVendorContext: (vendorId: Id<"vendors"> | undefined) => void;
  clearContext: () => void;
}

const AIChatContext = createContext<AIChatContextType | undefined>(undefined);

export const useAIChat = () => {
  const context = useContext(AIChatContext);
  if (!context) {
    throw new Error('useAIChat must be used within AIChatProvider');
  }
  return context;
};

interface AIChatProviderProps {
  children: React.ReactNode;
}

export const AIChatProvider: React.FC<AIChatProviderProps> = ({ children }) => {
  const [contractId, setContractId] = useState<Id<"contracts"> | undefined>();
  const [vendorId, setVendorId] = useState<Id<"vendors"> | undefined>();

  const setContractContext = (id: Id<"contracts"> | undefined) => {
    setContractId(id);
    setVendorId(undefined); // Clear vendor context when setting contract
  };

  const setVendorContext = (id: Id<"vendors"> | undefined) => {
    setVendorId(id);
    setContractId(undefined); // Clear contract context when setting vendor
  };

  const clearContext = () => {
    setContractId(undefined);
    setVendorId(undefined);
  };

  return (
    <AIChatContext.Provider 
      value={{ 
        setContractContext, 
        setVendorContext, 
        clearContext 
      }}
    >
      {children}
      <GlobalAIChat contractId={contractId} vendorId={vendorId} />
    </AIChatContext.Provider>
  );
};