/**
 * Contract Store - Legacy File
 * 
 * This file now re-exports from the new split stores for backward compatibility.
 * New code should import directly from '@/stores/contracts' instead.
 * 
 * @deprecated Use the split stores from '@/stores/contracts' for better performance
 * @see src/stores/contracts/MIGRATION_GUIDE.md for migration instructions
 */

// Re-export everything from the new contract stores
export { useContractStore as default } from './contracts';

// Re-export specific named exports from contracts
export {
  // Data store exports
  useContractDataStore,
  useContracts,
  useContractLoading,
  useContractError,
  useContractActions,
  
  // Modal store exports
  useContractModalStore,
  useModalOpen,
  useModalActions,
  
  // Form store exports
  useContractFormStore,
  useFormData,
  useFormDates,
  useFormSubmitting,
  useFormActions,
  
  // Vendor store exports
  useContractVendorStore,
  useVendorName,
  useVendorExists,
  useVendorSearchPerformed,
  useShowVendorDialog,
  useVendorActions,
  
  // Search store exports
  useContractSearchStore,
  useSearchQuery,
  useFilteredContracts,
  useSearchActions,
  
  // Backward compatibility export
  useContractStore
} from './contracts';