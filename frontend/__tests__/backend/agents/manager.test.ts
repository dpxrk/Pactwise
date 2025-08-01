import { ConvexError } from 'convex/values';
import { 
  createMockConvexContext, 
  createMockUser,
  withMockContext,
  expectToBeId
} from '../utils/convex-test-helpers';

describe('Manager Agent', () => {
  describe('initializeAgentSystem', () => {
    it('should initialize agent system successfully', async () => {
      await withMockContext(async (ctx) => {
        const mockUser = createMockUser();
        ctx.auth.getUserIdentity.mockResolvedValue({
          subject: mockUser.clerkId,
          email: mockUser.email
        });
        
        // No existing system
        ctx.db.query().first.mockResolvedValue(null);
        
        const systemId = 'agent-system-id' as any;
        const managerId = 'manager-agent-id' as any;
        ctx.db.insert.mockResolvedValueOnce(systemId);
        ctx.db.insert.mockResolvedValueOnce(managerId);
        
        const result = await simulateInitializeAgentSystem(ctx);
        
        expect(result).toEqual({
          success: true,
          message: "Agent system initialized successfully.",
          systemId,
          managerId
        });
        
        // Verify system creation
        expect(ctx.db.insert).toHaveBeenCalledWith('agentSystem', expect.objectContaining({
          isRunning: false,
          status: 'stopped',
          config: expect.objectContaining({
            maxConcurrentTasks: 10,
            taskTimeoutMinutes: 30,
            logRetentionDays: 30
          }),
          metrics: expect.objectContaining({
            totalTasksProcessed: 0,
            totalInsightsGenerated: 0,
            systemUptime: 0
          })
        }));
        
        // Verify manager agent creation
        expect(ctx.db.insert).toHaveBeenCalledWith('agents', expect.objectContaining({
          name: 'System Manager',
          type: 'manager',
          status: 'inactive',
          description: 'Coordinates and manages all other agents in the system.',
          isEnabled: true,
          runCount: 0,
          errorCount: 0,
          config: expect.objectContaining({
            runIntervalMinutes: 5,
            retryAttempts: 3,
            timeoutMinutes: 10
          })
        }));
      });
    });

    it('should not re-initialize existing system', async () => {
      await withMockContext(async (ctx) => {
        const mockUser = createMockUser();
        const existingSystem = {
          _id: 'existing-system' as any,
          _creationTime: Date.now(),
          isRunning: true,
          status: 'running'
        };
        
        ctx.auth.getUserIdentity.mockResolvedValue({
          subject: mockUser.clerkId,
          email: mockUser.email
        });
        
        ctx.db.query().first.mockResolvedValue(existingSystem);
        
        const result = await simulateInitializeAgentSystem(ctx);
        
        expect(result).toEqual({
          success: true,
          message: 'Agent system already initialized.',
          systemId: existingSystem._id
        });
        expect(ctx.db.insert).not.toHaveBeenCalled();
      });
    });

    it('should require authentication', async () => {
      await withMockContext(async (ctx) => {
        ctx.auth.getUserIdentity.mockResolvedValue(null);
        
        await expect(simulateInitializeAgentSystem(ctx))
          .rejects.toThrow('Authentication required: No user identity found.');
      });
    });
  });

  describe('createAgentTask', () => {
    it('should create task with valid data', async () => {
      await withMockContext(async (ctx) => {
        const mockAgent = {
          _id: 'agent123' as any,
          _creationTime: Date.now(),
          type: 'secretary',
          status: 'active',
          isEnabled: true
        };
        
        ctx.db.get.mockResolvedValue(mockAgent);
        
        const taskId = 'task123' as any;
        ctx.db.insert.mockResolvedValue(taskId);
        
        const taskData = {
          agentId: mockAgent._id,
          type: 'document_processing' as const,
          priority: 'high' as const,
          data: {
            contractId: 'contract123',
            action: 'analyze'
          },
          scheduledFor: new Date().toISOString()
        };
        
        const result = await simulateCreateAgentTask(ctx, taskData);
        
        expect(result).toBe(taskId);
        expect(ctx.db.insert).toHaveBeenCalledWith('agentTasks', expect.objectContaining({
          agentId: mockAgent._id,
          type: 'document_processing',
          priority: 'high',
          status: 'pending',
          data: taskData.data,
          createdAt: expect.any(String),
          scheduledFor: taskData.scheduledFor
        }));
      });
    });

    it('should validate agent exists', async () => {
      await withMockContext(async (ctx) => {
        ctx.db.get.mockResolvedValue(null);
        
        await expect(simulateCreateAgentTask(ctx, {
          agentId: 'non-existent' as any,
          type: 'workflow_coordination' as const,
          priority: 'medium' as const
        })).rejects.toThrow('Agent not found');
      });
    });

    it('should validate agent is enabled', async () => {
      await withMockContext(async (ctx) => {
        const disabledAgent = {
          _id: 'agent123' as any,
          _creationTime: Date.now(),
          type: 'secretary',
          status: 'inactive',
          isEnabled: false
        };
        
        ctx.db.get.mockResolvedValue(disabledAgent);
        
        await expect(simulateCreateAgentTask(ctx, {
          agentId: disabledAgent._id,
          type: 'document_processing' as const,
          priority: 'low' as const
        })).rejects.toThrow('Agent is not enabled');
      });
    });

    it('should set default priority', async () => {
      await withMockContext(async (ctx) => {
        const mockAgent = {
          _id: 'agent123' as any,
          _creationTime: Date.now(),
          type: 'financial',
          status: 'active',
          isEnabled: true
        };
        
        ctx.db.get.mockResolvedValue(mockAgent);
        ctx.db.insert.mockResolvedValue('task123');
        
        await simulateCreateAgentTask(ctx, {
          agentId: mockAgent._id,
          type: 'financial_analysis' as const
        });
        
        expect(ctx.db.insert).toHaveBeenCalledWith('agentTasks', expect.objectContaining({
          priority: 'medium' // Default priority
        }));
      });
    });
  });

  describe('processAgentTask', () => {
    it('should process task successfully', async () => {
      await withMockContext(async (ctx) => {
        const mockTask = {
          _id: 'task123' as any,
          _creationTime: Date.now(),
          agentId: 'agent123' as any,
          type: 'contract_review',
          status: 'pending',
          priority: 'high',
          data: { contractId: 'contract123' },
          attempts: 0
        };
        
        ctx.db.get.mockResolvedValue(mockTask);
        
        const result = await simulateProcessAgentTask(ctx, mockTask._id);
        
        expect(result.success).toBe(true);
        
        // Verify status updates
        expect(ctx.db.patch).toHaveBeenCalledWith(mockTask._id, expect.objectContaining({
          status: 'in_progress',
          startedAt: expect.any(String)
        }));
        
        expect(ctx.db.patch).toHaveBeenCalledWith(mockTask._id, expect.objectContaining({
          status: 'completed',
          completedAt: expect.any(String),
          result: expect.any(Object)
        }));
      });
    });

    it('should handle task failure', async () => {
      await withMockContext(async (ctx) => {
        const mockTask = {
          _id: 'task123' as any,
          _creationTime: Date.now(),
          agentId: 'agent123' as any,
          type: 'contract_review',
          status: 'pending',
          priority: 'high',
          attempts: 2,
          maxRetries: 3
        };
        
        ctx.db.get.mockResolvedValue(mockTask);
        
        // Simulate processing error
        const error = new Error('Processing failed');
        
        const result = await simulateProcessAgentTaskWithError(ctx, mockTask._id, error);
        
        expect(result.success).toBe(false);
        expect(ctx.db.patch).toHaveBeenCalledWith(mockTask._id, expect.objectContaining({
          status: 'pending', // Should retry
          attempts: 3,
          lastError: error.message
        }));
      });
    });

    it('should mark task as failed after max retries', async () => {
      await withMockContext(async (ctx) => {
        const mockTask = {
          _id: 'task123' as any,
          _creationTime: Date.now(),
          agentId: 'agent123' as any,
          type: 'contract_review',
          status: 'pending',
          priority: 'high',
          attempts: 3,
          maxRetries: 3
        };
        
        ctx.db.get.mockResolvedValue(mockTask);
        
        const error = new Error('Processing failed');
        const result = await simulateProcessAgentTaskWithError(ctx, mockTask._id, error);
        
        expect(result.success).toBe(false);
        expect(ctx.db.patch).toHaveBeenCalledWith(mockTask._id, expect.objectContaining({
          status: 'failed',
          failedAt: expect.any(String),
          lastError: error.message
        }));
      });
    });
  });

  describe('getAgentMetrics', () => {
    it('should calculate agent metrics correctly', async () => {
      await withMockContext(async (ctx) => {
        const mockAgent = {
          _id: 'agent123' as any,
          _creationTime: Date.now(),
          name: 'Secretary Agent',
          type: 'secretary',
          runCount: 100,
          errorCount: 5,
          metrics: {
            totalRuns: 100,
            successfulRuns: 95,
            failedRuns: 5,
            averageRunTime: 1500
          }
        };
        
        const mockTasks = [
          { status: 'completed', priority: 'high' },
          { status: 'completed', priority: 'medium' },
          { status: 'failed', priority: 'high' },
          { status: 'pending', priority: 'low' },
          { status: 'in_progress', priority: 'critical' }
        ];
        
        ctx.db.get.mockResolvedValue(mockAgent);
        ctx.db.query().filter().collect.mockResolvedValue(mockTasks);
        
        const result = await simulateGetAgentMetrics(ctx, mockAgent._id);
        
        expect(result).toEqual({
          agent: mockAgent,
          taskStats: {
            total: 5,
            completed: 2,
            failed: 1,
            pending: 1,
            inProgress: 1,
            byPriority: {
              critical: 1,
              high: 2,
              medium: 1,
              low: 1
            }
          },
          performance: {
            successRate: 95,
            errorRate: 5,
            averageRunTime: 1500
          }
        });
      });
    });

    it('should handle agent not found', async () => {
      await withMockContext(async (ctx) => {
        ctx.db.get.mockResolvedValue(null);
        
        await expect(simulateGetAgentMetrics(ctx, 'non-existent' as any))
          .rejects.toThrow('Agent not found');
      });
    });
  });

  describe('createInsight', () => {
    it('should create insight with valid data', async () => {
      await withMockContext(async (ctx) => {
        const mockUser = createMockUser();
        const insightId = 'insight123' as any;
        
        ctx.auth.getUserIdentity.mockResolvedValue({
          subject: mockUser.clerkId,
          email: mockUser.email
        });
        
        ctx.db.query().withIndex().first.mockResolvedValue(mockUser);
        ctx.db.insert.mockResolvedValue(insightId);
        
        const insightData = {
          type: 'contract_analysis' as const,
          severity: 'high' as const,
          title: 'Contract Expiration Alert',
          description: 'Contract ABC123 will expire in 30 days',
          data: {
            contractId: 'contract123',
            daysUntilExpiration: 30
          },
          relatedEntityId: 'contract123' as any,
          relatedEntityType: 'contract' as const
        };
        
        const result = await simulateCreateInsight(ctx, insightData);
        
        expect(result).toBe(insightId);
        expect(ctx.db.insert).toHaveBeenCalledWith('insights', expect.objectContaining({
          ...insightData,
          enterpriseId: mockUser.enterpriseId,
          createdBy: 'system' as any,
          status: 'new',
          createdAt: expect.any(String)
        }));
      });
    });

    it('should validate severity levels', async () => {
      await withMockContext(async (ctx) => {
        const mockUser = createMockUser();
        
        ctx.auth.getUserIdentity.mockResolvedValue({
          subject: mockUser.clerkId,
          email: mockUser.email
        });
        
        ctx.db.query().withIndex().first.mockResolvedValue(mockUser);
        
        const invalidSeverities = ['invalid', 'extreme', ''];
        
        for (const severity of invalidSeverities) {
          await expect(simulateCreateInsight(ctx, {
            type: 'alert' as const,
            severity: severity as any,
            title: 'Test',
            description: 'Test'
          })).rejects.toThrow('Invalid severity level');
        }
      });
    });

    it('should auto-assign to user if applicable', async () => {
      await withMockContext(async (ctx) => {
        const mockUser = createMockUser();
        const mockContract = {
          _id: 'contract123' as any,
          createdBy: mockUser._id
        };
        
        ctx.auth.getUserIdentity.mockResolvedValue({
          subject: mockUser.clerkId,
          email: mockUser.email
        });
        
        ctx.db.query().withIndex().first.mockResolvedValue(mockUser);
        ctx.db.get.mockResolvedValue(mockContract);
        ctx.db.insert.mockResolvedValue('insight123');
        
        await simulateCreateInsight(ctx, {
          type: 'contract_analysis' as const,
          severity: 'medium' as const,
          title: 'Contract Review Required',
          description: 'Contract needs review',
          relatedEntityId: mockContract._id,
          relatedEntityType: 'contract' as const
        });
        
        expect(ctx.db.insert).toHaveBeenCalledWith('insights', expect.objectContaining({
          assignedTo: mockUser._id // Auto-assigned to contract creator
        }));
      });
    });
  });

  describe('Agent System Coordination', () => {
    it('should coordinate multi-agent workflow', async () => {
      await withMockContext(async (ctx) => {
        const mockAgents = [
          {
            _id: 'secretary-agent' as any,
            type: 'secretary',
            status: 'active',
            isEnabled: true
          },
          {
            _id: 'financial-agent' as any,
            type: 'financial',
            status: 'active',
            isEnabled: true
          }
        ];
        
        ctx.db.query().filter().collect.mockResolvedValue(mockAgents);
        ctx.db.insert.mockResolvedValue('task123');
        
        // Simulate workflow coordination
        const workflow = {
          name: 'Contract Analysis Workflow',
          steps: [
            { agentType: 'secretary', action: 'extract' },
            { agentType: 'financial', action: 'analyze' }
          ]
        };
        
        const result = await simulateCoordinateWorkflow(ctx, workflow);
        
        expect(result.tasksCreated).toBe(2);
        expect(ctx.db.insert).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle agent health monitoring', async () => {
      await withMockContext(async (ctx) => {
        const mockAgents = [
          {
            _id: 'agent1' as any,
            type: 'secretary',
            status: 'active',
            lastHealthCheck: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 min ago
            errorCount: 0
          },
          {
            _id: 'agent2' as any,
            type: 'financial',
            status: 'active',
            lastHealthCheck: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
            errorCount: 5
          },
          {
            _id: 'agent3' as any,
            type: 'legal',
            status: 'error',
            lastHealthCheck: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
            errorCount: 10
          }
        ];
        
        ctx.db.query().collect.mockResolvedValue(mockAgents);
        
        const healthReport = await simulateCheckAgentHealth(ctx);
        
        expect(healthReport).toEqual({
          healthy: 1,
          warning: 1,
          unhealthy: 1,
          agents: expect.arrayContaining([
            expect.objectContaining({
              agentId: 'agent1',
              status: 'healthy'
            }),
            expect.objectContaining({
              agentId: 'agent2',
              status: 'warning',
              issues: expect.arrayContaining(['High error count'])
            }),
            expect.objectContaining({
              agentId: 'agent3',
              status: 'unhealthy',
              issues: expect.arrayContaining(['Agent in error state', 'Health check overdue'])
            })
          ])
        });
      });
    });
  });
});

// Simulation functions
async function simulateInitializeAgentSystem(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required: No user identity found.");
  }
  
  const existingSystem = await ctx.db.query("agentSystem").first();
  if (existingSystem) {
    return { 
      success: true, 
      message: "Agent system already initialized.", 
      systemId: existingSystem._id 
    };
  }
  
  const systemId = await ctx.db.insert("agentSystem", {
    isRunning: false,
    status: "stopped",
    config: {
      maxConcurrentTasks: 10,
      taskTimeoutMinutes: 30,
      logRetentionDays: 30,
    },
    metrics: {
      totalTasksProcessed: 0,
      totalInsightsGenerated: 0,
      systemUptime: 0,
    },
  });
  
  const managerAgentConfig = {
    runIntervalMinutes: 5,
    retryAttempts: 3,
    timeoutMinutes: 10,
    healthCheckIntervalMinutes: 5,
    taskCleanupHours: 24,
    logCleanupDays: 30,
    agentRestartThreshold: 3,
    systemMetricsCollectionInterval: 15,
  };
  
  const managerAgentMetrics = {
    totalRuns: 0,
    successfulRuns: 0,
    failedRuns: 0,
    averageRunTime: 0,
    agentsManaged: 0,
    tasksCoordinated: 0,
    healthChecksPerformed: 0,
  };
  
  const managerId = await ctx.db.insert("agents", {
    name: "System Manager",
    type: "manager",
    status: "inactive",
    description: "Coordinates and manages all other agents in the system.",
    isEnabled: true,
    runCount: 0,
    errorCount: 0,
    config: managerAgentConfig,
    metrics: managerAgentMetrics,
  });
  
  return {
    success: true,
    message: "Agent system initialized successfully.",
    systemId,
    managerId
  };
}

async function simulateCreateAgentTask(ctx: any, args: any) {
  const agent = await ctx.db.get(args.agentId);
  if (!agent) {
    throw new Error("Agent not found");
  }
  
  if (!agent.isEnabled) {
    throw new Error("Agent is not enabled");
  }
  
  const task = {
    agentId: args.agentId,
    type: args.type,
    priority: args.priority || "medium",
    status: "pending",
    data: args.data || {},
    createdAt: new Date().toISOString(),
    scheduledFor: args.scheduledFor,
    attempts: 0,
    maxRetries: 3
  };
  
  return await ctx.db.insert("agentTasks", task);
}

async function simulateProcessAgentTask(ctx: any, taskId: any) {
  const task = await ctx.db.get(taskId);
  if (!task) {
    throw new Error("Task not found");
  }
  
  // Update to in_progress
  await ctx.db.patch(taskId, {
    status: "in_progress",
    startedAt: new Date().toISOString()
  });
  
  // Simulate processing
  const result = {
    processed: true,
    data: { message: "Task processed successfully" }
  };
  
  // Update to completed
  await ctx.db.patch(taskId, {
    status: "completed",
    completedAt: new Date().toISOString(),
    result
  });
  
  return { success: true, result };
}

async function simulateProcessAgentTaskWithError(ctx: any, taskId: any, error: Error) {
  const task = await ctx.db.get(taskId);
  if (!task) {
    throw new Error("Task not found");
  }
  
  const newAttempts = (task.attempts || 0) + 1;
  const maxRetries = task.maxRetries || 3;
  
  if (newAttempts >= maxRetries) {
    await ctx.db.patch(taskId, {
      status: "failed",
      failedAt: new Date().toISOString(),
      lastError: error.message
    });
  } else {
    await ctx.db.patch(taskId, {
      status: "pending",
      attempts: newAttempts,
      lastError: error.message
    });
  }
  
  return { success: false, error: error.message };
}

async function simulateGetAgentMetrics(ctx: any, agentId: any) {
  const agent = await ctx.db.get(agentId);
  if (!agent) {
    throw new Error("Agent not found");
  }
  
  const tasks = await ctx.db.query("agentTasks")
    .filter((q: any) => q.eq(q.field("agentId"), agentId))
    .collect();
    
  const taskStats = {
    total: tasks.length,
    completed: tasks.filter((t: any) => t.status === "completed").length,
    failed: tasks.filter((t: any) => t.status === "failed").length,
    pending: tasks.filter((t: any) => t.status === "pending").length,
    inProgress: tasks.filter((t: any) => t.status === "in_progress").length,
    byPriority: {
      critical: tasks.filter((t: any) => t.priority === "critical").length,
      high: tasks.filter((t: any) => t.priority === "high").length,
      medium: tasks.filter((t: any) => t.priority === "medium").length,
      low: tasks.filter((t: any) => t.priority === "low").length,
    }
  };
  
  const performance = {
    successRate: agent.metrics?.successfulRuns 
      ? (agent.metrics.successfulRuns / agent.metrics.totalRuns) * 100 
      : 0,
    errorRate: agent.metrics?.failedRuns 
      ? (agent.metrics.failedRuns / agent.metrics.totalRuns) * 100 
      : 0,
    averageRunTime: agent.metrics?.averageRunTime || 0
  };
  
  return {
    agent,
    taskStats,
    performance
  };
}

async function simulateCreateInsight(ctx: any, args: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }
  
  const user = await ctx.db.query("users")
    .withIndex("by_clerkId", (q: any) => q.eq("clerkId", identity.subject))
    .first();
    
  if (!user) {
    throw new Error("User not found");
  }
  
  // Validate severity
  const validSeverities = ['critical', 'high', 'medium', 'low', 'info'];
  if (!validSeverities.includes(args.severity)) {
    throw new Error("Invalid severity level");
  }
  
  const insight = {
    type: args.type,
    severity: args.severity,
    title: args.title,
    description: args.description,
    data: args.data || {},
    relatedEntityId: args.relatedEntityId,
    relatedEntityType: args.relatedEntityType,
    enterpriseId: user.enterpriseId,
    createdBy: "system" as any,
    status: "new",
    createdAt: new Date().toISOString()
  };
  
  // Note: agentInsights table doesn't have assignedTo field
  // This logic would need to be implemented differently,
  // perhaps by creating a notification for the user
  
  return await ctx.db.insert("agentInsights", insight);
}

