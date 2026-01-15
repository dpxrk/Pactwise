// Central export for all schemas - maintains backward compatibility
// Import from domain-specific files for better code splitting

// Base schemas
export * from './base';

// Entity schemas
export * from './user';
export * from './enterprise';
export * from './vendor';
export * from './contract';
export * from './agent';
export * from './notification';

// Feature schemas
export * from './search';
export * from './analytics';
export * from './error';
export * from './form';
export * from './query';

// Default export for backward compatibility
import { agentTaskSchema } from './agent';
import { analyticsQuerySchema } from './analytics';
import { idSchema, timestampSchema, emailSchema, urlSchema, paginationSchema, sortSchema } from './base';
import { contractSchema } from './contract';
import { enterpriseSchema } from './enterprise';
import { errorSchema, paginatedResponseSchema, apiResponseSchema } from './error';
import { createContractFormSchema, createVendorFormSchema, updateUserProfileSchema } from './form';
import { notificationSchema } from './notification';
import { getContractsQuerySchema, getVendorsQuerySchema } from './query';
import { searchQuerySchema } from './search';
import { userSchema } from './user';
import { vendorSchema } from './vendor';

export default {
  // Base schemas
  id: idSchema,
  timestamp: timestampSchema,
  email: emailSchema,
  url: urlSchema,
  pagination: paginationSchema,
  sort: sortSchema,

  // Entity schemas
  user: userSchema,
  enterprise: enterpriseSchema,
  vendor: vendorSchema,
  contract: contractSchema,
  agentTask: agentTaskSchema,
  notification: notificationSchema,

  // Query schemas
  searchQuery: searchQuerySchema,
  analyticsQuery: analyticsQuerySchema,
  getContractsQuery: getContractsQuerySchema,
  getVendorsQuery: getVendorsQuerySchema,

  // Form schemas
  createContractForm: createContractFormSchema,
  createVendorForm: createVendorFormSchema,
  updateUserProfile: updateUserProfileSchema,

  // Response schemas
  error: errorSchema,
  paginatedResponse: paginatedResponseSchema,
  apiResponse: apiResponseSchema,
};
