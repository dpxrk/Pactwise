import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { VendorType } from "@/types/vendor.types";

interface VendorState {
  vendors: VendorType[];
  loading: boolean;
  error: string | null;

  // Vendor CRUD operations
  setVendors: (vendors: VendorType[]) => void;
  addVendor: (vendor: VendorType) => void;
  updateVendor: (id: string, vendor: Partial<VendorType>) => void;
  deleteVendor: (id: string) => void;
  fetchMoreVendors: (page: number) => Promise<void>;

  // Loading and error states
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Additional vendor-specific operations
  updateVendorStatus: (id: string, status: "active" | "inactive" | "pending") => void;
  updateRiskLevel: (id: string, riskLevel: "low" | "medium" | "high") => void;
  updateComplianceScore: (id: string, score: number) => void;
  updateActiveContracts: (id: string, count: number) => void;
  addVendorSpend: (id: string, amount: number) => void;
}

const useVendorStore = create<VendorState>()(
  devtools(
    (set) => ({
      // Initial state
      vendors: [],
      loading: false,
      error: null,

      // Core actions
      setVendors: (vendors) => set({ vendors }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),

      // CRUD operations
      addVendor: (vendor) => {
        set((state) => ({
          vendors: [...state.vendors, vendor],
        }));
      },

      updateVendor: (id, updatedVendor) => {
        set((state) => ({
          vendors: state.vendors.map((vendor) =>
            vendor._id === id ? { ...vendor, ...updatedVendor } : vendor
          ),
        }));
      },

      deleteVendor: (id) => {
        set((state) => ({
          vendors: state.vendors.filter((vendor) => vendor._id !== id),
        }));
      },

      fetchMoreVendors: async (page: number) => {
        try {
          set({ loading: true });
          const response = await fetch(`/api/vendors?page=${page}`);
          const newVendors = await response.json();
          set((state) => ({
            vendors: [...state.vendors, ...newVendors],
            loading: false,
          }));
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
        }
      },

      // Additional vendor-specific operations
      updateVendorStatus: (id, status) => {
        set((state) => ({
          vendors: state.vendors.map((vendor) =>
            vendor._id === id ? { ...vendor, status } : vendor
          ),
        }));
      },

      updateRiskLevel: (id, riskLevel) => {
        set((state) => ({
          vendors: state.vendors.map((vendor) =>
            vendor._id === id ? { ...vendor, risk_level: riskLevel } : vendor
          ),
        }));
      },

      updateComplianceScore: (id, score) => {
        set((state) => ({
          vendors: state.vendors.map((vendor) =>
            vendor._id === id ? { ...vendor, compliance_score: score } : vendor
          ),
        }));
      },

      updateActiveContracts: (id, count) => {
        set((state) => ({
          vendors: state.vendors.map((vendor) =>
            vendor._id === id ? { ...vendor, active_contracts: count } : vendor
          ),
        }));
      },

      addVendorSpend: (id, amount) => {
        set((state) => ({
          vendors: state.vendors.map((vendor) =>
            vendor._id === id
              ? { ...vendor, total_spend: (vendor.total_spend || 0) + amount }
              : vendor
          ),
        }));
      },
    }),
    {
      name: "vendor-store",
    }
  )
);

export default useVendorStore;
