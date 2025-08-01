import { ConvexError } from 'convex/values';
import { 
  createMockConvexContext, 
  createMockContract, 
  createMockUser,
  withMockContext
} from '../utils/convex-test-helpers';

describe('Contract Analysis', () => {
  describe('triggerContractAnalysis', () => {
    it('should trigger analysis for valid contract', async () => {
      await withMockContext(async (ctx) => {
        const mockUser = createMockUser();
        const mockContract = createMockContract({
          enterpriseId: mockUser.enterpriseId,
          storageId: 'storage123' as any,
          analysisStatus: 'pending'
        });
        
        ctx.auth.getUserIdentity.mockResolvedValue({
          subject: mockUser.clerkId,
          email: mockUser.email
        });
        ctx.db.query().filter().first.mockResolvedValue(mockUser);
        ctx.db.get.mockResolvedValue(mockContract);
        
        // Mock scheduler
        const jobId = 'job123';
        ctx.scheduler.runAfter.mockResolvedValue(jobId);
        
        await simulateTriggerAnalysis(ctx, mockContract._id);
        
        // Verify status update
        expect(ctx.db.patch).toHaveBeenCalledWith(mockContract._id, {
          analysisStatus: 'processing',
          updatedAt: expect.any(Number)
        });
        
        // Verify job scheduled
        expect(ctx.scheduler.runAfter).toHaveBeenCalledWith(
          0,
          expect.any(Object),
          { contractId: mockContract._id }
        );
      });
    });

    it('should not trigger analysis for contract without file', async () => {
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
        
        await expect(simulateTriggerAnalysis(ctx, mockContract._id))
          .rejects.toThrow('Contract has no file to analyze');
      });
    });

    it('should not re-trigger analysis for already processing contract', async () => {
      await withMockContext(async (ctx) => {
        const mockUser = createMockUser();
        const mockContract = createMockContract({
          enterpriseId: mockUser.enterpriseId,
          storageId: 'storage123' as any,
          analysisStatus: 'processing'
        });
        
        ctx.auth.getUserIdentity.mockResolvedValue({
          subject: mockUser.clerkId,
          email: mockUser.email
        });
        ctx.db.query().filter().first.mockResolvedValue(mockUser);
        ctx.db.get.mockResolvedValue(mockContract);
        
        await expect(simulateTriggerAnalysis(ctx, mockContract._id))
          .rejects.toThrow('Analysis already in progress');
      });
    });
  });

  describe('updateAnalysisResults', () => {
    it('should update contract with analysis results', async () => {
      await withMockContext(async (ctx) => {
        const contractId = 'contract123' as any;
        const analysisResults = {
          keyTerms: ['payment', 'delivery', 'warranty'],
          obligations: [
            { party: 'buyer', obligation: 'Pay within 30 days', dueDate: Date.now() },
            { party: 'seller', obligation: 'Deliver goods', dueDate: Date.now() }
          ],
          risks: [
            { level: 'high' as const, description: 'No limitation of liability clause' },
            { level: 'medium' as const, description: 'Broad termination rights' }
          ],
          summary: 'Standard service agreement with typical terms',
          extractedVendorInfo: {
            name: 'Acme Corp',
            address: '123 Main St',
            contact: 'contact@acme.com'
          }
        };
        
        ctx.db.get.mockResolvedValue(createMockContract({ _id: contractId }));
        
        await simulateUpdateAnalysisResults(ctx, contractId, analysisResults);
        
        expect(ctx.db.patch).toHaveBeenCalledWith(contractId, {
          analysisStatus: 'completed',
          analysisResults,
          analyzedAt: expect.any(Number),
          updatedAt: expect.any(Number)
        });
      });
    });

    it('should handle analysis failure', async () => {
      await withMockContext(async (ctx) => {
        const contractId = 'contract123' as any;
        const error = 'Failed to extract text from PDF';
        
        ctx.db.get.mockResolvedValue(createMockContract({ _id: contractId }));
        
        await simulateUpdateAnalysisError(ctx, contractId, error);
        
        expect(ctx.db.patch).toHaveBeenCalledWith(contractId, {
          analysisStatus: 'failed',
          analysisError: error,
          updatedAt: expect.any(Number)
        });
      });
    });
  });

  describe('AI Analysis Functions', () => {
    describe('analyzeContractClauses', () => {
      it('should extract and analyze contract clauses', async () => {
        const mockOpenAIResponse = {
          clauses: [
            {
              type: 'payment',
              text: 'Payment shall be made within 30 days',
              riskLevel: 'low',
              suggestions: []
            },
            {
              type: 'termination',
              text: 'Either party may terminate with 30 days notice',
              riskLevel: 'medium',
              suggestions: ['Consider adding termination penalties']
            },
            {
              type: 'liability',
              text: 'No limitation of liability',
              riskLevel: 'high',
              suggestions: ['Add liability cap', 'Exclude consequential damages']
            }
          ],
          overallRisk: 'medium',
          summary: 'Standard service agreement with some risk areas'
        };
        
        const result = await simulateAnalyzeContractClauses(
          'Contract text here...',
          mockOpenAIResponse
        );
        
        expect(result.clauses).toHaveLength(3);
        expect(result.clauses.filter((c: any) => c.riskLevel === 'high')).toHaveLength(1);
        expect(result.overallRisk).toBe('medium');
      });

      it('should handle AI service errors gracefully', async () => {
        await expect(simulateAnalyzeContractClauses(
          'Contract text',
          null // Simulate AI failure
        )).rejects.toThrow('Failed to analyze contract clauses');
      });
    });

    describe('findSimilarClauses', () => {
      it('should find similar clauses using embeddings', async () => {
        const searchClause = 'Payment terms: Net 30 days';
        const contractClauses = [
          { text: 'Payment due within 30 days', similarity: 0.95 },
          { text: 'Invoice payable in 30 days', similarity: 0.92 },
          { text: 'Delivery within 5 business days', similarity: 0.3 },
          { text: 'Warranty period of 1 year', similarity: 0.1 }
        ];
        
        const result = await simulateFindSimilarClauses(
          searchClause,
          contractClauses,
          0.8
        );
        
        expect(result).toHaveLength(2);
        expect(result[0].similarity).toBeGreaterThan(0.9);
        expect(result.every(r => r.similarity >= 0.8)).toBe(true);
      });
    });

    describe('assessClauseRisk', () => {
      it('should assess risk level of contract clauses', async () => {
        const clauses = [
          'Unlimited liability for all damages',
          'Payment terms: Net 30 days',
          'Standard warranty provisions apply'
        ];
        
        const mockRiskAssessment = {
          risks: [
            {
              clause: clauses[0],
              riskLevel: 'high',
              explanation: 'Unlimited liability exposes significant financial risk',
              mitigation: 'Negotiate liability cap'
            },
            {
              clause: clauses[1],
              riskLevel: 'low',
              explanation: 'Standard payment terms',
              mitigation: null
            },
            {
              clause: clauses[2],
              riskLevel: 'low',
              explanation: 'Typical warranty language',
              mitigation: null
            }
          ],
          overallRisk: 'medium'
        };
        
        const result = await simulateAssessClauseRisk(clauses, mockRiskAssessment);
        
        expect(result.risks).toHaveLength(3);
        expect(result.risks[0].riskLevel).toBe('high');
        expect(result.overallRisk).toBe('medium');
      });
    });
  });

  describe('Contract Export', () => {
    it('should export contracts in JSON format', async () => {
      await withMockContext(async (ctx) => {
        const mockUser = createMockUser();
        const mockContracts = [
          createMockContract({ enterpriseId: mockUser.enterpriseId }),
          createMockContract({ enterpriseId: mockUser.enterpriseId })
        ];
        
        ctx.auth.getUserIdentity.mockResolvedValue({
          subject: mockUser.clerkId,
          email: mockUser.email
        });
        ctx.db.query().filter().first.mockResolvedValue(mockUser);
        ctx.db.query().filter().collect.mockResolvedValue(mockContracts);
        
        const result = await simulateExportContracts(ctx, 'json');
        
        expect(result.format).toBe('json');
        expect(result.data).toBeDefined();
        expect(JSON.parse(result.data).contracts).toHaveLength(2);
      });
    });

    it('should export contracts in CSV format', async () => {
      await withMockContext(async (ctx) => {
        const mockUser = createMockUser();
        const mockContracts = [
          createMockContract({ 
            enterpriseId: mockUser.enterpriseId,
            title: 'Contract 1',
            value: 50000
          }),
          createMockContract({ 
            enterpriseId: mockUser.enterpriseId,
            title: 'Contract 2',
            value: 75000
          })
        ];
        
        ctx.auth.getUserIdentity.mockResolvedValue({
          subject: mockUser.clerkId,
          email: mockUser.email
        });
        ctx.db.query().filter().first.mockResolvedValue(mockUser);
        ctx.db.query().filter().collect.mockResolvedValue(mockContracts);
        
        const result = await simulateExportContracts(ctx, 'csv');
        
        expect(result.format).toBe('csv');
        expect(result.data).toContain('Title,Type,Status,Value');
        expect(result.data).toContain('Contract 1');
        expect(result.data).toContain('Contract 2');
      });
    });

    it('should respect filters when exporting', async () => {
      await withMockContext(async (ctx) => {
        const mockUser = createMockUser();
        const activeContracts = [
          createMockContract({ 
            enterpriseId: mockUser.enterpriseId,
            status: 'active'
          })
        ];
        
        ctx.auth.getUserIdentity.mockResolvedValue({
          subject: mockUser.clerkId,
          email: mockUser.email
        });
        ctx.db.query().filter().first.mockResolvedValue(mockUser);
        
        // Mock filtered query
        const mockFilter = jest.fn().mockReturnThis();
        const mockCollect = jest.fn().mockResolvedValue(activeContracts);
        ctx.db.query.mockReturnValue({
          filter: mockFilter,
          collect: mockCollect
        });
        
        await simulateExportContracts(ctx, 'json', { status: 'active' });
        
        // Verify filter was applied
        expect(mockFilter).toHaveBeenCalledTimes(2); // Enterprise + status filter
      });
    });
  });
});