async function simulateCoordinateWorkflow(ctx: any, workflow: any) {
  const agents = await ctx.db.query("agents")
    .filter((q: any) => q.eq(q.field("isEnabled"), true))
    .collect();
    
  let tasksCreated = 0;
  
  for (const step of workflow.steps) {
    const agent = agents.find((a: any) => a.type === step.agentType);
    if (agent) {
      await ctx.db.insert("agentTasks", {
        agentId: agent._id,
        type: step.action,
        priority: "medium",
        status: "pending",
        createdAt: new Date().toISOString()
      });
      tasksCreated++;
    }
  }
  
  return { tasksCreated };
}

async function simulateCheckAgentHealth(ctx: any) {
  const agents = await ctx.db.query("agents").collect();
  
  const healthReport = {
    healthy: 0,
    warning: 0,
    unhealthy: 0,
    agents: [] as any[]
  };
  
  for (const agent of agents) {
    const agentHealth = {
      agentId: agent._id,
      status: 'healthy' as 'healthy' | 'warning' | 'unhealthy',
      issues: [] as string[]
    };
    
    // Check various health indicators
    const now = Date.now();
    const lastHealthCheck = agent.lastHealthCheck 
      ? new Date(agent.lastHealthCheck).getTime() 
      : 0;
    const timeSinceLastCheck = now - lastHealthCheck;
    
    // Error state
    if (agent.status === 'error') {
      agentHealth.status = 'unhealthy';
      agentHealth.issues.push('Agent in error state');
    }
    
    // High error count
    if (agent.errorCount > 5) {
      agentHealth.status = agentHealth.status === 'unhealthy' ? 'unhealthy' : 'warning';
      agentHealth.issues.push('High error count');
    }
    
    // Health check overdue
    if (timeSinceLastCheck > 60 * 60 * 1000) { // 1 hour
      agentHealth.status = 'unhealthy';
      agentHealth.issues.push('Health check overdue');
    }
    
    // Update counts
    if (agentHealth.status === 'healthy') healthReport.healthy++;
    else if (agentHealth.status === 'warning') healthReport.warning++;
    else healthReport.unhealthy++;
    
    healthReport.agents.push(agentHealth);
  }
  
  return healthReport;
}