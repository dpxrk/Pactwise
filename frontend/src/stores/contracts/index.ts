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
  const contracts = useContractDataStore((state) => state.contracts);
  const loading = useContractDataStore((state) => state.loading);
  const error = useContractDataStore((state) => state.error);
  const contractActions = {
    setContracts: useContractDataStore((state) => state.setContracts),
    addContract: useContractDataStore((state) => state.addContract),
    updateContract: useContractDataStore((state) => state.updateContract),
    deleteContract: useContractDataStore((state) => state.deleteContract),
    fetchMoreContracts: useContractDataStore((state) => state.fetchMoreContracts),
  };
  
  const isModalOpen = useContractModalStore((state) => state.isModalOpen);
  const modalActions = {
    openModal: useContractModalStore((state) => state.openModal),
    closeModal: useContractModalStore((state) => state.closeModal),
  };
  
  const formData = useContractFormStore((state) => state.formData);
  const startDate = useContractFormStore((state) => state.startDate);
  const endDate = useContractFormStore((state) => state.endDate);
  const isSubmitting = useContractFormStore((state) => state.isSubmitting);
  const formActions = {
    updateFormData: useContractFormStore((state) => state.updateFormData),
    setStartDate: useContractFormStore((state) => state.setStartDate),
    setEndDate: useContractFormStore((state) => state.setEndDate),
    isFormValid: useContractFormStore((state) => state.isFormValid),
    submitContract: useContractFormStore((state) => state.submitContract),
  };
  
  const vendorName = useContractVendorStore((state) => state.vendorName);
  const vendorExists = useContractVendorStore((state) => state.vendorExists);
  const vendorSearchPerformed = useContractVendorStore((state) => state.vendorSearchPerformed);
  const showVendorDialog = useContractVendorStore((state) => state.showVendorDialog);
  const vendorActions = {
    setVendorName: useContractVendorStore((state) => state.setVendorName),
    checkVendorExists: useContractVendorStore((state) => state.checkVendorExists),
    openVendorDialog: useContractVendorStore((state) => state.openVendorDialog),
    closeVendorDialog: useContractVendorStore((state) => state.closeVendorDialog),
    createVendor: useContractVendorStore((state) => state.createVendor),
  };
  
  const searchQuery = useContractSearchStore((state) => state.searchQuery);
  const searchActions = {
    setSearchQuery: useContractSearchStore((state) => state.setSearchQuery),
    clearSearch: useContractSearchStore((state) => state.clearSearch),
  };
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