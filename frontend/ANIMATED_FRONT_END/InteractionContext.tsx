
import React, { createContext, useContext, useState } from 'react';

interface InteractionState {
  activeAgentId: string | null;
  setActiveAgentId: (id: string | null) => void;
}

export const InteractionContext = createContext<InteractionState>({
  activeAgentId: null,
  setActiveAgentId: () => {},
});

export const useInteraction = () => useContext(InteractionContext);

export const InteractionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  return (
    <InteractionContext.Provider value={{ activeAgentId, setActiveAgentId }}>
      {children}
    </InteractionContext.Provider>
  );
};