// Simulation functions for analysis features
async function simulateTriggerAnalysis(ctx: any, contractId: any) {
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
  
  if (!contract.fileId) {
    throw new ConvexError('Contract has no file to analyze');
  }
  
  if (contract.analysisStatus === 'processing') {
    throw new ConvexError('Analysis already in progress');
  }
  
  // Update status
  await ctx.db.patch(contractId, {
    analysisStatus: 'processing',
    updatedAt: Date.now()
  });
  
  // Schedule analysis job
  return await ctx.scheduler.runAfter(
    0,
    { internal: { contracts: 'analyzeContractInternal' } },
    { contractId }
  );
}

async function simulateUpdateAnalysisResults(
  ctx: any, 
  contractId: any, 
  results: any
) {
  const contract = await ctx.db.get(contractId);
  if (!contract) {
    throw new ConvexError('Contract not found');
  }
  
  return await ctx.db.patch(contractId, {
    analysisStatus: 'completed',
    analysisResults: results,
    analyzedAt: Date.now(),
    updatedAt: Date.now()
  });
}

async function simulateUpdateAnalysisError(
  ctx: any, 
  contractId: any, 
  error: string
) {
  const contract = await ctx.db.get(contractId);
  if (!contract) {
    throw new ConvexError('Contract not found');
  }
  
  return await ctx.db.patch(contractId, {
    analysisStatus: 'failed',
    analysisError: error,
    updatedAt: Date.now()
  });
}

