'use client';

import { useState, useCallback } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { useAgentPreferencesStore } from '@/stores/agentPreferencesStore';
import { useAgentToast } from '@/components/ai/AgentToast';
import { useDocumentUploadAgent, type DocumentProcessingResult } from './useDocumentUploadAgent';
import type { AgentType } from '@/types/agents.types';

const supabase = createClient();

// ============================================================================
// TYPES
// ============================================================================

export interface PipelineStage {
  agent: AgentType;
  taskType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  taskId?: string;
  result?: Record<string, unknown>;
  error?: string;
}

export interface PipelineResult {
  documentId: string;
  documentResult: DocumentProcessingResult;
  stages: PipelineStage[];
  overallStatus: 'processing' | 'completed' | 'failed' | 'partial';
}

export interface PipelineOptions {
  contractId?: string;
  vendorId?: string;
  sourceContext?: 'manual' | 'contract_creation' | 'vendor_document' | 'bulk_upload' | 'api';
  /**
   * Which agents to run in the pipeline
   * @default ['secretary', 'legal', 'compliance', 'financial']
   */
  agents?: AgentType[];
  /**
   * Skip vendor document-only pipelines (Secretary + Compliance only)
   */
  fullAnalysis?: boolean;
}

// Default pipeline: Secretary → Legal → Compliance → Financial
const DEFAULT_PIPELINE: AgentType[] = ['secretary', 'legal', 'compliance', 'financial'];
const VENDOR_DOCUMENT_PIPELINE: AgentType[] = ['secretary', 'compliance'];

// ============================================================================
// HOOK: useFullDocumentPipeline
// ============================================================================

