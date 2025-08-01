import { ConvexError } from 'convex/values';
import { 
  createMockConvexContext, 
  createMockUser,
  createMockEnterprise,
  createMockContract,
  createMockVendor,
  withMockContext,
  expectToBeId,
  expectToBeTimestamp
} from '../utils/convex-test-helpers';

describe('Enterprise Management', () => {
  describe('Mutations', () => {
    describe('createEnterpriseWithOwner', () => {
      it('should create enterprise and owner user', async () => {
        await withMockContext(async (ctx) => {
          const identity = {
            subject: 'new-clerk-id',
            email: 'owner@newcompany.com',
            given_name: 'John',
            family_name: 'Doe'
          };
          
          ctx.auth.getUserIdentity.mockResolvedValue(identity);
          ctx.db.query().withIndex().first.mockResolvedValue(null); // No existing user
          
          const enterpriseId = 'new-enterprise-id' as any;
          ctx.db.insert.mockResolvedValueOnce(enterpriseId); // Enterprise
          ctx.db.insert.mockResolvedValueOnce('new-user-id'); // User
          
          const result = await simulateCreateEnterpriseWithOwner(ctx, {
            enterpriseName: 'New Company Inc',
            domain: 'newcompany.com'
          });
          
          expect(result).toBe(enterpriseId);
          
          // Verify enterprise creation
          expect(ctx.db.insert).toHaveBeenCalledWith('enterprises', expect.objectContaining({
            name: 'New Company Inc',
            domain: 'newcompany.com',
            isParentOrganization: true,
            allowChildOrganizations: true,
            createdAt: expect.any(String)
          }));
          
          // Verify owner creation
          expect(ctx.db.insert).toHaveBeenCalledWith('users', expect.objectContaining({
            clerkId: identity.subject,
            email: identity.email,
            firstName: identity.given_name,
            lastName: identity.family_name,
            enterpriseId,
            role: 'owner',
            isActive: true
          }));
        });
      });

      it('should handle fallback auth data', async () => {
        await withMockContext(async (ctx) => {
          ctx.auth.getUserIdentity.mockResolvedValue(null); // No auth identity
          ctx.db.query().withIndex().first.mockResolvedValue(null);
          
          const enterpriseId = 'new-enterprise-id' as any;
          ctx.db.insert.mockResolvedValueOnce(enterpriseId);
          ctx.db.insert.mockResolvedValueOnce('new-user-id');
          
          const result = await simulateCreateEnterpriseWithOwner(ctx, {
            enterpriseName: 'Fallback Company',
            userEmail: 'fallback@company.com',
            clerkUserId: 'fallback-clerk-id'
          });
          
          expect(result).toBe(enterpriseId);
          expect(ctx.db.insert).toHaveBeenCalledWith('users', expect.objectContaining({
            clerkId: 'fallback-clerk-id',
            email: 'fallback@company.com',
            role: 'owner'
          }));
        });
      });

      it('should prevent duplicate enterprise creation', async () => {
        await withMockContext(async (ctx) => {
          const existingUser = createMockUser();
          const identity = {
            subject: existingUser.clerkId,
            email: existingUser.email
          };
          
          ctx.auth.getUserIdentity.mockResolvedValue(identity);
          ctx.db.query().withIndex().first.mockResolvedValue(existingUser);
          
          await expect(simulateCreateEnterpriseWithOwner(ctx, {
            enterpriseName: 'Another Company'
          })).rejects.toThrow('You already belong to an enterprise');
        });
      });

      it('should validate enterprise name', async () => {
        await withMockContext(async (ctx) => {
          const identity = {
            subject: 'new-clerk-id',
            email: 'owner@company.com'
          };
          
          ctx.auth.getUserIdentity.mockResolvedValue(identity);
          ctx.db.query().withIndex().first.mockResolvedValue(null);
          
          // Test empty name
          await expect(simulateCreateEnterpriseWithOwner(ctx, {
            enterpriseName: ''
          })).rejects.toThrow('Enterprise name must be at least 2 characters long');
          
          // Test short name
          await expect(simulateCreateEnterpriseWithOwner(ctx, {
            enterpriseName: 'A'
          })).rejects.toThrow('Enterprise name must be at least 2 characters long');
        });
      });

      it('should trim enterprise name', async () => {
        await withMockContext(async (ctx) => {
          const identity = {
            subject: 'new-clerk-id',
            email: 'owner@company.com'
          };
          
          ctx.auth.getUserIdentity.mockResolvedValue(identity);
          ctx.db.query().withIndex().first.mockResolvedValue(null);
          
          const enterpriseId = 'new-enterprise-id' as any;
          ctx.db.insert.mockResolvedValueOnce(enterpriseId);
          ctx.db.insert.mockResolvedValueOnce('new-user-id');
          
          await simulateCreateEnterpriseWithOwner(ctx, {
            enterpriseName: '  Trimmed Company Name  '
          });
          
          expect(ctx.db.insert).toHaveBeenCalledWith('enterprises', expect.objectContaining({
            name: 'Trimmed Company Name'
          }));
        });
      });

      it('should require auth or fallback data', async () => {
        await withMockContext(async (ctx) => {
          ctx.auth.getUserIdentity.mockResolvedValue(null);
          
          await expect(simulateCreateEnterpriseWithOwner(ctx, {
            enterpriseName: 'Test Company'
            // No fallback data provided
          })).rejects.toThrow('Authentication failed. Please try again.');
        });
      });
    });

    describe('updateEnterprise', () => {
      it('should allow owner to update enterprise', async () => {
        await withMockContext(async (ctx) => {
          const mockOwner = createMockUser({ role: 'owner' });
          const mockEnterprise = createMockEnterprise({ _id: mockOwner.enterpriseId });
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockOwner.clerkId,
            email: mockOwner.email
          });
          
          ctx.db.query().withIndex().first.mockResolvedValue(mockOwner);
          
          const updates = {
            name: 'Updated Company Name',
            domain: 'updated-domain.com'
          };
          
          const result = await simulateUpdateEnterprise(
            ctx, 
            mockEnterprise._id, 
            updates
          );
          
          expect(result).toEqual({ success: true });
          expect(ctx.db.patch).toHaveBeenCalledWith(mockEnterprise._id, updates);
        });
      });

      it('should allow admin to update enterprise', async () => {
        await withMockContext(async (ctx) => {
          const mockAdmin = createMockUser({ role: 'admin' });
          const mockEnterprise = createMockEnterprise({ _id: mockAdmin.enterpriseId });
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockAdmin.clerkId,
            email: mockAdmin.email
          });
          
          ctx.db.query().withIndex().first.mockResolvedValue(mockAdmin);
          
          const result = await simulateUpdateEnterprise(
            ctx, 
            mockEnterprise._id, 
            { name: 'Admin Updated Name' }
          );
          
          expect(result).toEqual({ success: true });
        });
      });

      it('should deny non-admin/owner updates', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser({ role: 'manager' });
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          
          ctx.db.query().withIndex().first.mockResolvedValue(mockUser);
          
          await expect(simulateUpdateEnterprise(
            ctx, 
            mockUser.enterpriseId, 
            { name: 'Unauthorized Update' }
          )).rejects.toThrow('Only owners and admins can update enterprise settings');
        });
      });

      it('should prevent cross-enterprise updates', async () => {
        await withMockContext(async (ctx) => {
          const mockOwner = createMockUser({ role: 'owner' });
          const otherEnterpriseId = 'other-enterprise' as any;
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockOwner.clerkId,
            email: mockOwner.email
          });
          
          ctx.db.query().withIndex().first.mockResolvedValue(mockOwner);
          
          await expect(simulateUpdateEnterprise(
            ctx, 
            otherEnterpriseId, 
            { name: 'Hacked Name' }
          )).rejects.toThrow('Access denied');
        });
      });

      it('should validate enterprise name length', async () => {
        await withMockContext(async (ctx) => {
          const mockOwner = createMockUser({ role: 'owner' });
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockOwner.clerkId,
            email: mockOwner.email
          });
          
          ctx.db.query().withIndex().first.mockResolvedValue(mockOwner);
          
          await expect(simulateUpdateEnterprise(
            ctx, 
            mockOwner.enterpriseId, 
            { name: 'A' }
          )).rejects.toThrow('Enterprise name must be at least 2 characters long');
        });
      });

      it('should handle no updates provided', async () => {
        await withMockContext(async (ctx) => {
          const mockOwner = createMockUser({ role: 'owner' });
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockOwner.clerkId,
            email: mockOwner.email
          });
          
          ctx.db.query().withIndex().first.mockResolvedValue(mockOwner);
          
          const result = await simulateUpdateEnterprise(
            ctx, 
            mockOwner.enterpriseId, 
            {}
          );
          
          expect(result).toEqual({ 
            success: false, 
            message: 'No updates provided' 
          });
          expect(ctx.db.patch).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('Queries', () => {
    describe('canCreateEnterprise', () => {
      it('should return true for new users', async () => {
        await withMockContext(async (ctx) => {
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: 'new-clerk-id',
            email: 'new@example.com'
          });
          
          ctx.db.query().withIndex().first.mockResolvedValue(null);
          
          const result = await simulateCanCreateEnterprise(ctx);
          
          expect(result).toBe(true);
        });
      });

      it('should return false for existing users', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          
          ctx.db.query().withIndex().first.mockResolvedValue(mockUser);
          
          const result = await simulateCanCreateEnterprise(ctx);
          
          expect(result).toBe(false);
        });
      });

      it('should return false when not authenticated', async () => {
        await withMockContext(async (ctx) => {
          ctx.auth.getUserIdentity.mockResolvedValue(null);
          
          const result = await simulateCanCreateEnterprise(ctx);
          
          expect(result).toBe(false);
        });
      });
    });

    describe('getMyEnterprise', () => {
      it('should return enterprise with stats', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          const mockEnterprise = createMockEnterprise({ _id: mockUser.enterpriseId });
          const mockUsers = [
            mockUser,
            createMockUser({ enterpriseId: mockUser.enterpriseId }),
            createMockUser({ enterpriseId: mockUser.enterpriseId })
          ];
          const mockContracts = [
            createMockContract({ enterpriseId: mockUser.enterpriseId }),
            createMockContract({ enterpriseId: mockUser.enterpriseId })
          ];
          const mockVendors = [
            createMockVendor({ enterpriseId: mockUser.enterpriseId })
          ];
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          
          ctx.db.query().withIndex().first.mockResolvedValue(mockUser);
          ctx.db.get.mockResolvedValue(mockEnterprise);
          
          // Mock member count query
          ctx.db.query().withIndex().collect.mockResolvedValueOnce(mockUsers);
          
          // Mock contracts and vendors queries (Promise.all)
          ctx.db.query().withIndex().collect.mockResolvedValueOnce(mockContracts);
          ctx.db.query().withIndex().collect.mockResolvedValueOnce(mockVendors);
          
          const result = await simulateGetMyEnterprise(ctx);
          
          expect(result).toEqual({
            ...mockEnterprise,
            memberCount: 3,
            contractCount: 2,
            vendorCount: 1,
            currentUserRole: mockUser.role
          });
        });
      });

      it('should return null when not authenticated', async () => {
        await withMockContext(async (ctx) => {
          ctx.auth.getUserIdentity.mockResolvedValue(null);
          
          const result = await simulateGetMyEnterprise(ctx);
          
          expect(result).toBeNull();
        });
      });

      it('should return null when user not found', async () => {
        await withMockContext(async (ctx) => {
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: 'unknown-clerk-id',
            email: 'unknown@example.com'
          });
          
          ctx.db.query().withIndex().first.mockResolvedValue(null);
          
          const result = await simulateGetMyEnterprise(ctx);
          
          expect(result).toBeNull();
        });
      });

      it('should handle missing enterprise gracefully', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          
          ctx.db.query().withIndex().first.mockResolvedValue(mockUser);
          ctx.db.get.mockResolvedValue(null); // Enterprise not found
          
          const result = await simulateGetMyEnterprise(ctx);
          
          expect(result).toBeNull();
        });
      });
    });

    describe('getEnterpriseById', () => {
      it('should return enterprise for authorized user', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          const mockEnterprise = createMockEnterprise({ _id: mockUser.enterpriseId });
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          
          ctx.db.query().withIndex().first.mockResolvedValue(mockUser);
          ctx.db.get.mockResolvedValue(mockEnterprise);
          
          const result = await simulateGetEnterpriseById(ctx, mockUser.enterpriseId);
          
          expect(result).toEqual(mockEnterprise);
        });
      });

      it('should deny access to other enterprises', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          const otherEnterpriseId = 'other-enterprise' as any;
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          
          ctx.db.query().withIndex().first.mockResolvedValue(mockUser);
          
          await expect(simulateGetEnterpriseById(ctx, otherEnterpriseId))
            .rejects.toThrow('Access denied');
        });
      });

      it('should require authentication', async () => {
        await withMockContext(async (ctx) => {
          ctx.auth.getUserIdentity.mockResolvedValue(null);
          
          await expect(simulateGetEnterpriseById(ctx, 'any-id' as any))
            .rejects.toThrow('Authentication required');
        });
      });
    });

    describe('getEnterpriseByDomain', () => {
      it('should find enterprise by domain', async () => {
        await withMockContext(async (ctx) => {
          const mockEnterprise = createMockEnterprise({ domain: 'company.com' });
          
          ctx.db.query().withIndex().first.mockResolvedValue(mockEnterprise);
          
          const result = await simulateGetEnterpriseByDomain(ctx, 'company.com');
          
          expect(result).toEqual(mockEnterprise);
        });
      });

      it('should return null for non-existent domain', async () => {
        await withMockContext(async (ctx) => {
          ctx.db.query().withIndex().first.mockResolvedValue(null);
          
          const result = await simulateGetEnterpriseByDomain(ctx, 'unknown.com');
          
          expect(result).toBeNull();
        });
      });

      it('should be publicly accessible', async () => {
        await withMockContext(async (ctx) => {
          // No authentication setup
          const mockEnterprise = createMockEnterprise({ domain: 'public.com' });
          
          ctx.db.query().withIndex().first.mockResolvedValue(mockEnterprise);
          
          const result = await simulateGetEnterpriseByDomain(ctx, 'public.com');
          
          expect(result).toEqual(mockEnterprise);
          expect(ctx.auth.getUserIdentity).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('Enterprise Lifecycle', () => {
    it('should handle complete enterprise setup flow', async () => {
      await withMockContext(async (ctx) => {
        const identity = {
          subject: 'new-clerk-id',
          email: 'founder@startup.com',
          given_name: 'Jane',
          family_name: 'Founder'
        };
        
        // Step 1: Check if can create
        ctx.auth.getUserIdentity.mockResolvedValue(identity);
        ctx.db.query().withIndex().first.mockResolvedValue(null);
        
        const canCreate = await simulateCanCreateEnterprise(ctx);
        expect(canCreate).toBe(true);
        
        // Step 2: Create enterprise
        const enterpriseId = 'startup-enterprise' as any;
        const userId = 'founder-user' as any;
        ctx.db.insert.mockResolvedValueOnce(enterpriseId);
        ctx.db.insert.mockResolvedValueOnce(userId);
        
        const createdId = await simulateCreateEnterpriseWithOwner(ctx, {
          enterpriseName: 'Startup Inc',
          domain: 'startup.com'
        });
        
        expect(createdId).toBe(enterpriseId);
        
        // Step 3: Verify can't create another
        const mockUser = createMockUser({ 
          _id: userId,
          clerkId: identity.subject,
          enterpriseId 
        });
        ctx.db.query().withIndex().first.mockResolvedValue(mockUser);
        
        const canCreateAgain = await simulateCanCreateEnterprise(ctx);
        expect(canCreateAgain).toBe(false);
      });
    });

    it('should maintain data consistency across operations', async () => {
      await withMockContext(async (ctx) => {
        const mockOwner = createMockUser({ role: 'owner' });
        const mockEnterprise = createMockEnterprise({ 
          _id: mockOwner.enterpriseId,
          name: 'Original Name',
          domain: 'original.com'
        });
        
        ctx.auth.getUserIdentity.mockResolvedValue({
          subject: mockOwner.clerkId,
          email: mockOwner.email
        });
        
        ctx.db.query().withIndex().first.mockResolvedValue(mockOwner);
        
        // Update enterprise
        await simulateUpdateEnterprise(ctx, mockEnterprise._id, {
          name: 'Updated Name',
          domain: 'updated.com'
        });
        
        // Verify updates were applied
        expect(ctx.db.patch).toHaveBeenCalledWith(mockEnterprise._id, {
          name: 'Updated Name',
          domain: 'updated.com'
        });
        
        // Simulate checking the updated enterprise
        const updatedEnterprise = {
          ...mockEnterprise,
          name: 'Updated Name',
          domain: 'updated.com'
        };
        ctx.db.get.mockResolvedValue(updatedEnterprise);
        
        const result = await simulateGetEnterpriseById(ctx, mockEnterprise._id);
        expect(result.name).toBe('Updated Name');
        expect(result.domain).toBe('updated.com');
      });
    });
  });
});

// Simulation functions
async function simulateCreateEnterpriseWithOwner(ctx: any, args: any) {
  let identity = await ctx.auth.getUserIdentity();
  
  if (!identity) {
    if (!args.userEmail || !args.clerkUserId) {
      throw new ConvexError("Authentication failed. Please try again.");
    }
    
    identity = {
      subject: args.clerkUserId,
      email: args.userEmail,
      given_name: undefined,
      family_name: undefined,
    };
  }
  
  const userIdentity = identity;
  
  const existingUser = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q: any) => q.eq("clerkId", userIdentity.subject))
    .first();
    
  if (existingUser) {
    throw new ConvexError("You already belong to an enterprise");
  }
  
  if (!args.enterpriseName || args.enterpriseName.trim().length < 2) {
    throw new ConvexError("Enterprise name must be at least 2 characters long");
  }
  
  const enterpriseId = await ctx.db.insert("enterprises", {
    name: args.enterpriseName.trim(),
    ...(args.domain && { domain: args.domain }),
    isParentOrganization: true,
    allowChildOrganizations: true,
    createdAt: new Date().toISOString(),
  });
  
  await ctx.db.insert("users", {
    clerkId: String(userIdentity.subject),
    email: typeof userIdentity.email === "string" ? userIdentity.email : args.userEmail || "",
    ...(typeof userIdentity.given_name === "string" && userIdentity.given_name && { firstName: userIdentity.given_name }),
    ...(typeof userIdentity.family_name === "string" && userIdentity.family_name && { lastName: userIdentity.family_name }),
    enterpriseId,
    role: "owner",
    isActive: true,
    lastLoginAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });
  
  return enterpriseId;
}

async function simulateUpdateEnterprise(ctx: any, enterpriseId: any, updates: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Authentication required");
  
  const currentUser = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q: any) => q.eq("clerkId", identity.subject))
    .first();
    
  if (!currentUser || currentUser.enterpriseId !== enterpriseId) {
    throw new ConvexError("Access denied");
  }
  
  if (currentUser.role !== "owner" && currentUser.role !== "admin") {
    throw new ConvexError("Only owners and admins can update enterprise settings");
  }
  
  const updateData: any = {};
  
  if (updates.name !== undefined) {
    if (updates.name.trim().length < 2) {
      throw new ConvexError("Enterprise name must be at least 2 characters long");
    }
    updateData.name = updates.name.trim();
  }
  
  if (updates.domain !== undefined) {
    updateData.domain = updates.domain;
  }
  
  if (Object.keys(updateData).length === 0) {
    return { success: false, message: "No updates provided" };
  }
  
  await ctx.db.patch(enterpriseId, updateData);
  return { success: true };
}

