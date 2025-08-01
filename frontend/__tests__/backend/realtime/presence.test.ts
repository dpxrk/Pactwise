import { ConvexError } from 'convex/values';
import { 
  createMockConvexContext, 
  createMockUser,
  createMockContract,
  withMockContext
} from '../utils/convex-test-helpers';

describe('Real-time Presence System', () => {
  describe('User Presence Management', () => {
    describe('updatePresence', () => {
      it('should update user presence status', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          const presenceData = {
            status: 'online' as const,
            currentDocument: 'contract123' as any,
            cursorPosition: { line: 10, column: 15 },
            lastActivity: Date.now()
          };
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          
          ctx.db.query().withIndex().first.mockResolvedValue(mockUser);
          
          // Mock existing presence
          ctx.db.query().filter().first.mockResolvedValue({
            _id: 'presence123' as any,
            userId: mockUser._id
          });
          
          const result = await simulateUpdatePresence(ctx, presenceData);
          
          expect(result.success).toBe(true);
          expect(ctx.db.patch).toHaveBeenCalledWith('presence123', expect.objectContaining({
            status: 'online',
            currentDocument: presenceData.currentDocument,
            cursorPosition: presenceData.cursorPosition,
            lastActivity: expect.any(Number)
          }));
        });
      });

      it('should create presence if not exists', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          
          // Set up proper mock chain for user query
          const mockFirst = jest.fn().mockResolvedValue(mockUser);
          const mockWithIndex = jest.fn().mockReturnValue({ first: mockFirst });
          const mockQuery = jest.fn().mockReturnValue({ withIndex: mockWithIndex });
          
          // Set up filter query for presence
          const mockPresenceFirst = jest.fn().mockResolvedValue(null); // No existing presence
          const mockFilter = jest.fn().mockReturnValue({ first: mockPresenceFirst });
          const mockPresenceQuery = jest.fn().mockReturnValue({ filter: mockFilter });
          
          ctx.db.query.mockImplementation((table: string) => {
            if (table === 'users') return mockQuery();
            if (table === 'presence') return mockPresenceQuery();
            return mockQuery();
          });
          
          ctx.db.insert.mockResolvedValue('new-presence-id');
          
          const result = await simulateUpdatePresence(ctx, {
            status: 'online' as const
          });
          
          expect(result.success).toBe(true);
          expect(ctx.db.insert).toHaveBeenCalledWith('presence', expect.objectContaining({
            userId: mockUser._id,
            enterpriseId: mockUser.enterpriseId,
            status: 'online'
          }));
        });
      });

      it('should handle status transitions', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          const transitions = [
            { from: 'online', to: 'away', valid: true },
            { from: 'away', to: 'busy', valid: true },
            { from: 'offline', to: 'online', valid: true },
            { from: 'busy', to: 'offline', valid: true }
          ];
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          
          ctx.db.query().withIndex().first.mockResolvedValue(mockUser);
          
          for (const transition of transitions) {
            ctx.db.query().filter().first.mockResolvedValue({
              _id: 'presence123' as any,
              status: transition.from
            });
            
            const result = await simulateUpdatePresence(ctx, {
              status: transition.to as any
            });
            
            expect(result.success).toBe(transition.valid);
          }
        });
      });
    });

    describe('getActiveUsers', () => {
      it('should return active users in enterprise', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          const activeUsers = [
            {
              _id: 'presence1' as any,
              userId: 'user1' as any,
              enterpriseId: mockUser.enterpriseId,
              status: 'online',
              currentDocument: 'contract123',
              lastActivity: Date.now()
            },
            {
              _id: 'presence2' as any,
              userId: 'user2' as any,
              enterpriseId: mockUser.enterpriseId,
              status: 'away',
              lastActivity: Date.now() - 5 * 60 * 1000 // 5 minutes ago
            }
          ];
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          
          // Set up proper mock chain
          const mockFirst = jest.fn().mockResolvedValue(mockUser);
          const mockWithIndex = jest.fn().mockReturnValue({ first: mockFirst });
          const mockCollect = jest.fn().mockResolvedValue(activeUsers);
          const mockFilter2 = jest.fn().mockReturnValue({ collect: mockCollect });
          const mockFilter1 = jest.fn().mockReturnValue({ filter: mockFilter2 });
          
          ctx.db.query.mockImplementation((table: string) => {
            if (table === 'users') return { withIndex: mockWithIndex };
            if (table === 'presence') return { filter: mockFilter1 };
            return { withIndex: mockWithIndex };
          });
          
          // Mock user lookups
          ctx.db.get.mockImplementation((id) => {
            const user1 = createMockUser({ _id: 'user1' as any, email: 'user1@example.com', name: 'User One' });
            const user2 = createMockUser({ _id: 'user2' as any, email: 'user2@example.com', name: 'User Two' });
            if (id === 'user1') return user1;
            if (id === 'user2') return user2;
            return null;
          });
          
          const result = await simulateGetActiveUsers(ctx);
          
          expect(result).toHaveLength(2);
          expect(result[0]).toMatchObject({
            userId: 'user1',
            status: 'online',
            user: expect.objectContaining({
              email: expect.any(String),
              name: expect.any(String)
            })
          });
        });
      });

      it('should filter by document', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          const documentId = 'contract123' as any;
          const usersInDocument = [
            {
              _id: 'presence1' as any,
              userId: 'user1' as any,
              enterpriseId: mockUser.enterpriseId,
              currentDocument: documentId,
              status: 'online',
              lastActivity: Date.now()
            }
          ];
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          
          // Set up proper mock chain
          const mockFirst = jest.fn().mockResolvedValue(mockUser);
          const mockWithIndex = jest.fn().mockReturnValue({ first: mockFirst });
          const mockCollect = jest.fn().mockResolvedValue(usersInDocument);
          const mockFilter3 = jest.fn().mockReturnValue({ collect: mockCollect });
          const mockFilter2 = jest.fn().mockReturnValue({ filter: mockFilter3 });
          const mockFilter1 = jest.fn().mockReturnValue({ filter: mockFilter2 });
          
          ctx.db.query.mockImplementation((table: string) => {
            if (table === 'users') return { withIndex: mockWithIndex };
            if (table === 'presence') return { filter: mockFilter1 };
            return { withIndex: mockWithIndex };
          });
          
          // Mock user lookup
          ctx.db.get.mockResolvedValue({
            _id: 'user1',
            email: 'user1@example.com',
            name: 'User One'
          });
          
          const result = await simulateGetActiveUsers(ctx, { documentId });
          
          expect(mockFilter2).toHaveBeenCalled();
          expect(result).toHaveLength(1);
        });
      });

      it('should exclude inactive users', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          const inactiveThreshold = 15 * 60 * 1000; // 15 minutes
          
          const presenceRecords = [
            {
              _id: 'presence1' as any,
              userId: 'user1' as any,
              enterpriseId: mockUser.enterpriseId,
              status: 'online',
              lastActivity: Date.now() - 5 * 60 * 1000 // Active
            },
            {
              _id: 'presence2' as any,
              userId: 'user2' as any,
              enterpriseId: mockUser.enterpriseId,
              status: 'online',
              lastActivity: Date.now() - 20 * 60 * 1000 // Inactive
            }
          ];
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          
          // Set up proper mock chain
          const mockFirst = jest.fn().mockResolvedValue(mockUser);
          const mockWithIndex = jest.fn().mockReturnValue({ first: mockFirst });
          const mockCollect = jest.fn().mockResolvedValue(presenceRecords);
          const mockFilter2 = jest.fn().mockReturnValue({ collect: mockCollect });
          const mockFilter1 = jest.fn().mockReturnValue({ filter: mockFilter2 });
          
          ctx.db.query.mockImplementation((table: string) => {
            if (table === 'users') return { withIndex: mockWithIndex };
            if (table === 'presence') return { filter: mockFilter1 };
            return { withIndex: mockWithIndex };
          });
          
          // Mock user lookups - only return data for active user
          ctx.db.get.mockImplementation((userId) => {
            if (userId === 'user1') {
              return Promise.resolve({
                _id: 'user1',
                email: 'user1@example.com',
                firstName: 'User',
                lastName: 'One'
              });
            }
            return Promise.resolve(null);
          });
          
          const result = await simulateGetActiveUsers(ctx, { includeInactive: false });
          
          // Should filter out inactive users
          expect(result).toHaveLength(1);
          expect(result[0].userId).toBe('user1');
        });
      });
    });

    describe('trackActivity', () => {
      it('should track user activity events', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          const activityEvent = {
            type: 'document_view' as const,
            documentId: 'contract123' as any,
            metadata: {
              viewDuration: 0,
              scrollPosition: 0
            }
          };
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          
          ctx.db.query().withIndex().first.mockResolvedValue(mockUser);
          ctx.db.insert.mockResolvedValue('activity123');
          
          const result = await simulateTrackActivity(ctx, activityEvent);
          
          expect(result.success).toBe(true);
          expect(ctx.db.insert).toHaveBeenCalledWith('activities', expect.objectContaining({
            userId: mockUser._id,
            enterpriseId: mockUser.enterpriseId,
            type: 'document_view',
            documentId: activityEvent.documentId,
            metadata: activityEvent.metadata,
            timestamp: expect.any(Number)
          }));
        });
      });

      it('should validate activity types', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          
          ctx.db.query().withIndex().first.mockResolvedValue(mockUser);
          
          await expect(simulateTrackActivity(ctx, {
            type: 'invalid_type' as any,
            documentId: 'doc123' as any
          })).rejects.toThrow('Invalid activity type');
        });
      });
    });
  });

  describe('Collaborative Editing', () => {
    describe('joinEditingSession', () => {
      it('should join document editing session', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          const mockContract = createMockContract({
            enterpriseId: mockUser.enterpriseId // Ensure same enterprise
          });
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          
          // Set up proper mock chain for user query
          const mockFirst = jest.fn().mockResolvedValue(mockUser);
          const mockWithIndex = jest.fn().mockReturnValue({ first: mockFirst });
          const mockUserQuery = jest.fn().mockReturnValue({ withIndex: mockWithIndex });
          
          // Set up filter query for session
          const mockSessionFirst = jest.fn().mockResolvedValue({
            _id: 'session123' as any,
            documentId: mockContract._id,
            participants: ['user456' as any]
          });
          const mockFilter = jest.fn().mockReturnValue({ first: mockSessionFirst });
          const mockSessionQuery = jest.fn().mockReturnValue({ filter: mockFilter });
          
          ctx.db.query.mockImplementation((table: string) => {
            if (table === 'users') return mockUserQuery();
            if (table === 'editingSessions') return mockSessionQuery();
            return mockUserQuery();
          });
          
          ctx.db.get.mockResolvedValue(mockContract);
          
          const result = await simulateJoinEditingSession(ctx, mockContract._id);
          
          expect(result).toMatchObject({
            sessionId: 'session123',
            participants: expect.arrayContaining(['user456', mockUser._id])
          });
          
          expect(ctx.db.patch).toHaveBeenCalledWith('session123', expect.objectContaining({
            participants: expect.arrayContaining([mockUser._id])
          }));
        });
      });

      it('should create new session if none exists', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          const mockContract = createMockContract({
            enterpriseId: mockUser.enterpriseId // Ensure same enterprise
          });
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          
          // Set up proper mock chain for user query
          const mockFirst = jest.fn().mockResolvedValue(mockUser);
          const mockWithIndex = jest.fn().mockReturnValue({ first: mockFirst });
          const mockUserQuery = jest.fn().mockReturnValue({ withIndex: mockWithIndex });
          
          // Set up filter query for session
          const mockSessionFirst = jest.fn().mockResolvedValue(null); // No existing session
          const mockFilter = jest.fn().mockReturnValue({ first: mockSessionFirst });
          const mockSessionQuery = jest.fn().mockReturnValue({ filter: mockFilter });
          
          ctx.db.query.mockImplementation((table: string) => {
            if (table === 'users') return mockUserQuery();
            if (table === 'editingSessions') return mockSessionQuery();
            return mockUserQuery();
          });
          
          ctx.db.get.mockResolvedValue(mockContract);
          ctx.db.insert.mockResolvedValue('new-session-id');
          
          const result = await simulateJoinEditingSession(ctx, mockContract._id);
          
          expect(result.sessionId).toBe('new-session-id');
          expect(ctx.db.insert).toHaveBeenCalledWith('editingSessions', expect.objectContaining({
            documentId: mockContract._id,
            documentType: 'contract',
            participants: [mockUser._id],
            createdAt: expect.any(Number)
          }));
        });
      });

      it('should check document access permissions', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          const otherEnterpriseContract = createMockContract({
            enterpriseId: 'other-enterprise' as any
          });
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          
          ctx.db.query().withIndex().first.mockResolvedValue(mockUser);
          ctx.db.get.mockResolvedValue(otherEnterpriseContract);
          
          await expect(simulateJoinEditingSession(ctx, otherEnterpriseContract._id))
            .rejects.toThrow('Access denied');
        });
      });
    });

    describe('broadcastEdit', () => {
      it('should broadcast document edits to session participants', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          const sessionId = 'session123' as any;
          const editOperation = {
            type: 'insert' as const,
            position: 100,
            content: 'New clause text',
            timestamp: Date.now()
          };
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          
          ctx.db.query().withIndex().first.mockResolvedValue(mockUser);
          
          // Mock session with user as participant
          ctx.db.get.mockResolvedValue({
            _id: sessionId,
            participants: [mockUser._id, 'user456' as any],
            documentId: 'contract123' as any
          });
          
          ctx.db.insert.mockResolvedValue('edit123');
          
          const result = await simulateBroadcastEdit(ctx, sessionId, editOperation);
          
          expect(result.success).toBe(true);
          expect(ctx.db.insert).toHaveBeenCalledWith('edits', expect.objectContaining({
            sessionId,
            userId: mockUser._id,
            operation: editOperation,
            timestamp: expect.any(Number)
          }));
        });
      });

      it('should validate edit operations', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          const sessionId = 'session123' as any;
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          
          ctx.db.query().withIndex().first.mockResolvedValue(mockUser);
          ctx.db.get.mockResolvedValue({
            _id: sessionId,
            participants: [mockUser._id]
          });
          
          // Invalid operation type
          await expect(simulateBroadcastEdit(ctx, sessionId, {
            type: 'invalid' as any,
            position: 0
          })).rejects.toThrow('Invalid edit operation');
          
          // Missing required fields
          await expect(simulateBroadcastEdit(ctx, sessionId, {
            type: 'insert' as const
            // Missing position and content
          })).rejects.toThrow('Invalid edit operation');
        });
      });

      it('should enforce participant restrictions', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          const sessionId = 'session123' as any;
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          
          ctx.db.query().withIndex().first.mockResolvedValue(mockUser);
          
          // Session without user as participant
          ctx.db.get.mockResolvedValue({
            _id: sessionId,
            participants: ['other-user' as any]
          });
          
          await expect(simulateBroadcastEdit(ctx, sessionId, {
            type: 'insert' as const,
            position: 0,
            content: 'text'
          })).rejects.toThrow('Not a participant in this session');
        });
      });
    });

    describe('conflictResolution', () => {
      it('should handle concurrent edit conflicts', async () => {
        await withMockContext(async (ctx) => {
          const sessionId = 'session123' as any;
          const baseVersion = 10;
          
          const conflictingEdits = [
            {
              _id: 'edit1' as any,
              userId: 'user1' as any,
              operation: { type: 'insert', position: 100, content: 'Text A' },
              version: baseVersion + 1,
              timestamp: Date.now() - 1000
            },
            {
              _id: 'edit2' as any,
              userId: 'user2' as any,
              operation: { type: 'insert', position: 100, content: 'Text B' },
              version: baseVersion + 1,
              timestamp: Date.now()
            }
          ];
          
          ctx.db.query().filter().filter().collect.mockResolvedValue(conflictingEdits);
          
          const result = await simulateResolveConflicts(ctx, sessionId, baseVersion);
          
          expect(result.resolved).toBe(true);
          expect(result.mergedOperations).toHaveLength(2);
          expect(result.mergedOperations[0].operation.position).toBe(100);
          expect(result.mergedOperations[1].operation.position).toBe(106); // Adjusted for first insert
        });
      });

      it('should apply operational transformation', async () => {
        await withMockContext(async (ctx) => {
          const ops = [
            { type: 'insert' as const, position: 10, content: 'Hello' },
            { type: 'delete' as const, position: 5, length: 3 },
            { type: 'insert' as const, position: 15, content: 'World' }
          ];
          
          const transformed = await simulateTransformOperations(ops);
          
          // After first insert at 10, positions after should shift
          // After delete at 5, positions should adjust
          expect(transformed[0]).toEqual(ops[0]); // First op unchanged
          expect(transformed[1]).toEqual({ type: 'delete', position: 5, length: 3 });
          expect(transformed[2].position).toBe(17); // 15 + 5 (insert) - 3 (delete)
        });
      });
    });
  });

  describe('Real-time Notifications', () => {
    describe('sendNotification', () => {
      it('should send real-time notification to user', async () => {
        await withMockContext(async (ctx) => {
          const targetUserId = 'user123' as any;
          const notification = {
            type: 'contract_update' as const,
            title: 'Contract Updated',
            message: 'Contract ABC has been updated',
            data: {
              contractId: 'contract123',
              updatedBy: 'user456'
            },
            priority: 'high' as const
          };
          
          ctx.db.insert.mockResolvedValue('notification123');
          
          const result = await simulateSendNotification(ctx, targetUserId, notification);
          
          expect(result.success).toBe(true);
          expect(ctx.db.insert).toHaveBeenCalledWith('notifications', expect.objectContaining({
            userId: targetUserId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data,
            priority: notification.priority,
            status: 'unread',
            createdAt: expect.any(Number)
          }));
        });
      });

      it('should batch notifications when appropriate', async () => {
        await withMockContext(async (ctx) => {
          const targetUserId = 'user123' as any;
          
          // Check for recent similar notifications
          ctx.db.query().filter().filter().filter().first.mockResolvedValue({
            _id: 'existing-notification' as any,
            type: 'contract_update',
            data: { contractIds: ['contract456'] },
            count: 1
          });
          
          const notification = {
            type: 'contract_update' as const,
            title: 'Contract Updated',
            message: 'Another contract updated',
            data: { contractId: 'contract789' }
          };
          
          const result = await simulateSendNotificationWithBatching(
            ctx, 
            targetUserId, 
            notification
          );
          
          expect(result.batched).toBe(true);
          expect(ctx.db.patch).toHaveBeenCalledWith('existing-notification', expect.objectContaining({
            count: 2,
            data: { contractIds: ['contract456', 'contract789'] },
            message: '2 contracts have been updated'
          }));
        });
      });
    });

    describe('subscribeToUpdates', () => {
      it('should manage real-time subscriptions', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          const subscription = {
            entityType: 'contract' as const,
            entityId: 'contract123' as any,
            events: ['update', 'comment', 'status_change'] as const[]
          };
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          
          ctx.db.query().withIndex().first.mockResolvedValue(mockUser);
          
          // Mock query for existing subscription check
          const mockSubFirst = jest.fn().mockResolvedValue(null);
          const mockSubFilter3 = jest.fn().mockReturnValue({ first: mockSubFirst });
          const mockSubFilter2 = jest.fn().mockReturnValue({ filter: mockSubFilter3 });
          const mockSubFilter1 = jest.fn().mockReturnValue({ filter: mockSubFilter2 });
          const mockSubQuery = jest.fn().mockReturnValue({ filter: mockSubFilter1 });
          
          ctx.db.query.mockImplementation((table: string) => {
            if (table === 'subscriptions') return mockSubQuery();
            return { withIndex: () => ({ first: () => mockUser }) };
          });
          
          ctx.db.insert.mockResolvedValue('subscription123');
          
          const result = await simulateSubscribeToUpdates(ctx, subscription);
          
          expect(result.subscriptionId).toBe('subscription123');
          expect(ctx.db.insert).toHaveBeenCalledWith('subscriptions', expect.objectContaining({
            userId: mockUser._id,
            entityType: subscription.entityType,
            entityId: subscription.entityId,
            events: subscription.events,
            active: true
          }));
        });
      });

      it('should prevent duplicate subscriptions', async () => {
        await withMockContext(async (ctx) => {
          const mockUser = createMockUser();
          
          ctx.auth.getUserIdentity.mockResolvedValue({
            subject: mockUser.clerkId,
            email: mockUser.email
          });
          
          ctx.db.query().withIndex().first.mockResolvedValue(mockUser);
          
          // Existing subscription
          ctx.db.query().filter().filter().filter().first.mockResolvedValue({
            _id: 'existing-sub' as any,
            events: ['update']
          });
          
          const result = await simulateSubscribeToUpdates(ctx, {
            entityType: 'contract' as const,
            entityId: 'contract123' as any,
            events: ['comment'] as const[]
          });
          
          // Should update existing subscription
          expect(ctx.db.patch).toHaveBeenCalledWith('existing-sub', expect.objectContaining({
            events: expect.arrayContaining(['update', 'comment'])
          }));
        });
      });
    });
  });

  describe('Performance Monitoring', () => {
    it('should track real-time performance metrics', async () => {
      await withMockContext(async (ctx) => {
        const metrics = {
          activeConnections: 45,
          messageRate: 120, // messages per minute
          latency: {
            p50: 15,
            p95: 45,
            p99: 120
          },
          errors: 2
        };
        
        ctx.db.insert.mockResolvedValue('metrics123');
        
        const result = await simulateRecordPerformanceMetrics(ctx, metrics);
        
        expect(result.success).toBe(true);
        expect(ctx.db.insert).toHaveBeenCalledWith('realtimeMetrics', expect.objectContaining({
          ...metrics,
          timestamp: expect.any(Number)
        }));
      });
    });

    it('should detect performance degradation', async () => {
      await withMockContext(async (ctx) => {
        const recentMetrics = [
          { latency: { p95: 30 }, timestamp: Date.now() - 5 * 60 * 1000 },
          { latency: { p95: 35 }, timestamp: Date.now() - 4 * 60 * 1000 },
          { latency: { p95: 150 }, timestamp: Date.now() - 3 * 60 * 1000 }, // Spike
          { latency: { p95: 200 }, timestamp: Date.now() - 2 * 60 * 1000 }, // Continued high
          { latency: { p95: 180 }, timestamp: Date.now() - 1 * 60 * 1000 }
        ];
        
        ctx.db.query().order().take.mockResolvedValue(recentMetrics);
        
        const analysis = await simulateAnalyzePerformance(ctx);
        
        expect(analysis.degraded).toBe(true);
        expect(analysis.alerts).toContainEqual(
          expect.objectContaining({
            type: 'latency_spike',
            severity: 'high'
          })
        );
      });
    });
  });
});

