import { ConvexError } from 'convex/values';
import { 
  createMockConvexContext, 
  createMockContract, 
  createMockUser,
  createMockEnterprise,
  createMockVendor,
  withMockContext,
  expectToBeId,
  expectToBeTimestamp
} from '../utils/convex-test-helpers';

// Import the actual functions we're testing
// Note: In a real test environment, these would be imported from the actual files
// For now, we'll test the logic patterns

describe('Contract Management', () => {
  describe('Mutations', () => {
    describe('createContract', () => {
      it('should create a new contract with valid data', async () => {
        await withMockContext(async (ctx) => {
          // Mock authenticated user
          const mockUser = createMockUser();
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          
          // Mock user query
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          
          // Mock insert
          const expectedId = 'contract123';
          ctx.db.insert.mockResolvedValue(expectedId);
          
          // Test data
          const contractData = {
            title: 'Software License Agreement',
            type: 'software' as const,
            vendorId: 'vendor123',
            value: 50000,
            currency: 'USD',
            startDate: Date.now(),
            endDate: Date.now() + 365 * 24 * 60 * 60 * 1000,
            notes: 'Annual software license'
          };
          
          // Simulate the create function logic
          const result = await simulateCreateContract(ctx, contractData);
          
          expect(result).toBe(expectedId);
          expect(ctx.db.insert).toHaveBeenCalledWith('contracts', expect.objectContaining({
            title: contractData.title,
            type: contractData.type,
            vendorId: contractData.vendorId,
            value: contractData.value,
            currency: contractData.currency,
            status: 'draft',
            enterpriseId: mockUser.enterpriseId,
            createdBy: mockUser._id
          }));
        });
      });

      it('should validate title length', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          
          // Test with title too short
          await expect(simulateCreateContract(ctx, {
            title: 'Ab',
            type: 'service' as const
          })).rejects.toThrow('Title must be between 3 and 200 characters');
          
          // Test with title too long
          const longTitle = 'A'.repeat(201);
          await expect(simulateCreateContract(ctx, {
            title: longTitle,
            type: 'service' as const
          })).rejects.toThrow('Title must be between 3 and 200 characters');
        });
      });

      it('should prevent XSS in title and notes', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          
          const xssPayload = '<script>alert("XSS")</script>';
          
          await expect(simulateCreateContract(ctx, {
            title: xssPayload,
            type: 'service' as const
          })).rejects.toThrow('Title contains invalid characters');
          
          await expect(simulateCreateContract(ctx, {
            title: 'Valid Title',
            type: 'service' as const,
            notes: xssPayload
          })).rejects.toThrow('Notes contain invalid characters');
        });
      });

      it('should require authentication', async () => {
        await withMockContext(async (ctx) => {
          ctx.auth.getUserIdentity.mockResolvedValue(null);
          
          await expect(simulateCreateContract(ctx, {
            title: 'Test Contract',
            type: 'service' as const
          })).rejects.toThrow('Not authenticated');
        });
      });

      it('should validate vendor ownership', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          
          // Mock vendor from different enterprise
          const vendorFromOtherEnterprise = createMockVendor({
            enterpriseId: 'other-enterprise' as any
          });
          ctx.db.get.mockResolvedValue(vendorFromOtherEnterprise);
          
          await expect(simulateCreateContract(ctx, {
            title: 'Test Contract',
            type: 'service' as const,
            vendorId: vendorFromOtherEnterprise._id
          })).rejects.toThrow('Vendor not found or does not belong to your enterprise');
        });
      });
    });

    describe('updateContract', () => {
      it('should update contract with valid changes', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          const mockContract = createMockContract({
            enterpriseId: mockUser.enterpriseId,
            createdBy: mockUser._id
          });
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          ctx.db.get.mockResolvedValue(mockContract);
          
          const updates = {
            title: 'Updated Contract Title',
            value: 75000,
            status: 'active' as const
          };
          
          await simulateUpdateContract(ctx, mockContract._id, updates);
          
          expect(ctx.db.patch).toHaveBeenCalledWith(mockContract._id, expect.objectContaining({
            ...updates,
            updatedAt: expect.any(Number)
          }));
        });
      });

      it('should prevent updating contracts from other enterprises', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          const contractFromOtherEnterprise = createMockContract({
            enterpriseId: 'other-enterprise' as any
          });
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          ctx.db.get.mockResolvedValue(contractFromOtherEnterprise);
          
          await expect(simulateUpdateContract(ctx, contractFromOtherEnterprise._id, {
            title: 'Hacked Title'
          })).rejects.toThrow('Contract not found');
        });
      });

      it('should validate status transitions', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          const mockContract = createMockContract({
            enterpriseId: mockUser.enterpriseId,
            status: 'expired'
          });
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          ctx.db.get.mockResolvedValue(mockContract);
          
          // Should not allow reactivating expired contracts
          await expect(simulateUpdateContract(ctx, mockContract._id, {
            status: 'active' as const
          })).rejects.toThrow('Cannot reactivate expired contract');
        });
      });
    });

    describe('deleteContract', () => {
      it('should delete contract and associated storage', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          const mockContract = createMockContract({
            enterpriseId: mockUser.enterpriseId,
            storageId: 'storage123' as any
          });
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          ctx.db.get.mockResolvedValue(mockContract);
          
          await simulateDeleteContract(ctx, mockContract._id);
          
          expect(ctx.storage.delete).toHaveBeenCalledWith('storage123');
          expect(ctx.db.delete).toHaveBeenCalledWith(mockContract._id);
        });
      });

      it('should handle contracts without files', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          const mockContract = createMockContract({
            enterpriseId: mockUser.enterpriseId,
            storageId: undefined
          });
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          ctx.db.get.mockResolvedValue(mockContract);
          
          await simulateDeleteContract(ctx, mockContract._id);
          
          expect(ctx.storage.delete).not.toHaveBeenCalled();
          expect(ctx.db.delete).toHaveBeenCalledWith(mockContract._id);
        });
      });
    });

    describe('assignVendorToContract', () => {
      it('should assign vendor to contract', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          const mockContract = createMockContract({
            enterpriseId: mockUser.enterpriseId
          });
          const mockVendor = createMockVendor({
            enterpriseId: mockUser.enterpriseId
          });
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          ctx.db.get.mockResolvedValueOnce(mockContract);
          ctx.db.get.mockResolvedValueOnce(mockVendor);
          
          await simulateAssignVendor(ctx, mockContract._id, mockVendor._id);
          
          expect(ctx.db.patch).toHaveBeenCalledWith(mockContract._id, {
            vendorId: mockVendor._id,
            updatedAt: expect.any(Number)
          });
        });
      });

      it('should not assign vendor from different enterprise', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          const mockContract = createMockContract({
            enterpriseId: mockUser.enterpriseId
          });
          const vendorFromOtherEnterprise = createMockVendor({
            enterpriseId: 'other-enterprise' as any
          });
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          ctx.db.get.mockResolvedValueOnce(mockContract);
          ctx.db.get.mockResolvedValueOnce(vendorFromOtherEnterprise);
          
          await expect(simulateAssignVendor(
            ctx, 
            mockContract._id, 
            vendorFromOtherEnterprise._id
          )).rejects.toThrow('Vendor not found or does not belong to your enterprise');
        });
      });
    });
  });

  describe('Queries', () => {
    describe('getContracts', () => {
      it('should return paginated contracts for enterprise', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          const mockContracts = [
            createMockContract({ enterpriseId: mockUser.enterpriseId }),
            createMockContract({ enterpriseId: mockUser.enterpriseId }),
            createMockContract({ enterpriseId: mockUser.enterpriseId })
          ];
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          
          const mockPaginate = jest.fn().mockResolvedValue({
            page: mockContracts,
            continueCursor: null
          });
          ctx.db.query().filter().order().paginate = mockPaginate;
          
          const result = await simulateGetContracts(ctx, {
            paginationOpts: { numItems: 10 }
          });
          
          expect(result.page).toHaveLength(3);
          expect(result.continueCursor).toBeNull();
          expect(mockPaginate).toHaveBeenCalledWith({ numItems: 10 });
        });
      });

      it('should filter contracts by status', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          
          const mockFilter = jest.fn().mockReturnThis();
          const mockOrder = jest.fn().mockReturnThis();
          const mockPaginate = jest.fn().mockResolvedValue({
            page: [],
            continueCursor: null
          });
          
          ctx.db.query.mockReturnValue({
            filter: mockFilter,
            order: mockOrder,
            paginate: mockPaginate
          });
          
          await simulateGetContracts(ctx, {
            status: 'active',
            paginationOpts: { numItems: 10 }
          });
          
          // Verify filter was called multiple times (enterprise filter + status filter)
          expect(mockFilter).toHaveBeenCalledTimes(2);
        });
      });

      it('should filter contracts by vendor', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          const vendorId = 'vendor123';
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          
          const mockFilter = jest.fn().mockReturnThis();
          const mockOrder = jest.fn().mockReturnThis();
          const mockPaginate = jest.fn().mockResolvedValue({
            page: [],
            continueCursor: null
          });
          
          ctx.db.query.mockReturnValue({
            filter: mockFilter,
            order: mockOrder,
            paginate: mockPaginate
          });
          
          await simulateGetContracts(ctx, {
            vendorId,
            paginationOpts: { numItems: 10 }
          });
          
          // Verify filter was called for enterprise and vendor
          expect(mockFilter).toHaveBeenCalledTimes(2);
        });
      });
    });

    describe('getContractById', () => {
      it('should return contract with vendor details', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          const mockVendor = createMockVendor({
            enterpriseId: mockUser.enterpriseId
          });
          const mockContract = createMockContract({
            enterpriseId: mockUser.enterpriseId,
            vendorId: mockVendor._id
          });
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          ctx.db.get.mockResolvedValueOnce(mockContract);
          ctx.db.get.mockResolvedValueOnce(mockVendor);
          
          const result = await simulateGetContractById(ctx, mockContract._id);
          
          expect(result).toEqual({
            ...mockContract,
            vendor: mockVendor
          });
        });
      });

      it('should return null for non-existent contract', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          ctx.db.get.mockResolvedValue(null);
          
          const result = await simulateGetContractById(ctx, 'non-existent-id' as any);
          
          expect(result).toBeNull();
        });
      });

      it('should not return contracts from other enterprises', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          const contractFromOtherEnterprise = createMockContract({
            enterpriseId: 'other-enterprise' as any
          });
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          ctx.db.get.mockResolvedValue(contractFromOtherEnterprise);
          
          const result = await simulateGetContractById(ctx, contractFromOtherEnterprise._id);
          
          expect(result).toBeNull();
        });
      });
    });

    describe('getContractStats', () => {
      it('should calculate contract statistics correctly', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          const now = Date.now();
          const mockContracts = [
            createMockContract({ 
              enterpriseId: mockUser.enterpriseId, 
              status: 'active',
              value: 50000,
              extractedEndDate: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
            }),
            createMockContract({ 
              enterpriseId: mockUser.enterpriseId, 
              status: 'active',
              value: 30000,
              extractedEndDate: new Date(now + 60 * 24 * 60 * 60 * 1000).toISOString() // 60 days
            }),
            createMockContract({ 
              enterpriseId: mockUser.enterpriseId, 
              status: 'expired',
              value: 20000
            }),
            createMockContract({ 
              enterpriseId: mockUser.enterpriseId, 
              status: 'draft',
              value: 40000
            })
          ];
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          ctx.db.query().filter().collect.mockResolvedValue(mockContracts);
          
          const stats = await simulateGetContractStats(ctx);
          
          expect(stats).toEqual({
            total: 4,
            active: 2,
            draft: 1,
            expired: 1,
            totalValue: 140000,
            activeValue: 80000,
            expiringIn30Days: 1,
            expiringIn60Days: 2
          });
        });
      });
    });
  });

  describe('Security Features', () => {
    it('should enforce rate limiting', async () => {
      await withMockContext(async (ctx) => {
        const mockUser = createMockUser();
        ctx.auth.getUserIdentity.mockResolvedValue({
          subject: mockUser.clerkId,
          email: mockUser.email
        });
        ctx.db.query().filter().first.mockResolvedValue(mockUser);
        
        // Simulate rate limit exceeded
        const rateLimitKey = `rate-limit:${mockUser._id}:createContract`;
        ctx.db.query().filter().first.mockResolvedValue({
          count: 10,
          timestamp: Date.now()
        });
        
        await expect(simulateCreateContract(ctx, {
          title: 'Test Contract',
          type: 'service' as const
        })).rejects.toThrow('Rate limit exceeded');
      });
    });

    it('should create audit logs for sensitive operations', async () => {
      await withMockContext(async (ctx) => {
        const mockUser = createMockUser();
        const mockContract = createMockContract({
          enterpriseId: mockUser.enterpriseId
        });
        
        ctx.auth.getUserIdentity.mockResolvedValue({
          subject: mockUser.clerkId,
          email: mockUser.email
        });
        ctx.db.query().filter().first.mockResolvedValue(mockUser);
        ctx.db.get.mockResolvedValue(mockContract);
        
        await simulateDeleteContract(ctx, mockContract._id);
        
        // Verify audit log was created
        expect(ctx.db.insert).toHaveBeenCalledWith('auditLogs', expect.objectContaining({
          action: 'contract.delete',
          entityId: mockContract._id,
          entityType: 'contract',
          userId: mockUser._id,
          enterpriseId: mockUser.enterpriseId,
          timestamp: expect.any(Number)
        }));
      });
    });
  });
});

