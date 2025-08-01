/**
 * Utility functions for displaying data in the UI
 */

import { VendorCategory } from "@/types/vendor.types";
// import { ContractTypeEnum } from "../../convex/schema";

/**
 * Get display name for vendor category
 * @param category - The vendor category or undefined
 * @returns Display-friendly category name
 */
export function getVendorCategoryDisplay(category: VendorCategory | undefined | null): string {
  if (!category) {
    return "Uncategorized";
  }
  
  // Special handling for specific categories
  const categoryDisplayMap: Record<string, string> = {
    'hr': 'HR',
    'it': 'IT',
  };
  
  return categoryDisplayMap[category] || 
    category.charAt(0).toUpperCase() + category.slice(1);
}

/**
 * Get display name for contract type
 * @param type - The contract type or undefined
 * @returns Display-friendly contract type name
 */
export function getContractTypeDisplay(type: ContractTypeEnum | undefined | null): string {
  if (!type) {
    return "Uncategorized";
  }
  
  // Map of contract types to display names
  const typeDisplayMap: Record<string, string> = {
    'nda': 'NDA',
    'msa': 'MSA',
    'sow': 'SOW',
    'saas': 'SaaS',
    'lease': 'Lease',
    'employment': 'Employment',
    'partnership': 'Partnership',
    'other': 'Other',
  };
  
  return typeDisplayMap[type] || 
    type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * Get badge color/style for vendor category
 * @param category - The vendor category or undefined
 * @returns Tailwind CSS classes for the badge
 */
export function getVendorCategoryBadgeStyle(category: VendorCategory | undefined | null): string {
  if (!category) {
    return "bg-gray-100 text-gray-700 border-gray-200";
  }
  
  const styleMap: Record<string, string> = {
    'technology': 'bg-blue-100 text-blue-700 border-blue-200',
    'marketing': 'bg-purple-100 text-purple-700 border-purple-200',
    'legal': 'bg-red-100 text-red-700 border-red-200',
    'finance': 'bg-green-100 text-green-700 border-green-200',
    'hr': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'facilities': 'bg-orange-100 text-orange-700 border-orange-200',
    'logistics': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'manufacturing': 'bg-pink-100 text-pink-700 border-pink-200',
    'consulting': 'bg-teal-100 text-teal-700 border-teal-200',
    'other': 'bg-gray-100 text-gray-700 border-gray-200',
  };
  
  return styleMap[category] || 'bg-gray-100 text-gray-700 border-gray-200';
}

/**
 * Get badge color/style for contract type
 * @param type - The contract type or undefined
 * @returns Tailwind CSS classes for the badge
 */
export function getContractTypeBadgeStyle(type: ContractTypeEnum | undefined | null): string {
  if (!type) {
    return "bg-gray-100 text-gray-700 border-gray-200";
  }
  
  const styleMap: Record<string, string> = {
    'nda': 'bg-purple-100 text-purple-700 border-purple-200',
    'msa': 'bg-blue-100 text-blue-700 border-blue-200',
    'sow': 'bg-green-100 text-green-700 border-green-200',
    'saas': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'lease': 'bg-orange-100 text-orange-700 border-orange-200',
    'employment': 'bg-teal-100 text-teal-700 border-teal-200',
    'partnership': 'bg-pink-100 text-pink-700 border-pink-200',
    'other': 'bg-gray-100 text-gray-700 border-gray-200',
  };
  
  return styleMap[type] || 'bg-gray-100 text-gray-700 border-gray-200';
}

/**
 * Check if a vendor is uncategorized
 * @param category - The vendor category
 * @returns true if the vendor is uncategorized
 */
export function isVendorUncategorized(category: VendorCategory | undefined | null): boolean {
  return !category;
}

/**
 * Check if a contract is uncategorized
 * @param type - The contract type
 * @returns true if the contract is uncategorized
 */
export function isContractUncategorized(type: ContractTypeEnum | undefined | null): boolean {
  return !type;
}