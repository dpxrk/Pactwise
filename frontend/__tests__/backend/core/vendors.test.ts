import { ConvexError } from 'convex/values';
import { 
  createMockConvexContext, 
  createMockVendor, 
  createMockUser,
  createMockEnterprise,
  createMockContract,
  withMockContext,
  expectToBeId,
  expectToBeTimestamp
} from '../utils/convex-test-helpers';

describe('Vendor Management', () => {
  describe('Mutations', () => {
    describe('createVendor', () => {
      it('should create a new vendor with valid data', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser({ role: 'admin' });
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          
          // Mock no existing vendor with same name
          ctx.db.query().filter().filter().first.mockResolvedValue(null);
          
          const expectedId = 'vendor123';
          ctx.db.insert.mockResolvedValue(expectedId);
          
          const vendorData = {
            name: 'Acme Corporation',
            legalName: 'Acme Corp LLC',
            category: 'technology' as const,
            taxId: '12-3456789',
            email: 'contact@acme.com',
            phone: '+1234567890',
            website: 'https://acme.com',
            address: {
              street: '123 Main St',
              city: 'Springfield',
              state: 'IL',
              zipCode: '62701',
              country: 'USA'
            },
            primaryContact: {
              name: 'John Doe',
              email: 'john@acme.com',
              phone: '+1234567891'
            },
            categories: ['software', 'consulting']
          };
          
          const result = await simulateCreateVendor(ctx, vendorData);
          
          expect(result).toBe(expectedId);
          expect(ctx.db.insert).toHaveBeenCalledWith('vendors', expect.objectContaining({
            name: vendorData.name,
            legalName: vendorData.legalName,
            category: vendorData.category,
            status: 'active',
            enterpriseId: mockUser.enterpriseId,
            createdAt: expect.any(Number),
            updatedAt: expect.any(Number)
          }));
        });
      });

      it('should prevent duplicate vendors', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser({ role: 'admin' });
          const existingVendor = createMockVendor({
            name: 'Acme Corporation',
            enterpriseId: mockUser.enterpriseId
          });
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          
          // Mock existing vendor found
          ctx.db.query().filter().filter().first.mockResolvedValue(existingVendor);
          
          await expect(simulateCreateVendor(ctx, {
            name: 'Acme Corporation',
            category: 'technology' as const
          })).rejects.toThrow('Vendor with this name already exists');
        });
      });

      it('should validate required fields', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser({ role: 'admin' });
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          
          // Test empty name
          await expect(simulateCreateVendor(ctx, {
            name: '',
            category: 'technology' as const
          })).rejects.toThrow('Vendor name is required');
          
          // Test invalid category
          await expect(simulateCreateVendor(ctx, {
            name: 'Test Vendor',
            category: 'invalid' as any
          })).rejects.toThrow('Invalid vendor category');
        });
      });

      it('should validate email format', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser({ role: 'admin' });
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          ctx.db.query().filter().filter().first.mockResolvedValue(null);
          
          await expect(simulateCreateVendor(ctx, {
            name: 'Test Vendor',
            category: 'technology' as const,
            email: 'invalid-email'
          })).rejects.toThrow('Invalid email format');
        });
      });

      it('should require admin or owner role', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser({ role: 'viewer' });
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          
          await expect(simulateCreateVendor(ctx, {
            name: 'Test Vendor',
            category: 'technology' as const
          })).rejects.toThrow('Insufficient permissions. Admin or owner role required');
        });
      });

      it('should normalize vendor names for duplicate detection', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser({ role: 'admin' });
          const existingVendor = createMockVendor({
            name: 'ACME CORPORATION',
            enterpriseId: mockUser.enterpriseId
          });
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          
          // Mock normalized name search
          ctx.db.query().filter().filter().first.mockResolvedValue(existingVendor);
          
          await expect(simulateCreateVendor(ctx, {
            name: 'Acme Corporation', // Different case
            category: 'technology' as const
          })).rejects.toThrow('Vendor with this name already exists');
        });
      });
    });

    describe('updateVendor', () => {
      it('should update vendor with valid changes', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser({ role: 'admin' });
          const mockVendor = createMockVendor({
            enterpriseId: mockUser.enterpriseId
          });
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          ctx.db.get.mockResolvedValue(mockVendor);
          
          const updates = {
            name: 'Updated Vendor Name',
            email: 'newemail@vendor.com',
            status: 'inactive' as const,
            categories: ['technology', 'consulting']
          };
          
          await simulateUpdateVendor(ctx, mockVendor._id, updates);
          
          expect(ctx.db.patch).toHaveBeenCalledWith(mockVendor._id, expect.objectContaining({
            ...updates,
            updatedAt: expect.any(Number)
          }));
        });
      });

      it('should prevent updating to duplicate name', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser({ role: 'admin' });
          const mockVendor = createMockVendor({
            _id: 'vendor1' as any,
            name: 'Vendor One',
            enterpriseId: mockUser.enterpriseId
          });
          const existingVendor = createMockVendor({
            _id: 'vendor2' as any,
            name: 'Vendor Two',
            enterpriseId: mockUser.enterpriseId
          });
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          ctx.db.get.mockResolvedValue(mockVendor);
          
          // Mock finding duplicate
          ctx.db.query().filter().filter().filter().first.mockResolvedValue(existingVendor);
          
          await expect(simulateUpdateVendor(ctx, mockVendor._id, {
            name: 'Vendor Two'
          })).rejects.toThrow('Another vendor with this name already exists');
        });
      });

      it('should prevent updating vendors from other enterprises', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser({ role: 'admin' });
          const vendorFromOtherEnterprise = createMockVendor({
            enterpriseId: 'other-enterprise' as any
          });
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          ctx.db.get.mockResolvedValue(vendorFromOtherEnterprise);
          
          await expect(simulateUpdateVendor(ctx, vendorFromOtherEnterprise._id, {
            name: 'Hacked Name'
          })).rejects.toThrow('Vendor not found');
        });
      });

      it('should allow members to update basic fields', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser({ role: 'user' });
          const mockVendor = createMockVendor({
            enterpriseId: mockUser.enterpriseId
          });
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          ctx.db.get.mockResolvedValue(mockVendor);
          
          await simulateUpdateVendor(ctx, mockVendor._id, {
            phone: '+9876543210',
            primaryContact: {
              name: 'New Contact',
              email: 'contact@vendor.com'
            }
          });
          
          expect(ctx.db.patch).toHaveBeenCalled();
        });
      });
    });

    describe('deleteVendor', () => {
      it('should delete vendor without contracts', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser({ role: 'owner' });
          const mockVendor = createMockVendor({
            enterpriseId: mockUser.enterpriseId
          });
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          ctx.db.get.mockResolvedValue(mockVendor);
          
          // No contracts found
          ctx.db.query().filter().filter().first.mockResolvedValue(null);
          
          await simulateDeleteVendor(ctx, mockVendor._id);
          
          expect(ctx.db.delete).toHaveBeenCalledWith(mockVendor._id);
        });
      });

      it('should prevent deleting vendor with active contracts', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser({ role: 'owner' });
          const mockVendor = createMockVendor({
            enterpriseId: mockUser.enterpriseId
          });
          const mockContract = createMockContract({
            vendorId: mockVendor._id,
            status: 'active'
          });
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          ctx.db.get.mockResolvedValue(mockVendor);
          
          // Contract found
          ctx.db.query().filter().filter().first.mockResolvedValue(mockContract);
          
          await expect(simulateDeleteVendor(ctx, mockVendor._id))
            .rejects.toThrow('Cannot delete vendor with existing contracts');
        });
      });

      it('should require owner role', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser({ role: 'admin' });
          const mockVendor = createMockVendor({
            enterpriseId: mockUser.enterpriseId
          });
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          ctx.db.get.mockResolvedValue(mockVendor);
          
          await expect(simulateDeleteVendor(ctx, mockVendor._id))
            .rejects.toThrow('Only owners can delete vendors');
        });
      });
    });

    describe('bulkUpdateCategories', () => {
      it('should update categories for multiple vendors', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser({ role: 'admin' });
          const mockVendors = [
            createMockVendor({ _id: 'vendor1' as any, enterpriseId: mockUser.enterpriseId }),
            createMockVendor({ _id: 'vendor2' as any, enterpriseId: mockUser.enterpriseId }),
            createMockVendor({ _id: 'vendor3' as any, enterpriseId: mockUser.enterpriseId })
          ];
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          
          // Mock get calls for each vendor
          ctx.db.get.mockImplementation((id) => {
            return mockVendors.find(v => v._id === id) || null;
          });
          
          const vendorIds = mockVendors.map(v => v._id);
          const categories = ['technology', 'consulting'];
          
          const result = await simulateBulkUpdateCategories(ctx, vendorIds, categories);
          
          expect(result.updated).toBe(3);
          expect(result.failed).toBe(0);
          expect(ctx.db.patch).toHaveBeenCalledTimes(3);
        });
      });

      it('should skip vendors from other enterprises', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser({ role: 'admin' });
          const ownVendor = createMockVendor({ 
            _id: 'vendor1' as any, 
            enterpriseId: mockUser.enterpriseId 
          });
          const otherVendor = createMockVendor({ 
            _id: 'vendor2' as any, 
            enterpriseId: 'other-enterprise' as any 
          });
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          
          ctx.db.get.mockImplementation((id) => {
            if (id === 'vendor1') return ownVendor;
            if (id === 'vendor2') return otherVendor;
            return null;
          });
          
          const result = await simulateBulkUpdateCategories(
            ctx, 
            ['vendor1' as any, 'vendor2' as any], 
            ['technology']
          );
          
          expect(result.updated).toBe(1);
          expect(result.failed).toBe(1);
          expect(ctx.db.patch).toHaveBeenCalledTimes(1);
        });
      });
    });
  });

  describe('Queries', () => {
    describe('getVendors', () => {
      it('should return paginated vendors with filters', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          const mockVendors = [
            createMockVendor({ 
              enterpriseId: mockUser.enterpriseId,
              status: 'active',
              category: 'technology'
            }),
            createMockVendor({ 
              enterpriseId: mockUser.enterpriseId,
              status: 'active',
              category: 'consulting'
            })
          ];
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          
          const mockPaginate = jest.fn().mockResolvedValue({
            page: mockVendors,
            continueCursor: null
          });
          
          const mockOrder = jest.fn().mockReturnValue({ paginate: mockPaginate });
          const mockFilter = jest.fn();
          mockFilter.mockReturnValue({ 
            filter: mockFilter,
            order: mockOrder 
          });
          
          ctx.db.query.mockReturnValue({ filter: mockFilter });
          
          const result = await simulateGetVendors(ctx, {
            status: 'active',
            category: 'technology',
            paginationOpts: { numItems: 10 }
          });
          
          expect(result.page).toHaveLength(2);
          expect(mockFilter).toHaveBeenCalled();
          expect(mockOrder).toHaveBeenCalledWith('desc');
        });
      });

      it('should search vendors by name', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          const mockVendors = [
            createMockVendor({ 
              name: 'Acme Corporation',
              enterpriseId: mockUser.enterpriseId
            }),
            createMockVendor({ 
              name: 'Beta Industries',
              enterpriseId: mockUser.enterpriseId
            })
          ];
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          
          // Mock search functionality
          const searchResults = mockVendors.filter(v => 
            v.name.toLowerCase().includes('acme')
          );
          
          const mockPaginate = jest.fn().mockResolvedValue({
            page: searchResults,
            continueCursor: null
          });
          
          const mockOrder = jest.fn().mockReturnValue({ paginate: mockPaginate });
          const mockFilter = jest.fn();
          mockFilter.mockReturnValue({ 
            filter: mockFilter,
            order: mockOrder 
          });
          
          ctx.db.query.mockReturnValue({ filter: mockFilter });
          
          const result = await simulateGetVendors(ctx, {
            search: 'acme',
            paginationOpts: { numItems: 10 }
          });
          
          expect(result.page).toHaveLength(1);
          expect(result.page[0].name).toContain('Acme');
        });
      });

      it('should sort vendors by different fields', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          
          const mockPaginate = jest.fn().mockResolvedValue({
            page: [],
            continueCursor: null
          });
          
          const mockOrder = jest.fn().mockReturnValue({ paginate: mockPaginate });
          const mockFilter = jest.fn().mockReturnValue({ 
            order: mockOrder 
          });
          
          ctx.db.query.mockReturnValue({ filter: mockFilter });
          
          // Test sorting by name
          await simulateGetVendors(ctx, {
            sortBy: 'name',
            sortOrder: 'asc',
            paginationOpts: { numItems: 10 }
          });
          
          expect(mockOrder).toHaveBeenCalledWith('asc');
        });
      });
    });

    describe('getVendorById', () => {
      it('should return vendor with calculated metrics', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          const mockVendor = createMockVendor({
            enterpriseId: mockUser.enterpriseId
          });
          const mockContracts = [
            createMockContract({ 
              vendorId: mockVendor._id, 
              value: 50000,
              status: 'active'
            }),
            createMockContract({ 
              vendorId: mockVendor._id, 
              value: 30000,
              status: 'active'
            }),
            createMockContract({ 
              vendorId: mockVendor._id, 
              value: 20000,
              status: 'expired'
            })
          ];
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          ctx.db.get.mockResolvedValue(mockVendor);
          ctx.db.query().filter().filter().collect.mockResolvedValue(mockContracts);
          
          const result = await simulateGetVendorById(ctx, mockVendor._id);
          
          expect(result).toEqual({
            ...mockVendor,
            metrics: {
              totalContracts: 3,
              activeContracts: 2,
              totalValue: 100000,
              activeValue: 80000,
              avgContractValue: 33333.33,
              lastContractDate: expect.any(Number)
            }
          });
        });
      });

      it('should return null for non-existent vendor', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          ctx.db.get.mockResolvedValue(null);
          
          const result = await simulateGetVendorById(ctx, 'non-existent' as any);
          
          expect(result).toBeNull();
        });
      });
    });

    describe('getVendorAnalytics', () => {
      it('should calculate vendor analytics correctly', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          const mockVendors = [
            createMockVendor({ 
              enterpriseId: mockUser.enterpriseId,
              status: 'active',
              category: 'technology',
            }),
            createMockVendor({ 
              enterpriseId: mockUser.enterpriseId,
              status: 'active',
              category: 'consulting'
            }),
            createMockVendor({ 
              enterpriseId: mockUser.enterpriseId,
              status: 'inactive',
              category: 'technology'
            })
          ];
          
          const mockContracts = [
            createMockContract({ value: 50000 }),
            createMockContract({ value: 30000 }),
            createMockContract({ value: 20000 })
          ];
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          ctx.db.query().filter().collect.mockResolvedValueOnce(mockVendors);
          ctx.db.query().filter().collect.mockResolvedValueOnce(mockContracts);
          
          const analytics = await simulateGetVendorAnalytics(ctx);
          
          expect(analytics).toEqual({
            totalVendors: 3,
            activeVendors: 2,
            inactiveVendors: 1,
            byType: {
              supplier: 2,
              service: 1
            },
            byCategory: {
              technology: 2,
              consulting: 1,
              office: 1
            },
            totalSpend: 100000,
            avgContractValue: 33333.33,
            vendorsWithoutContracts: expect.any(Number),
            recentActivity: {
              newVendorsThisMonth: expect.any(Number),
              updatedThisWeek: expect.any(Number)
            }
          });
        });
      });
    });

    describe('getVendorCategories', () => {
      it('should return unique categories with counts', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          const mockVendors = [
            createMockVendor({ 
              category: 'technology',
              enterpriseId: mockUser.enterpriseId
            }),
            createMockVendor({ 
              category: 'consulting',
              enterpriseId: mockUser.enterpriseId
            }),
            createMockVendor({ 
              category: 'technology',
              enterpriseId: mockUser.enterpriseId
            })
          ];
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          ctx.db.query().filter().first.mockResolvedValue(mockUser);
          ctx.db.query().filter().collect.mockResolvedValue(mockVendors);
          
          const categories = await simulateGetVendorCategories(ctx);
          
          expect(categories).toEqual([
            { name: 'technology', count: 3 },
            { name: 'consulting', count: 1 },
            { name: 'software', count: 1 }
          ]);
        });
      });
    });
  });

  describe('Vendor Agent Functions', () => {
    describe('processUnassignedContracts', () => {
      it('should match contracts to existing vendors', async () => {
        await withMockContext(async (ctx) => {
          const mockContract = createMockContract({
            vendorId: undefined,
            extractedParties: ['Acme Corporation']
          });
          const mockVendor = createMockVendor({
            name: 'ACME CORPORATION'
          });
          
          ctx.db.query().filter().filter().collect.mockResolvedValue([mockContract]);
          ctx.db.query().filter().collect.mockResolvedValue([mockVendor]);
          
          const result = await simulateProcessUnassignedContracts(ctx);
          
          expect(result.matched).toBe(1);
          expect(ctx.db.patch).toHaveBeenCalledWith(mockContract._id, {
            vendorId: mockVendor._id,
            updatedAt: expect.any(Number)
          });
        });
      });

      it('should create new vendor when no match found', async () => {
        await withMockContext(async (ctx) => {
          const mockContract = createMockContract({
            extractedParties: ['New Vendor Inc']
          });
          
          ctx.db.query().filter().filter().collect.mockResolvedValue([mockContract]);
          ctx.db.query().filter().collect.mockResolvedValue([]); // No existing vendors
          
          const newVendorId = 'new-vendor-id';
          ctx.db.insert.mockResolvedValue(newVendorId);
          
          const result = await simulateProcessUnassignedContracts(ctx);
          
          expect(result.created).toBe(1);
          expect(ctx.db.insert).toHaveBeenCalledWith('vendors', expect.objectContaining({
            name: 'New Vendor Inc',
            status: 'active',
            source: 'auto-created'
          }));
        });
      });

      it('should use fuzzy matching for vendor names', async () => {
        await withMockContext(async (ctx) => {
          const mockContract = createMockContract({
            extractedParties: ['Acme Corp.']
          });
          const mockVendor = createMockVendor({
            name: 'Acme Corporation'
          });
          
          ctx.db.query().filter().filter().collect.mockResolvedValue([mockContract]);
          ctx.db.query().filter().collect.mockResolvedValue([mockVendor]);
          
          const result = await simulateProcessUnassignedContracts(ctx);
          
          expect(result.matched).toBe(1);
          expect(ctx.db.patch).toHaveBeenCalledWith(mockContract._id, {
            vendorId: mockVendor._id,
            updatedAt: expect.any(Number)
          });
        });
      });
    });

    describe('mergeDuplicateVendors', () => {
      it('should identify and merge duplicate vendors', async () => {
        await withMockContext(async (ctx) => {
          const vendor1 = createMockVendor({
            _id: 'vendor1' as any,
            name: 'Acme Corporation',
            createdAt: new Date(Date.now() - 1000).toISOString()
          });
          const vendor2 = createMockVendor({
            _id: 'vendor2' as any,
            name: 'ACME CORP',
            createdAt: new Date().toISOString()
          });
          
          const mockVendors = [vendor1, vendor2];
          const mockContracts = [
            createMockContract({ vendorId: vendor2._id }),
            createMockContract({ vendorId: vendor2._id })
          ];
          
          ctx.db.query().filter().collect.mockResolvedValueOnce(mockVendors);
          ctx.db.query().filter().filter().collect.mockResolvedValue(mockContracts);
          
          const result = await simulateMergeDuplicateVendors(ctx);
          
          expect(result.merged).toBe(1);
          expect(ctx.db.patch).toHaveBeenCalledTimes(2); // Update 2 contracts
          expect(ctx.db.delete).toHaveBeenCalledWith(vendor2._id); // Delete newer duplicate
        });
      });

      it('should keep vendor with most contracts', async () => {
        await withMockContext(async (ctx) => {
          const vendor1 = createMockVendor({
            _id: 'vendor1' as any,
            name: 'Acme Corporation'
          });
          const vendor2 = createMockVendor({
            _id: 'vendor2' as any,
            name: 'ACME CORP'
          });
          
          const mockVendors = [vendor1, vendor2];
          
          // Vendor 2 has more contracts
          ctx.db.query().filter().filter().collect
            .mockResolvedValueOnce([createMockContract()]) // vendor1 contracts
            .mockResolvedValueOnce([
              createMockContract(), 
              createMockContract(), 
              createMockContract()
            ]); // vendor2 contracts
          
          ctx.db.query().filter().collect.mockResolvedValue(mockVendors);
          
          const result = await simulateMergeDuplicateVendors(ctx);
          
          expect(result.merged).toBe(1);
          expect(ctx.db.delete).toHaveBeenCalledWith(vendor1._id); // Delete vendor with fewer contracts
        });
      });
    });
  });
});