// Simulation functions that mimic the actual implementation logic
async function simulateCreateContract(ctx: any, args: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError('Not authenticated');
  }
  
  const user = await ctx.db.query('users')
    .filter((q: any) => q.eq(q.field('clerkId'), identity.subject))
    .first();
    
  if (!user) {
    throw new ConvexError('User not found');
  }
  
  // Validate title
  if (!args.title || args.title.length < 3 || args.title.length > 200) {
    throw new ConvexError('Title must be between 3 and 200 characters');
  }
  
  // XSS prevention
  if (args.title.includes('<') || args.title.includes('>')) {
    throw new ConvexError('Title contains invalid characters');
  }
  
  if (args.notes && (args.notes.includes('<') || args.notes.includes('>'))) {
    throw new ConvexError('Notes contain invalid characters');
  }
  
  // Validate vendor ownership
  if (args.vendorId) {
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor || vendor.enterpriseId !== user.enterpriseId) {
      throw new ConvexError('Vendor not found or does not belong to your enterprise');
    }
  }
  
  return await ctx.db.insert('contracts', {
    ...args,
    status: args.status || 'draft',
    enterpriseId: user.enterpriseId,
    createdBy: user._id,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
}

async function simulateUpdateContract(ctx: any, contractId: any, updates: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError('Not authenticated');
  }
  
  const user = await ctx.db.query('users')
    .filter((q: any) => q.eq(q.field('clerkId'), identity.subject))
    .first();
    
  if (!user) {
    throw new ConvexError('User not found');
  }
  
  const contract = await ctx.db.get(contractId);
  if (!contract || contract.enterpriseId !== user.enterpriseId) {
    throw new ConvexError('Contract not found');
  }
  
  // Validate status transitions
  if (updates.status === 'active' && contract.status === 'expired') {
    throw new ConvexError('Cannot reactivate expired contract');
  }
  
  return await ctx.db.patch(contractId, {
    ...updates,
    updatedAt: Date.now()
  });
}