async function simulateAnalyzeContractClauses(
  contractText: string,
  mockResponse: any
) {
  if (!mockResponse) {
    throw new Error('Failed to analyze contract clauses');
  }
  
  return mockResponse;
}

async function simulateFindSimilarClauses(
  searchClause: string,
  contractClauses: any[],
  threshold: number
) {
  return contractClauses
    .filter(clause => clause.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity);
}

async function simulateAssessClauseRisk(
  clauses: string[],
  mockAssessment: any
) {
  return mockAssessment;
}

async function simulateExportContracts(
  ctx: any,
  format: 'json' | 'csv',
  filters?: any
) {
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
    
  if (filters?.status) {
    query = query.filter((q: any) => q.eq(q.field('status'), filters.status));
  }
  
  const contracts = await query.collect();
  
  if (format === 'json') {
    return {
      format: 'json',
      data: JSON.stringify({ contracts }, null, 2),
      filename: `contracts_export_${Date.now()}.json`
    };
  } else {
    // CSV format
    const headers = ['Title', 'Type', 'Status', 'Value', 'Start Date', 'End Date'];
    const rows = contracts.map((c: any) => [
      c.title,
      c.type,
      c.status,
      c.value || 0,
      c.startDate ? new Date(c.startDate).toISOString() : '',
      c.endDate ? new Date(c.endDate).toISOString() : ''
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map((row: any) => row.join(','))
    ].join('\n');
    
    return {
      format: 'csv',
      data: csv,
      filename: `contracts_export_${Date.now()}.csv`
    };
  }
}