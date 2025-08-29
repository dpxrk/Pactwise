import { useEffect } from 'react';

import { useAIChat } from '@/components/ai/AIChatProvider';
import type { Id } from '@/types/id.types';

/**
 * Hook to set AI chat context when viewing specific contracts or vendors
 * 
 * Usage:
 * ```tsx
 * // In a contract detail page
 * useAIChatContext({ contractId: contract._id });
 * 
 * // In a vendor detail page
 * useAIChatContext({ vendorId: vendor._id });
 * ```
 */
export const useAIChatContext = (options: {
  contractId?: Id<"contracts">;
  vendorId?: Id<"vendors">;
}) => {
  const { setContractContext, setVendorContext, clearContext } = useAIChat();

  useEffect(() => {
    if (options.contractId) {
      setContractContext(options.contractId);
    } else if (options.vendorId) {
      setVendorContext(options.vendorId);
    }

    // Clear context when component unmounts
    return () => {
      clearContext();
    };
  }, [options.contractId, options.vendorId, setContractContext, setVendorContext, clearContext]);
};