// Simulation functions
async function simulateUpdatePresence(ctx: any, data: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');
  
  const user = await ctx.db.query('users')
    .withIndex('by_clerkId', (q: any) => q.eq('clerkId', identity.subject))
    .first();
    
  if (!user) throw new Error('User not found');
  
  const existingPresence = await ctx.db.query('presence')
    .filter((q: any) => q.eq(q.field('userId'), user._id))
    .first();
    
  const presenceData = {
    status: data.status,
    currentDocument: data.currentDocument,
    cursorPosition: data.cursorPosition,
    lastActivity: data.lastActivity || Date.now()
  };
  
  if (existingPresence) {
    await ctx.db.patch(existingPresence._id, presenceData);
  } else {
    await ctx.db.insert('presence', {
      userId: user._id,
      enterpriseId: user.enterpriseId,
      ...presenceData
    });
  }
  
  return { success: true };
}

async function simulateGetActiveUsers(ctx: any, options?: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');
  
  const user = await ctx.db.query('users')
    .withIndex('by_clerkId', (q: any) => q.eq('clerkId', identity.subject))
    .first();
    
  if (!user) throw new Error('User not found');
  
  let query = ctx.db.query('presence')
    .filter((q: any) => q.eq(q.field('enterpriseId'), user.enterpriseId))
    .filter((q: any) => q.neq(q.field('status'), 'offline'));
    
  if (options?.documentId) {
    query = query.filter((q: any) => q.eq(q.field('currentDocument'), options.documentId));
  }
  
  const presenceRecords = await query.collect();
  const activeThreshold = 15 * 60 * 1000; // 15 minutes
  const now = Date.now();
  
  const activeUsers = [];
  for (const presence of presenceRecords) {
    if (options?.includeInactive === false && 
        now - presence.lastActivity > activeThreshold) {
      continue;
    }
    
    const userData = await ctx.db.get(presence.userId);
    if (userData) {
      activeUsers.push({
        ...presence,
        user: {
          email: userData.email,
          name: userData.name || (userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}` : 'Unknown User')
        }
      });
    }
  }
  
  return activeUsers;
}

async function simulateTrackActivity(ctx: any, event: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');
  
  const user = await ctx.db.query('users')
    .withIndex('by_clerkId', (q: any) => q.eq('clerkId', identity.subject))
    .first();
    
  if (!user) throw new Error('User not found');
  
  const validTypes = [
    'document_view',
    'document_edit',
    'document_download',
    'comment_add',
    'status_change'
  ];
  
  if (!validTypes.includes(event.type)) {
    throw new Error('Invalid activity type');
  }
  
  await ctx.db.insert('activities', {
    userId: user._id,
    enterpriseId: user.enterpriseId,
    type: event.type,
    documentId: event.documentId,
    metadata: event.metadata || {},
    timestamp: Date.now()
  });
  
  return { success: true };
}

async function simulateJoinEditingSession(ctx: any, documentId: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');
  
  const user = await ctx.db.query('users')
    .withIndex('by_clerkId', (q: any) => q.eq('clerkId', identity.subject))
    .first();
    
  if (!user) throw new Error('User not found');
  
  // Check document access
  const document = await ctx.db.get(documentId);
  if (!document || document.enterpriseId !== user.enterpriseId) {
    throw new Error('Access denied');
  }
  
  let session = await ctx.db.query('editingSessions')
    .filter((q: any) => q.eq(q.field('documentId'), documentId))
    .first();
    
  if (session) {
    if (!session.participants.includes(user._id)) {
      const updatedParticipants = [...session.participants, user._id];
      await ctx.db.patch(session._id, {
        participants: updatedParticipants
      });
      session.participants = updatedParticipants;
    }
  } else {
    const sessionId = await ctx.db.insert('editingSessions', {
      documentId,
      documentType: 'contract',
      participants: [user._id],
      createdAt: Date.now()
    });
    session = { _id: sessionId, participants: [user._id] };
  }
  
  return {
    sessionId: session._id,
    participants: session.participants
  };
}

async function simulateBroadcastEdit(ctx: any, sessionId: any, operation: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');
  
  const user = await ctx.db.query('users')
    .withIndex('by_clerkId', (q: any) => q.eq('clerkId', identity.subject))
    .first();
    
  if (!user) throw new Error('User not found');
  
  const session = await ctx.db.get(sessionId);
  if (!session) throw new Error('Session not found');
  
  if (!session.participants.includes(user._id)) {
    throw new Error('Not a participant in this session');
  }
  
  // Validate operation
  const validTypes = ['insert', 'delete', 'replace'];
  if (!validTypes.includes(operation.type)) {
    throw new Error('Invalid edit operation');
  }
  
  if (operation.type === 'insert' && 
      (operation.position === undefined || !operation.content)) {
    throw new Error('Invalid edit operation');
  }
  
  await ctx.db.insert('edits', {
    sessionId,
    userId: user._id,
    operation,
    timestamp: Date.now()
  });
  
  return { success: true };
}

async function simulateResolveConflicts(ctx: any, sessionId: any, baseVersion: number) {
  const conflictingEdits = await ctx.db.query('edits')
    .filter((q: any) => q.eq(q.field('sessionId'), sessionId))
    .filter((q: any) => q.gt(q.field('version'), baseVersion))
    .collect();
    
  // Sort by timestamp to establish order
  conflictingEdits.sort((a: any, b: any) => a.timestamp - b.timestamp);
  
  const mergedOperations = [];
  let offset = 0;
  
  for (const edit of conflictingEdits) {
    const adjustedOp = { ...edit };
    
    if (edit.operation.type === 'insert') {
      adjustedOp.operation.position += offset;
      offset += edit.operation.content.length;
    } else if (edit.operation.type === 'delete') {
      offset -= edit.operation.length;
    }
    
    mergedOperations.push(adjustedOp);
  }
  
  return {
    resolved: true,
    mergedOperations
  };
}

async function simulateTransformOperations(operations: any[]) {
  const transformed = [];
  let offset = 0;
  
  for (const op of operations) {
    const newOp = { ...op };
    
    if (op.type === 'insert') {
      newOp.position += offset;
      offset += op.content.length;
    } else if (op.type === 'delete') {
      offset -= op.length;
    } else if (op.position !== undefined) {
      newOp.position += offset;
    }
    
    transformed.push(newOp);
  }
  
  return transformed;
}

async function simulateSendNotification(ctx: any, userId: any, notification: any) {
  await ctx.db.insert('notifications', {
    userId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    data: notification.data || {},
    priority: notification.priority || 'medium',
    status: 'unread',
    createdAt: Date.now()
  });
  
  return { success: true };
}

async function simulateSendNotificationWithBatching(
  ctx: any, 
  userId: any, 
  notification: any
) {
  // Check for recent similar notification
  const recentCutoff = Date.now() - 5 * 60 * 1000; // 5 minutes
  const existing = await ctx.db.query('notifications')
    .filter((q: any) => q.eq(q.field('userId'), userId))
    .filter((q: any) => q.eq(q.field('type'), notification.type))
    .filter((q: any) => q.gt(q.field('createdAt'), recentCutoff))
    .first();
    
  if (existing && existing.count) {
    // Batch with existing
    const contractIds = existing.data.contractIds || [];
    contractIds.push(notification.data.contractId);
    
    await ctx.db.patch(existing._id, {
      count: existing.count + 1,
      data: { contractIds },
      message: `${existing.count + 1} contracts have been updated`
    });
    
    return { success: true, batched: true };
  }
  
  // Create new notification
  await ctx.db.insert('notifications', {
    userId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    data: notification.data,
    status: 'unread',
    createdAt: Date.now()
  });
  
  return { success: true, batched: false };
}

async function simulateSubscribeToUpdates(ctx: any, subscription: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');
  
  const user = await ctx.db.query('users')
    .withIndex('by_clerkId', (q: any) => q.eq('clerkId', identity.subject))
    .first();
    
  if (!user) throw new Error('User not found');
  
  // Check for existing subscription
  const existing = await ctx.db.query('subscriptions')
    .filter((q: any) => q.eq(q.field('userId'), user._id))
    .filter((q: any) => q.eq(q.field('entityType'), subscription.entityType))
    .filter((q: any) => q.eq(q.field('entityId'), subscription.entityId))
    .first();
    
  if (existing) {
    // Merge events - ensure existing.events is an array
    const existingEvents = Array.isArray(existing.events) ? existing.events : [];
    const allEvents = new Set([...existingEvents, ...subscription.events]);
    await ctx.db.patch(existing._id, {
      events: Array.from(allEvents)
    });
    
    return { subscriptionId: existing._id };
  }
  
  const subscriptionId = await ctx.db.insert('subscriptions', {
    userId: user._id,
    entityType: subscription.entityType,
    entityId: subscription.entityId,
    events: subscription.events,
    active: true,
    createdAt: Date.now()
  });
  
  return { subscriptionId };
}

async function simulateRecordPerformanceMetrics(ctx: any, metrics: any) {
  await ctx.db.insert('realtimeMetrics', {
    ...metrics,
    timestamp: Date.now()
  });
  
  return { success: true };
}

async function simulateAnalyzePerformance(ctx: any) {
  const recentMetrics = await ctx.db.query('realtimeMetrics')
    .order('desc')
    .take(10);
    
  const alerts = [];
  let degraded = false;
  
  // Check for latency spikes
  const avgLatency = recentMetrics
    .slice(0, 5)
    .reduce((sum: number, m: any) => sum + m.latency.p95, 0) / 5;
    
  if (avgLatency > 100) {
    degraded = true;
    alerts.push({
      type: 'latency_spike',
      severity: 'high',
      message: `Average P95 latency is ${avgLatency}ms`
    });
  }
  
  return { degraded, alerts };
}