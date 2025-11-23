"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface InteractionState {
  activeAgentId: string | null;
  setActiveAgentId: (id: string | null) => void;
  scrollToAgent?: (agentId: string) => void;
}

const InteractionContext = createContext<InteractionState | undefined>(undefined);

interface InteractionProviderProps {
  children: ReactNode;
  scrollToAgent?: (agentId: string) => void;
}

export const InteractionProvider: React.FC<InteractionProviderProps> = ({
  children,
  scrollToAgent
}) => {
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);

  return (
    <InteractionContext.Provider value={{ activeAgentId, setActiveAgentId, scrollToAgent }}>
      {children}
    </InteractionContext.Provider>
  );
};

export const useInteraction = (): InteractionState => {
  const context = useContext(InteractionContext);
  if (!context) {
    throw new Error('useInteraction must be used within an InteractionProvider');
  }
  return context;
};