// Simulation functions
async function simulateCreateVendor(ctx: any, args: any) {
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
  
  // Check permissions
  if (user.role !== 'admin' && user.role !== 'owner') {
    throw new ConvexError('Insufficient permissions. Admin or owner role required');
  }
  
  // Validate required fields
  if (!args.name || args.name.trim() === '') {
    throw new ConvexError('Vendor name is required');
  }
  
  // Validate type
  const validTypes = ['supplier', 'service', 'contractor', 'consultant'];
  if (!validTypes.includes(args.type)) {
    throw new ConvexError('Invalid vendor type');
  }
  
  // Validate email
  if (args.email && !isValidEmail(args.email)) {
    throw new ConvexError('Invalid email format');
  }
  
  // Check for duplicates
  const normalizedName = args.name.trim().toLowerCase();
  const existingVendor = await ctx.db.query('vendors')
    .filter((q: any) => q.eq(q.field('enterpriseId'), user.enterpriseId))
    .filter((q: any) => q.eq(q.field('normalizedName'), normalizedName))
    .first();
    
  if (existingVendor) {
    throw new ConvexError('Vendor with this name already exists');
  }
  
  return await ctx.db.insert('vendors', {
    ...args,
    normalizedName,
    status: 'active',
    enterpriseId: user.enterpriseId,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
}

async function simulateUpdateVendor(ctx: any, vendorId: any, updates: any) {
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
  
  const vendor = await ctx.db.get(vendorId);
  if (!vendor || vendor.enterpriseId !== user.enterpriseId) {
    throw new ConvexError('Vendor not found');
  }
  
  // Check for duplicate name if updating name
  if (updates.name && updates.name !== vendor.name) {
    const normalizedName = updates.name.trim().toLowerCase();
    const duplicate = await ctx.db.query('vendors')
      .filter((q: any) => q.eq(q.field('enterpriseId'), user.enterpriseId))
      .filter((q: any) => q.eq(q.field('normalizedName'), normalizedName))
      .filter((q: any) => q.neq(q.field('_id'), vendorId))
      .first();
      
    if (duplicate) {
      throw new ConvexError('Another vendor with this name already exists');
    }
    
    updates.normalizedName = normalizedName;
  }
  
  return await ctx.db.patch(vendorId, {
    ...updates,
    updatedAt: Date.now()
  });
}

async function simulateDeleteVendor(ctx: any, vendorId: any) {
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
  
  if (user.role !== 'owner') {
    throw new ConvexError('Only owners can delete vendors');
  }
  
  const vendor = await ctx.db.get(vendorId);
  if (!vendor || vendor.enterpriseId !== user.enterpriseId) {
    throw new ConvexError('Vendor not found');
  }
  
  // Check for existing contracts
  const contract = await ctx.db.query('contracts')
    .filter((q: any) => q.eq(q.field('enterpriseId'), user.enterpriseId))
    .filter((q: any) => q.eq(q.field('vendorId'), vendorId))
    .first();
    
  if (contract) {
    throw new ConvexError('Cannot delete vendor with existing contracts');
  }
  
  return await ctx.db.delete(vendorId);
}

async function simulateBulkUpdateCategories(ctx: any, vendorIds: any[], categories: string[]) {
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
  
  let updated = 0;
  let failed = 0;
  
  for (const vendorId of vendorIds) {
    const vendor = await ctx.db.get(vendorId);
    if (vendor && vendor.enterpriseId === user.enterpriseId) {
      await ctx.db.patch(vendorId, {
        categories,
        updatedAt: Date.now()
      });
      updated++;
    } else {
      failed++;
    }
  }
  
  return { updated, failed };
}

async function simulateGetVendors(ctx: any, args: any) {
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
  
  let query = ctx.db.query('vendors')
    .filter((q: any) => q.eq(q.field('enterpriseId'), user.enterpriseId));
    
  if (args.status) {
    query = query.filter((q: any) => q.eq(q.field('status'), args.status));
  }
  
  if (args.type) {
    query = query.filter((q: any) => q.eq(q.field('type'), args.type));
  }
  
  const sortOrder = args.sortOrder || 'desc';
  query = query.order(sortOrder);
  
  return await query.paginate(args.paginationOpts);
}

async function simulateGetVendorById(ctx: any, vendorId: any) {
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
  
  const vendor = await ctx.db.get(vendorId);
  if (!vendor || vendor.enterpriseId !== user.enterpriseId) {
    return null;
  }
  
  // Calculate metrics
  const contracts = await ctx.db.query('contracts')
    .filter((q: any) => q.eq(q.field('enterpriseId'), user.enterpriseId))
    .filter((q: any) => q.eq(q.field('vendorId'), vendorId))
    .collect();
    
  const metrics = {
    totalContracts: contracts.length,
    activeContracts: contracts.filter((c: any) => c.status === 'active').length,
    totalValue: contracts.reduce((sum: number, c: any) => sum + (c.value || 0), 0),
    activeValue: contracts
      .filter((c: any) => c.status === 'active')
      .reduce((sum: number, c: any) => sum + (c.value || 0), 0),
    avgContractValue: contracts.length > 0 
      ? Math.round((contracts.reduce((sum: number, c: any) => sum + (c.value || 0), 0) / contracts.length) * 100) / 100
      : 0,
    lastContractDate: contracts.length > 0
      ? Math.max(...contracts.map((c: any) => c.createdAt))
      : null
  };
  
  return {
    ...vendor,
    metrics
  };
}

async function simulateGetVendorAnalytics(ctx: any) {
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
  
  const vendors = await ctx.db.query('vendors')
    .filter((q: any) => q.eq(q.field('enterpriseId'), user.enterpriseId))
    .collect();
    
  const contracts = await ctx.db.query('contracts')
    .filter((q: any) => q.eq(q.field('enterpriseId'), user.enterpriseId))
    .collect();
    
  const analytics = {
    totalVendors: vendors.length,
    activeVendors: vendors.filter((v: any) => v.status === 'active').length,
    inactiveVendors: vendors.filter((v: any) => v.status === 'inactive').length,
    byType: vendors.reduce((acc: any, v: any) => {
      acc[v.type] = (acc[v.type] || 0) + 1;
      return acc;
    }, {}),
    byCategory: vendors.reduce((acc: any, v: any) => {
      (v.categories || []).forEach((cat: string) => {
        acc[cat] = (acc[cat] || 0) + 1;
      });
      return acc;
    }, {}),
    totalSpend: contracts.reduce((sum: number, c: any) => sum + (c.value || 0), 0),
    avgContractValue: contracts.length > 0
      ? Math.round((contracts.reduce((sum: number, c: any) => sum + (c.value || 0), 0) / contracts.length) * 100) / 100
      : 0,
    vendorsWithoutContracts: vendors.filter((v: any) => 
      !contracts.some((c: any) => c.vendorId === v._id)
    ).length,
    recentActivity: {
      newVendorsThisMonth: vendors.filter((v: any) => 
        v.createdAt > Date.now() - 30 * 24 * 60 * 60 * 1000
      ).length,
      updatedThisWeek: vendors.filter((v: any) => 
        v.updatedAt > Date.now() - 7 * 24 * 60 * 60 * 1000
      ).length
    }
  };
  
  return analytics;
}

async function simulateGetVendorCategories(ctx: any) {
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
  
  const vendors = await ctx.db.query('vendors')
    .filter((q: any) => q.eq(q.field('enterpriseId'), user.enterpriseId))
    .collect();
    
  const categoryMap = new Map<string, number>();
  
  vendors.forEach((vendor: any) => {
    (vendor.categories || []).forEach((cat: string) => {
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    });
  });
  
  return Array.from(categoryMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

async function simulateProcessUnassignedContracts(ctx: any) {
  const contracts = await ctx.db.query('contracts')
    .filter((q: any) => q.eq(q.field('vendorId'), null))
    .filter((q: any) => q.neq(q.field('analysisResults'), null))
    .collect();
    
  const vendors = await ctx.db.query('vendors')
    .filter((q: any) => q.eq(q.field('status'), 'active'))
    .collect();
    
  let matched = 0;
  let created = 0;
  
  for (const contract of contracts) {
    const vendorInfo = contract.analysisResults?.extractedVendorInfo;
    if (!vendorInfo?.name) continue;
    
    // Try to find matching vendor
    const normalizedName = vendorInfo.name.trim().toLowerCase();
    const matchingVendor = vendors.find((v: any) => {
      const vendorName = v.name.toLowerCase();
      return vendorName === normalizedName || 
             calculateSimilarity(vendorName, normalizedName) > 0.8;
    });
    
    if (matchingVendor) {
      await ctx.db.patch(contract._id, {
        vendorId: matchingVendor._id,
        updatedAt: Date.now()
      });
      matched++;
    } else {
      // Create new vendor
      const newVendorId = await ctx.db.insert('vendors', {
        name: vendorInfo.name,
        email: vendorInfo.email,
        phone: vendorInfo.phone,
        address: vendorInfo.address,
        type: 'supplier',
        status: 'active',
        source: 'auto-created',
        enterpriseId: contract.enterpriseId,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      
      await ctx.db.patch(contract._id, {
        vendorId: newVendorId,
        updatedAt: Date.now()
      });
      created++;
    }
  }
  
  return { matched, created, total: contracts.length };
}

async function simulateMergeDuplicateVendors(ctx: any) {
  const vendors = await ctx.db.query('vendors')
    .filter((q: any) => q.eq(q.field('status'), 'active'))
    .collect();
    
  const duplicateGroups = new Map<string, any[]>();
  
  // Group potential duplicates
  vendors.forEach((vendor: any) => {
    const normalizedName = vendor.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const existing = duplicateGroups.get(normalizedName) || [];
    existing.push(vendor);
    duplicateGroups.set(normalizedName, existing);
  });
  
  let merged = 0;
  
  for (const [key, group] of duplicateGroups) {
    if (group.length <= 1) continue;
    
    // Determine primary vendor (most contracts or oldest)
    const vendorsWithCounts = await Promise.all(
      group.map(async (vendor: any) => {
        const contracts = await ctx.db.query('contracts')
          .filter((q: any) => q.eq(q.field('vendorId'), vendor._id))
          .collect();
        return { vendor, contractCount: contracts.length };
      })
    );
    
    // Sort by contract count (desc) then by creation date (asc)
    vendorsWithCounts.sort((a, b) => {
      if (b.contractCount !== a.contractCount) {
        return b.contractCount - a.contractCount;
      }
      return a.vendor.createdAt - b.vendor.createdAt;
    });
    
    const primary = vendorsWithCounts[0].vendor;
    const duplicates = vendorsWithCounts.slice(1);
    
    // Merge duplicates into primary
    for (const { vendor: duplicate } of duplicates) {
      // Update contracts
      const contracts = await ctx.db.query('contracts')
        .filter((q: any) => q.eq(q.field('vendorId'), duplicate._id))
        .collect();
        
      for (const contract of contracts) {
        await ctx.db.patch(contract._id, {
          vendorId: primary!._id,
          updatedAt: Date.now()
        });
      }
      
      // Delete duplicate
      await ctx.db.delete(duplicate._id);
      merged++;
    }
  }
  
  return { merged };
}

// Helper functions
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function calculateSimilarity(str1: string, str2: string): number {
  // Simple similarity calculation (in real implementation would use Levenshtein distance)
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function getEditDistance(s1: string, s2: string): number {
  // Simplified edit distance
  const dp: number[][] = Array(s1.length + 1)
    .fill(null)
    .map(() => Array(s2.length + 1).fill(0));
    
  for (let i = 0; i <= s1.length; i++) dp[i][0] = i;
  for (let j = 0; j <= s2.length; j++) dp[0][j] = j;
  
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]!;
      } else {
        dp[i][j] = Math.min(
          dp[i - 1]![j]! + 1,
          dp[i]![j - 1]! + 1,
          dp[i - 1]![j - 1]! + 1
        );
      }
    }
  }
  
  return dp[s1.length]![s2.length]!;
}