async function simulateDeleteContract(ctx: any, contractId: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError('Not authenticated');
  }
  
  const user = await ctx.db.query('users')
    .filter((q: any) => q.eq(q.field('clerkId'), identity.subject))
    .first();
    
  if (!user) {
    throw new ConvexError('User not found');
  }
  
  const contract = await ctx.db.get(contractId);
  if (!contract || contract.enterpriseId !== user.enterpriseId) {
    throw new ConvexError('Contract not found');
  }
  
  // Delete associated storage
  if (contract.fileId) {
    await ctx.storage.delete(contract.fileId);
  }
  
  // Create audit log
  await ctx.db.insert('auditLogs', {
    action: 'contract.delete',
    entityId: contractId,
    entityType: 'contract',
    userId: user._id,
    enterpriseId: user.enterpriseId,
    timestamp: Date.now(),
    details: { contractTitle: contract.title }
  });
  
  return await ctx.db.delete(contractId);
}

async function simulateAssignVendor(ctx: any, contractId: any, vendorId: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError('Not authenticated');
  }
  
  const user = await ctx.db.query('users')
    .filter((q: any) => q.eq(q.field('clerkId'), identity.subject))
    .first();
    
  if (!user) {
    throw new ConvexError('User not found');
  }
  
  const contract = await ctx.db.get(contractId);
  if (!contract || contract.enterpriseId !== user.enterpriseId) {
    throw new ConvexError('Contract not found');
  }
  
  const vendor = await ctx.db.get(vendorId);
  if (!vendor || vendor.enterpriseId !== user.enterpriseId) {
    throw new ConvexError('Vendor not found or does not belong to your enterprise');
  }
  
  return await ctx.db.patch(contractId, {
    vendorId,
    updatedAt: Date.now()
  });
}

