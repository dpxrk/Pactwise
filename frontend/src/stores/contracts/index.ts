/**
 * Contract stores index
 * Exports all hooks from split contract stores for easy consumption
 */

// Import all stores
import { useContractDataStore } from './contractDataStore-optimized';
import { useContractFormStore } from './contractFormStore';
import { useContractModalStore } from './contractModalStore';
import { useContractSearchStore } from './contractSearchStore';
import { useContractVendorStore } from './contractVendorStore';

// Data store exports
export {
  useContractDataStore,
  useContracts,
  useContractLoading,
  useContractError,
  useContractActions,
} from './contractDataStore-optimized';

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
  // Use the stores directly
  const contractDataState = useContractDataStore();
  const modalState = useContractModalStore();
  const formState = useContractFormStore();
  const vendorState = useContractVendorStore();
  const searchState = useContractSearchStore();
  
  return {
    // Contract data
    contracts: contractDataState.contracts,
    loading: contractDataState.loading,
    error: contractDataState.error,
    setContracts: contractDataState.setContracts,
    addContract: contractDataState.addContract,
    updateContract: contractDataState.updateContract,
    deleteContract: contractDataState.deleteContract,

    // Modal
    isModalOpen: modalState.isModalOpen,
    openModal: modalState.openModal,
    closeModal: modalState.closeModal,
    
    // Form
    formData: formState.formData,
    startDate: formState.startDate,
    endDate: formState.endDate,
    isSubmitting: formState.isSubmitting,
    updateFormData: formState.updateFormData,
    setStartDate: formState.setStartDate,
    setEndDate: formState.setEndDate,
    isFormValid: formState.isFormValid,
    submitContract: formState.submitContract,
    
    // Vendor
    vendorName: vendorState.vendorName,
    vendorExists: vendorState.vendorExists,
    vendorSearchPerformed: vendorState.vendorSearchPerformed,
    showVendorDialog: vendorState.showVendorDialog,
    setVendorName: vendorState.setVendorName,
    checkVendorExists: vendorState.checkVendorExists,
    openVendorDialog: vendorState.openVendorDialog,
    closeVendorDialog: vendorState.closeVendorDialog,
    createVendor: vendorState.createVendor,
    
    // Search
    searchQuery: searchState.searchQuery,
    setSearchQuery: searchState.setSearchQuery,
    clearSearch: searchState.clearSearch,
    getFilteredContracts: searchState.getFilteredContracts,
  };
};