export function useFullDocumentPipeline() {
  const { userProfile } = useAuth();
  const documentUpload = useDocumentUploadAgent();
  const { addActiveTask, updateActiveTask, removeActiveTask } = useAgentPreferencesStore();
  const { notifyTaskStarted, notifyTaskCompleted, notifyTaskFailed } = useAgentToast();

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPipeline, setCurrentPipeline] = useState<PipelineResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Queue an agent task and wait for completion
   */
  const queueAgentTask = useCallback(
    async (
      agentType: AgentType,
      taskType: string,
      payload: Record<string, unknown>
    ): Promise<{ taskId: string; result: Record<string, unknown> }> => {
      if (!userProfile?.enterprise_id) {
        throw new Error('User not authenticated');
      }

      // Find the agent ID for this type
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('id')
        .eq('enterprise_id', userProfile.enterprise_id)
        .eq('type', agentType)
        .eq('is_enabled', true)
        .single();

      if (agentError || !agent) {
        throw new Error(`Agent ${agentType} not found or disabled`);
      }

      // Create the task
      const { data: task, error: taskError } = await (supabase as any)
        .from('agent_tasks')
        .insert({
          agent_id: agent.id,
          task_type: taskType,
          priority: 7,
          status: 'pending',
          payload,
          contract_id: payload.contractId || null,
          vendor_id: payload.vendorId || null,
          enterprise_id: userProfile.enterprise_id,
          user_id: userProfile.id,
        })
        .select('id')
        .single();

      if (taskError || !task) {
        throw new Error(`Failed to create task: ${taskError?.message}`);
      }

      // Add to activity tracking
      addActiveTask({
        id: task.id,
        agentType,
        taskType,
        status: 'processing',
        message: `${agentType}: ${taskType}`,
        startedAt: new Date(),
        contractId: payload.contractId as string | undefined,
        vendorId: payload.vendorId as string | undefined,
      });

      notifyTaskStarted(agentType, taskType);

      // Wait for completion (poll every 2 seconds, timeout after 2 minutes)
      const result = await pollTaskCompletion(task.id, agentType, taskType);

      return { taskId: task.id, result };
    },
    [userProfile, addActiveTask, notifyTaskStarted]
  );

  /**
   * Poll for task completion
   */
  const pollTaskCompletion = useCallback(
    async (
      taskId: string,
      agentType: AgentType,
      taskType: string
    ): Promise<Record<string, unknown>> => {
      const maxAttempts = 60; // 2 minutes at 2-second intervals
      let attempts = 0;

      while (attempts < maxAttempts) {
        const { data: task, error } = await supabase
          .from('agent_tasks')
          .select('status, result, error')
          .eq('id', taskId)
          .single();

        if (error) {
          throw new Error(`Failed to fetch task status: ${error.message}`);
        }

        if (task.status === 'completed') {
          updateActiveTask(taskId, { status: 'completed' });
          notifyTaskCompleted(agentType, taskType);

          setTimeout(() => removeActiveTask(taskId), 5000);

          return (task.result as Record<string, unknown>) || {};
        }

        if (task.status === 'failed') {
          updateActiveTask(taskId, { status: 'failed' });
          notifyTaskFailed(agentType, taskType, task.error || 'Task failed');

          setTimeout(() => removeActiveTask(taskId), 5000);

          throw new Error(task.error || 'Task failed');
        }

        // Wait 2 seconds before polling again
        await new Promise((resolve) => setTimeout(resolve, 2000));
        attempts++;
      }

      throw new Error('Task timed out');
    },
    [updateActiveTask, removeActiveTask, notifyTaskCompleted, notifyTaskFailed]
  );

  /**
   * Process a document through the full pipeline
   */
  const processDocument = useCallback(
    async (file: File, options: PipelineOptions = {}): Promise<PipelineResult> => {
      if (!userProfile?.enterprise_id) {
        throw new Error('User not authenticated');
      }

      setIsProcessing(true);
      setError(null);

      // Determine which agents to run
      const isVendorDocument = options.sourceContext === 'vendor_document';
      const pipeline = options.agents || (isVendorDocument ? VENDOR_DOCUMENT_PIPELINE : DEFAULT_PIPELINE);

      // Initialize pipeline result
      const pipelineResult: PipelineResult = {
        documentId: '',
        documentResult: {} as DocumentProcessingResult,
        stages: pipeline.map((agent) => ({
          agent,
          taskType: getTaskTypeForAgent(agent),
          status: 'pending' as const,
        })),
        overallStatus: 'processing',
      };

      setCurrentPipeline(pipelineResult);

      try {
        // Stage 1: Document upload and Secretary processing
        const secretaryStageIndex = pipeline.indexOf('secretary');
        if (secretaryStageIndex >= 0) {
          pipelineResult.stages[secretaryStageIndex].status = 'processing';
          setCurrentPipeline({ ...pipelineResult });

          const { documentId, result } = await documentUpload.processUpload(file, {
            contractId: options.contractId,
            vendorId: options.vendorId,
            sourceContext: options.sourceContext,
          });

          pipelineResult.documentId = documentId;

          // Wait for Secretary processing to complete
          const docResult = await result;
          pipelineResult.documentResult = docResult;
          pipelineResult.stages[secretaryStageIndex].status = 'completed';
          pipelineResult.stages[secretaryStageIndex].result = {
            extractedText: docResult.extractedText,
            classification: docResult.classification,
            ocrConfidence: docResult.ocrConfidence,
          };
          setCurrentPipeline({ ...pipelineResult });
        }

        // Stage 2+: Run remaining agents in sequence
        for (let i = 0; i < pipeline.length; i++) {
          const agent = pipeline[i];

          // Skip secretary (already processed)
          if (agent === 'secretary') continue;

          const stage = pipelineResult.stages[i];
          stage.status = 'processing';
          setCurrentPipeline({ ...pipelineResult });

          try {
            const payload = buildPayloadForAgent(agent, pipelineResult, options);
            const { taskId, result } = await queueAgentTask(
              agent,
              stage.taskType,
              payload
            );

            stage.taskId = taskId;
            stage.result = result;
            stage.status = 'completed';
          } catch (err) {
            stage.status = 'failed';
            stage.error = (err as Error).message;
            // Continue with other agents even if one fails
          }

          setCurrentPipeline({ ...pipelineResult });
        }

        // Determine overall status
        const hasFailures = pipelineResult.stages.some((s) => s.status === 'failed');
        const allCompleted = pipelineResult.stages.every(
          (s) => s.status === 'completed' || s.status === 'skipped'
        );

        pipelineResult.overallStatus = allCompleted
          ? 'completed'
          : hasFailures
            ? 'partial'
            : 'completed';

        setCurrentPipeline(pipelineResult);
        setIsProcessing(false);

        return pipelineResult;
      } catch (err) {
        const error = err as Error;
        setError(error);
        setIsProcessing(false);

        pipelineResult.overallStatus = 'failed';
        setCurrentPipeline(pipelineResult);

        throw error;
      }
    },
    [userProfile, documentUpload, queueAgentTask]
  );

  /**
   * Trigger analysis on an existing document/contract
   */
  const analyzeExisting = useCallback(
    async (
      entityType: 'contract' | 'vendor' | 'document',
      entityId: string,
      agents: AgentType[] = ['legal', 'compliance', 'financial']
    ): Promise<PipelineStage[]> => {
      if (!userProfile?.enterprise_id) {
        throw new Error('User not authenticated');
      }

      setIsProcessing(true);
      setError(null);

      const stages: PipelineStage[] = agents.map((agent) => ({
        agent,
        taskType: getTaskTypeForAgent(agent),
        status: 'pending' as const,
      }));

      try {
        for (const stage of stages) {
          stage.status = 'processing';

          try {
            const payload: Record<string, unknown> = {
              [`${entityType}Id`]: entityId,
              requestedOutputs: getOutputsForAgent(stage.agent),
            };

            const { taskId, result } = await queueAgentTask(
              stage.agent,
              stage.taskType,
              payload
            );

            stage.taskId = taskId;
            stage.result = result;
            stage.status = 'completed';
          } catch (err) {
            stage.status = 'failed';
            stage.error = (err as Error).message;
          }
        }

        setIsProcessing(false);
        return stages;
      } catch (err) {
        setError(err as Error);
        setIsProcessing(false);
        throw err;
      }
    },
    [userProfile, queueAgentTask]
  );

  return {
    // Process new documents
    processDocument,

    // Analyze existing entities
    analyzeExisting,

    // State
    isProcessing,
    currentPipeline,
    error,

    // Expose upload state from document hook
    isUploading: documentUpload.isUploading,
    uploadProgress: documentUpload.uploadProgress,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getTaskTypeForAgent(agent: AgentType): string {
  const taskTypes: Partial<Record<AgentType, string>> = {
    secretary: 'document_extraction',
    legal: 'contract_analysis',
    compliance: 'compliance_check',
    financial: 'financial_analysis',
    vendor: 'vendor_evaluation',
    risk_assessment: 'risk_assessment',
    analytics: 'data_analysis',
  };

  return taskTypes[agent] || `${agent}_analysis`;
}

function getOutputsForAgent(agent: AgentType): string[] {
  const outputs: Partial<Record<AgentType, string[]>> = {
    legal: [
      'risk_assessment',
      'clause_analysis',
      'compliance_check',
      'legal_review',
      'obligation_extraction',
    ],
    compliance: [
      'regulatory_compliance',
      'policy_validation',
      'certification_check',
      'audit_readiness',
    ],
    financial: [
      'budget_impact',
      'cost_breakdown',
      'payment_schedule',
      'roi_analysis',
      'variance_analysis',
    ],
    vendor: [
      'performance_analysis',
      'risk_assessment',
      'relationship_score',
      'compliance_status',
    ],
    risk_assessment: [
      'contract_risk',
      'vendor_risk',
      'financial_risk',
      'compliance_risk',
      'mitigation_recommendations',
    ],
  };

  return outputs[agent] || ['analysis'];
}

function buildPayloadForAgent(
  agent: AgentType,
  pipelineResult: PipelineResult,
  options: PipelineOptions
): Record<string, unknown> {
  const basePayload: Record<string, unknown> = {
    documentId: pipelineResult.documentId,
    contractId: options.contractId,
    vendorId: options.vendorId,
    requestedOutputs: getOutputsForAgent(agent),
  };

  // Add context from previous stages
  if (pipelineResult.documentResult.extractedText) {
    basePayload.extractedText = pipelineResult.documentResult.extractedText;
  }

  if (pipelineResult.documentResult.classification) {
    basePayload.documentClassification = pipelineResult.documentResult.classification;
  }

  // Find secretary stage results
  const secretaryStage = pipelineResult.stages.find((s) => s.agent === 'secretary');
  if (secretaryStage?.result) {
    basePayload.ocrResults = secretaryStage.result;
  }

  // Add legal analysis results if available (for compliance/financial)
  if (agent === 'compliance' || agent === 'financial') {
    const legalStage = pipelineResult.stages.find((s) => s.agent === 'legal');
    if (legalStage?.result) {
      basePayload.legalAnalysis = legalStage.result;
    }
  }

  return basePayload;
}

export default useFullDocumentPipeline;