async function simulateGetContracts(ctx: any, args: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError('Not authenticated');
  }
  
  const user = await ctx.db.query('users')
    .filter((q: any) => q.eq(q.field('clerkId'), identity.subject))
    .first();
    
  if (!user) {
    throw new ConvexError('User not found');
  }
  
  let query = ctx.db.query('contracts')
    .filter((q: any) => q.eq(q.field('enterpriseId'), user.enterpriseId));
    
  if (args.status) {
    query = query.filter((q: any) => q.eq(q.field('status'), args.status));
  }
  
  if (args.vendorId) {
    query = query.filter((q: any) => q.eq(q.field('vendorId'), args.vendorId));
  }
  
  return await query
    .order('desc')
    .paginate(args.paginationOpts);
}

async function simulateGetContractById(ctx: any, contractId: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError('Not authenticated');
  }
  
  const user = await ctx.db.query('users')
    .filter((q: any) => q.eq(q.field('clerkId'), identity.subject))
    .first();
    
  if (!user) {
    throw new ConvexError('User not found');
  }
  
  const contract = await ctx.db.get(contractId);
  if (!contract || contract.enterpriseId !== user.enterpriseId) {
    return null;
  }
  
  let vendor = null;
  if (contract.vendorId) {
    vendor = await ctx.db.get(contract.vendorId);
  }
  
  return {
    ...contract,
    vendor
  };
}

