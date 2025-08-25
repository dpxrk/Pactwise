// Placeholder API object until Supabase is integrated

export const api = {
  // Contract functions
  contracts: {
    getContracts: 'contracts.getContracts',
    getContractById: 'contracts.getContractById',
    getContractsByVendor: 'contracts.getContractsByVendor',
    createContract: 'contracts.createContract',
    updateContract: 'contracts.updateContract',
    deleteContract: 'contracts.deleteContract',
    generateUploadUrl: 'contracts.generateUploadUrl',
    getContractFileUrl: 'contracts.getContractFileUrl',
    analyzeContract: 'contracts.analyzeContract',
    getAnalysisStatus: 'contracts.getAnalysisStatus',
    exportContracts: 'contracts.exportContracts',
    getContractsByStatus: 'contracts.getContractsByStatus',
    searchContracts: 'contracts.searchContracts',
  },
  
  // Vendor functions
  vendors: {
    getVendors: 'vendors.getVendors',
    getVendorById: 'vendors.getVendorById',
    createVendor: 'vendors.createVendor',
    updateVendor: 'vendors.updateVendor',
    deleteVendor: 'vendors.deleteVendor',
    searchVendors: 'vendors.searchVendors',
    getVendorAnalytics: 'vendors.getVendorAnalytics',
  },
  
  // User functions
  users: {
    getCurrentUser: 'users.getCurrentUser',
    updateUser: 'users.updateUser',
    getUsersByEnterprise: 'users.getUsersByEnterprise',
    inviteUser: 'users.inviteUser',
  },
  
  // Enterprise functions
  enterprises: {
    getEnterprise: 'enterprises.getEnterprise',
    updateEnterprise: 'enterprises.updateEnterprise',
    getEnterpriseUsers: 'enterprises.getEnterpriseUsers',
  },
  
  // Analytics functions
  analytics: {
    getDashboardMetrics: 'analytics.getDashboardMetrics',
    getContractAnalytics: 'analytics.getContractAnalytics',
    getVendorAnalytics: 'analytics.getVendorAnalytics',
    getFinancialAnalytics: 'analytics.getFinancialAnalytics',
  },
  
  // AI functions
  ai: {
    chat: 'ai.chat',
    getInsights: 'ai.getInsights',
    searchSimilar: 'ai.searchSimilar',
  },
  
  // Realtime functions
  realtime: {
    presence: {
      updatePresence: 'realtime.presence.updatePresence',
      getPresence: 'realtime.presence.getPresence',
    },
    userEvents: {
      logEvent: 'realtime.userEvents.logEvent',
    },
  },
  
  // Notification functions
  notifications: {
    getNotifications: 'notifications.getNotifications',
    markAsRead: 'notifications.markAsRead',
    createNotification: 'notifications.createNotification',
  },
  
  // Template functions
  templates: {
    getTemplates: 'templates.getTemplates',
    getTemplateById: 'templates.getTemplateById',
    createTemplate: 'templates.createTemplate',
    updateTemplate: 'templates.updateTemplate',
    deleteTemplate: 'templates.deleteTemplate',
  },
  
  // Budget functions
  budgets: {
    getBudgets: 'budgets.getBudgets',
    createBudget: 'budgets.createBudget',
    updateBudget: 'budgets.updateBudget',
    deleteBudget: 'budgets.deleteBudget',
  },
  
  // Department functions
  departments: {
    getDepartments: 'departments.getDepartments',
    createDepartment: 'departments.createDepartment',
    updateDepartment: 'departments.updateDepartment',
    deleteDepartment: 'departments.deleteDepartment',
  },
  
  // Collaborative functions
  collaborative: {
    getDocument: 'collaborative.getDocument',
    updateDocument: 'collaborative.updateDocument',
    getComments: 'collaborative.getComments',
    addComment: 'collaborative.addComment',
  },
  
  // Search functions
  search: {
    globalSearch: 'search.globalSearch',
    searchContracts: 'search.searchContracts',
    searchVendors: 'search.searchVendors',
  },
  
  // Stripe functions
  stripe: {
    createCheckoutSession: 'stripe.createCheckoutSession',
    getSubscription: 'stripe.getSubscription',
    cancelSubscription: 'stripe.cancelSubscription',
    getUsage: 'stripe.getUsage',
  },
  
  // Demo functions
  demo: {
    generateDemoData: 'demo.generateDemoData',
    clearDemoData: 'demo.clearDemoData',
  },
  
  // Onboarding functions
  onboarding: {
    startOnboarding: 'onboarding.startOnboarding',
    updateOnboardingStep: 'onboarding.updateOnboardingStep',
    completeOnboarding: 'onboarding.completeOnboarding',
  },
};

// Export a type that matches the api structure
export type API = typeof api;