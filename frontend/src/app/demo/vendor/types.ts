export interface VendorData {
  id: string;
  name: string;
  email: string;
  category: 'technology' | 'services' | 'consulting' | 'manufacturing';
  status: 'active' | 'pending' | 'inactive';
  contractCount: number;
  annualSpend: number;
  performanceScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  contactPerson: string;
  phone?: string;
  address?: string;
  description?: string;
}

export interface Book3DProps {
  vendor: VendorData;
  position: [number, number, number];
  onClick: (vendor: VendorData) => void;
  isHighlighted?: boolean;
  isSelected?: boolean;
}

export interface Shelf3DProps {
  vendors: VendorData[];
  category: string;
  position: [number, number, number];
  onVendorClick: (vendor: VendorData) => void;
  highlightedVendorIds?: string[];
  selectedVendor?: VendorData | null;
}