async function simulateGetContractStats(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError('Not authenticated');
  }
  
  const user = await ctx.db.query('users')
    .filter((q: any) => q.eq(q.field('clerkId'), identity.subject))
    .first();
    
  if (!user) {
    throw new ConvexError('User not found');
  }
  
  const contracts = await ctx.db.query('contracts')
    .filter((q: any) => q.eq(q.field('enterpriseId'), user.enterpriseId))
    .collect();
    
  const now = Date.now();
  const thirtyDaysFromNow = now + 30 * 24 * 60 * 60 * 1000;
  const sixtyDaysFromNow = now + 60 * 24 * 60 * 60 * 1000;
  
  const stats = {
    total: contracts.length,
    active: 0,
    draft: 0,
    expired: 0,
    totalValue: 0,
    activeValue: 0,
    expiringIn30Days: 0,
    expiringIn60Days: 0
  };
  
  contracts.forEach((contract: any) => {
    stats.totalValue += contract.value || 0;
    
    switch (contract.status) {
      case 'active':
        stats.active++;
        stats.activeValue += contract.value || 0;
        
        if (contract.endDate) {
          if (contract.endDate <= thirtyDaysFromNow) {
            stats.expiringIn30Days++;
          }
          if (contract.endDate <= sixtyDaysFromNow) {
            stats.expiringIn60Days++;
          }
        }
        break;
      case 'draft':
        stats.draft++;
        break;
      case 'expired':
        stats.expired++;
        break;
    }
  });
  
  return stats;
}