/**
 * Contract stores index
 * Exports all hooks from split contract stores for easy consumption
 */

// Data store exports
export {
  useContractDataStore,
  useContracts,
  useContractLoading,
  useContractError,
  useContractActions,
} from './contractDataStore';

// Modal store exports
export {
  useContractModalStore,
  useModalOpen,
  useModalActions,
} from './contractModalStore';

// Form store exports
export {
  useContractFormStore,
  useFormData,
  useFormDates,
  useFormSubmitting,
  useFormActions,
} from './contractFormStore';

// Vendor store exports
export {
  useContractVendorStore,
  useVendorName,
  useVendorExists,
  useVendorSearchPerformed,
  useShowVendorDialog,
  useVendorActions,
} from './contractVendorStore';

// Search store exports
export {
  useContractSearchStore,
  useSearchQuery,
  useFilteredContracts,
  useSearchActions,
} from './contractSearchStore';

/**
 * Backward compatibility layer
 * Provides the same interface as the original useContractStore
 * Components can gradually migrate to using specific hooks
 */
export const useContractStore = () => {
  // Import all states
  const contracts = useContracts();
  const loading = useContractLoading();
  const error = useContractError();
  const contractActions = useContractActions();
  
  const isModalOpen = useModalOpen();
  const modalActions = useModalActions();
  
  const formData = useFormData();
  const { startDate, endDate } = useFormDates();
  const isSubmitting = useFormSubmitting();
  const formActions = useFormActions();
  
  const vendorName = useVendorName();
  const vendorExists = useVendorExists();
  const vendorSearchPerformed = useVendorSearchPerformed();
  const showVendorDialog = useShowVendorDialog();
  const vendorActions = useVendorActions();
  
  const searchQuery = useSearchQuery();
  const searchActions = useSearchActions();
  const getFilteredContracts = useContractSearchStore.getState().getFilteredContracts;

  // Combine all states and actions
  return {
    // Data state
    contracts,
    loading,
    error,
    ...contractActions,
    
    // Modal state
    isModalOpen,
    ...modalActions,
    
    // Form state
    formData,
    startDate,
    endDate,
    isSubmitting,
    updateFormData: formActions.updateFormData,
    setStartDate: formActions.setStartDate,
    setEndDate: formActions.setEndDate,
    isFormValid: formActions.isFormValid,
    submitContract: async () => {
      await formActions.submitContract(vendorName, vendorExists || false);
    },
    
    // Vendor state
    vendorName,
    vendorExists,
    vendorSearchPerformed,
    showVendorDialog,
    ...vendorActions,
    
    // Search state
    searchQuery,
    ...searchActions,
    getFilteredContracts,
  };
};

// Default export for backward compatibility
export default useContractStore;