async function simulateCanCreateEnterprise(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return false;
  
  const existingUser = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q: any) => q.eq("clerkId", identity.subject))
    .first();
    
  return !existingUser;
}

async function simulateGetMyEnterprise(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q: any) => q.eq("clerkId", identity.subject))
    .first();
    
  if (!user) return null;
  
  const enterprise = await ctx.db.get(user.enterpriseId);
  if (!enterprise) return null;
  
  const members = await ctx.db
    .query("users")
    .withIndex("by_enterprise", (q: any) => q.eq("enterpriseId", user.enterpriseId))
    .collect();
    
  const [contracts, vendors] = await Promise.all([
    ctx.db
      .query("contracts")
      .withIndex("by_status_and_enterpriseId", (q: any) => 
        q.eq("enterpriseId", user.enterpriseId)
      )
      .collect(),
    ctx.db
      .query("vendors")
      .withIndex("by_enterprise", (q: any) => 
        q.eq("enterpriseId", user.enterpriseId)
      )
      .collect(),
  ]);
  
  return {
    ...enterprise,
    memberCount: members.length,
    contractCount: contracts.length,
    vendorCount: vendors.length,
    currentUserRole: user.role,
  };
}

async function simulateGetEnterpriseById(ctx: any, enterpriseId: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Authentication required");
  
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q: any) => q.eq("clerkId", identity.subject))
    .first();
    
  if (!user || user.enterpriseId !== enterpriseId) {
    throw new ConvexError("Access denied");
  }
  
  return await ctx.db.get(enterpriseId);
}

async function simulateGetEnterpriseByDomain(ctx: any, domain: string) {
  return await ctx.db
    .query("enterprises")
    .withIndex("by_domain", (q: any) => q.eq("domain", domain))
    .first();
}