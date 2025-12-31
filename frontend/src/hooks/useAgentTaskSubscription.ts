import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useEffect, useRef, useCallback, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';
import type { AgentType } from '@/types/agents.types';
import {
  useAgentPreferencesStore,
  type ActiveAgentTask,
} from '@/stores/agentPreferencesStore';
import { useAgentToast } from '@/components/ai/AgentToast';

const supabase = createClient();

// ============================================================================
// TYPES
// ============================================================================

interface AgentTaskPayload {
  id: string;
  agent_id: string;
  task_type: string;
  priority: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  retry_count: number;
  contract_id: string | null;
  vendor_id: string | null;
  enterprise_id: string;
  user_id: string | null;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface AgentInfo {
  id: string;
  type: AgentType;
  name: string;
}

// ============================================================================
// HOOK: useAgentTaskSubscription
// ============================================================================

interface UseAgentTaskSubscriptionOptions {
  /** Only subscribe to tasks for specific agent types */
  agentTypes?: AgentType[];
  /** Only subscribe to tasks for specific contract */
  contractId?: string;
  /** Only subscribe to tasks for specific vendor */
  vendorId?: string;
  /** Callback when a task starts */
  onTaskStarted?: (task: ActiveAgentTask) => void;
  /** Callback when a task completes */
  onTaskCompleted?: (task: ActiveAgentTask) => void;
  /** Callback when a task fails */
  onTaskFailed?: (task: ActiveAgentTask) => void;
}

export function useAgentTaskSubscription(options: UseAgentTaskSubscriptionOptions = {}) {
  const { userProfile } = useAuth();
  const { addActiveTask, updateActiveTask, removeActiveTask, getEffectivePreference, globalMode } =
    useAgentPreferencesStore();
  const { notifyTaskStarted, notifyTaskCompleted, notifyTaskFailed } = useAgentToast();

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const agentCacheRef = useRef<Map<string, AgentInfo>>(new Map());
  const optionsRef = useRef(options);

  // Update options ref on every render
  useEffect(() => {
    optionsRef.current = options;
  });

  // Fetch agent info for a task
  const getAgentInfo = useCallback(async (agentId: string): Promise<AgentInfo | null> => {
    // Check cache first
    if (agentCacheRef.current.has(agentId)) {
      return agentCacheRef.current.get(agentId)!;
    }

    // Fetch from database
    const { data, error } = await supabase
      .from('agents')
      .select('id, type, name')
      .eq('id', agentId)
      .single();

    if (error || !data) {
      console.error('Failed to fetch agent info:', error);
      return null;
    }

    const agentInfo: AgentInfo = {
      id: data.id,
      type: data.type as AgentType,
      name: data.name,
    };

    agentCacheRef.current.set(agentId, agentInfo);
    return agentInfo;
  }, []);

  // Convert database payload to ActiveAgentTask
  const payloadToTask = useCallback(
    async (payload: AgentTaskPayload): Promise<ActiveAgentTask | null> => {
      const agentInfo = await getAgentInfo(payload.agent_id);
      if (!agentInfo) return null;

      // Filter by agent type if specified
      if (
        optionsRef.current.agentTypes &&
        !optionsRef.current.agentTypes.includes(agentInfo.type)
      ) {
        return null;
      }

      // Filter by contract if specified
      if (optionsRef.current.contractId && payload.contract_id !== optionsRef.current.contractId) {
        return null;
      }

      // Filter by vendor if specified
      if (optionsRef.current.vendorId && payload.vendor_id !== optionsRef.current.vendorId) {
        return null;
      }

      const status: ActiveAgentTask['status'] =
        payload.status === 'in_progress'
          ? 'processing'
          : payload.status === 'pending'
            ? 'pending'
            : payload.status === 'completed'
              ? 'completed'
              : 'failed';

      return {
        id: payload.id,
        agentType: agentInfo.type,
        taskType: payload.task_type,
        status,
        message: (payload.payload as Record<string, string>).message || undefined,
        startedAt: payload.started_at ? new Date(payload.started_at) : new Date(payload.created_at),
        completedAt: payload.completed_at ? new Date(payload.completed_at) : undefined,
        contractId: payload.contract_id || undefined,
        vendorId: payload.vendor_id || undefined,
      };
    },
    [getAgentInfo]
  );

  // Handle task insert
  const handleInsert = useCallback(
    async (payload: RealtimePostgresChangesPayload<AgentTaskPayload>) => {
      const newRecord = payload.new as AgentTaskPayload;
      const task = await payloadToTask(newRecord);
      if (!task) return;

      addActiveTask(task);

      // Show notification if preference allows
      const pref = getEffectivePreference(task.agentType);
      if (pref.notificationMode === 'realtime' && globalMode !== 'silent') {
        notifyTaskStarted(task.agentType, task.taskType);
      }

      optionsRef.current.onTaskStarted?.(task);
    },
    [payloadToTask, addActiveTask, getEffectivePreference, globalMode, notifyTaskStarted]
  );

  // Handle task update
  const handleUpdate = useCallback(
    async (payload: RealtimePostgresChangesPayload<AgentTaskPayload>) => {
      const newRecord = payload.new as AgentTaskPayload;
      const task = await payloadToTask(newRecord);
      if (!task) return;

      updateActiveTask(task.id, {
        status: task.status,
        completedAt: task.completedAt,
      });

      // Show notification on completion
      const pref = getEffectivePreference(task.agentType);
      if (pref.notificationMode === 'realtime' && globalMode !== 'silent') {
        if (task.status === 'completed') {
          notifyTaskCompleted(task.agentType, task.taskType);
          optionsRef.current.onTaskCompleted?.(task);
        } else if (task.status === 'failed') {
          notifyTaskFailed(task.agentType, task.taskType, newRecord.error || undefined);
          optionsRef.current.onTaskFailed?.(task);
        }
      }

      // Auto-remove completed/failed tasks after delay
      if (task.status === 'completed' || task.status === 'failed') {
        setTimeout(() => {
          removeActiveTask(task.id);
        }, 10000); // Remove after 10 seconds
      }
    },
    [
      payloadToTask,
      updateActiveTask,
      removeActiveTask,
      getEffectivePreference,
      globalMode,
      notifyTaskCompleted,
      notifyTaskFailed,
    ]
  );

  // Set up subscription
  useEffect(() => {
    if (!userProfile?.enterprise_id) return;

    const enterpriseId = userProfile.enterprise_id;
    const userId = userProfile.id;

    // Build filter - tasks for this user in this enterprise
    let filter = `enterprise_id=eq.${enterpriseId}`;

    // Only filter by user_id if we want to see only the current user's tasks
    // For now, show all enterprise tasks (admins might want to see all)
    // filter += `,user_id=eq.${userId}`;

    const channelName = `agent-tasks-${enterpriseId}-${Date.now()}`;

    const channel = supabase
      .channel(channelName)
      .on<AgentTaskPayload>(
        'postgres_changes' as unknown as 'system',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_tasks',
          filter,
        } as unknown as Record<string, string>,
        handleInsert
      )
      .on<AgentTaskPayload>(
        'postgres_changes' as unknown as 'system',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_tasks',
          filter,
        } as unknown as Record<string, string>,
        handleUpdate
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsSubscribed(true);
          setError(null);
        } else if (status === 'CHANNEL_ERROR') {
          setError(new Error('Failed to subscribe to agent tasks'));
          setIsSubscribed(false);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsSubscribed(false);
    };
  }, [userProfile?.enterprise_id, userProfile?.id, handleInsert, handleUpdate]);

  return {
    isSubscribed,
    error,
  };
}

// ============================================================================
// HOOK: useTaskProgress
// ============================================================================

/**
 * Subscribe to a specific task's progress
 */
export function useTaskProgress(taskId: string | null) {
  const [task, setTask] = useState<ActiveAgentTask | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!taskId) {
      setTask(null);
      setIsLoading(false);
      return;
    }

    // Fetch initial task state
    const fetchTask = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('agent_tasks')
        .select(`
          id,
          task_type,
          status,
          payload,
          result,
          error,
          started_at,
          completed_at,
          created_at,
          contract_id,
          vendor_id,
          agents:agent_id (id, type, name)
        `)
        .eq('id', taskId)
        .single();

      if (error || !data) {
        setTask(null);
        setIsLoading(false);
        return;
      }

      const agentData = data.agents as unknown as { id: string; type: string; name: string };

      const status: ActiveAgentTask['status'] =
        data.status === 'in_progress'
          ? 'processing'
          : data.status === 'pending'
            ? 'pending'
            : data.status === 'completed'
              ? 'completed'
              : 'failed';

      setTask({
        id: data.id,
        agentType: agentData.type as AgentType,
        taskType: data.task_type,
        status,
        message: (data.payload as Record<string, string>)?.message,
        startedAt: data.started_at ? new Date(data.started_at) : new Date(data.created_at),
        completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
        contractId: data.contract_id || undefined,
        vendorId: data.vendor_id || undefined,
      });
      setIsLoading(false);
    };

    fetchTask();

    // Subscribe to updates
    const channel = supabase
      .channel(`task-${taskId}`)
      .on<AgentTaskPayload>(
        'postgres_changes' as unknown as 'system',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_tasks',
          filter: `id=eq.${taskId}`,
        } as unknown as Record<string, string>,
        async (payload) => {
          const newRecord = payload.new as AgentTaskPayload;

          // Get agent info
          const { data: agentData } = await supabase
            .from('agents')
            .select('type, name')
            .eq('id', newRecord.agent_id)
            .single();

          const status: ActiveAgentTask['status'] =
            newRecord.status === 'in_progress'
              ? 'processing'
              : newRecord.status === 'pending'
                ? 'pending'
                : newRecord.status === 'completed'
                  ? 'completed'
                  : 'failed';

          setTask((prev) =>
            prev
              ? {
                  ...prev,
                  status,
                  completedAt: newRecord.completed_at
                    ? new Date(newRecord.completed_at)
                    : undefined,
                }
              : null
          );
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [taskId]);

  return {
    task,
    isLoading,
    isCompleted: task?.status === 'completed',
    isFailed: task?.status === 'failed',
    isProcessing: task?.status === 'processing',
  };
}

// ============================================================================
// HOOK: useMultipleTasksProgress
// ============================================================================

/**
 * Subscribe to multiple tasks' progress (e.g., document processing pipeline)
 */
export function useMultipleTasksProgress(taskIds: string[]) {
  const [tasks, setTasks] = useState<Map<string, ActiveAgentTask>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (taskIds.length === 0) {
      setTasks(new Map());
      setIsLoading(false);
      return;
    }

    // Fetch initial task states
    const fetchTasks = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('agent_tasks')
        .select(`
          id,
          task_type,
          status,
          payload,
          started_at,
          completed_at,
          created_at,
          contract_id,
          vendor_id,
          agents:agent_id (id, type, name)
        `)
        .in('id', taskIds);

      if (error || !data) {
        setIsLoading(false);
        return;
      }

      const taskMap = new Map<string, ActiveAgentTask>();
      for (const task of data) {
        const agentData = task.agents as unknown as { type: string };
        const status: ActiveAgentTask['status'] =
          task.status === 'in_progress'
            ? 'processing'
            : task.status === 'pending'
              ? 'pending'
              : task.status === 'completed'
                ? 'completed'
                : 'failed';

        taskMap.set(task.id, {
          id: task.id,
          agentType: agentData.type as AgentType,
          taskType: task.task_type,
          status,
          startedAt: task.started_at ? new Date(task.started_at) : new Date(task.created_at),
          completedAt: task.completed_at ? new Date(task.completed_at) : undefined,
          contractId: task.contract_id || undefined,
          vendorId: task.vendor_id || undefined,
        });
      }
      setTasks(taskMap);
      setIsLoading(false);
    };

    fetchTasks();
  }, [taskIds.join(',')]);

  const allCompleted = Array.from(tasks.values()).every(
    (t) => t.status === 'completed' || t.status === 'failed'
  );
  const anyFailed = Array.from(tasks.values()).some((t) => t.status === 'failed');
  const progress =
    taskIds.length > 0
      ? (Array.from(tasks.values()).filter((t) => t.status === 'completed').length / taskIds.length) * 100
      : 0;

  return {
    tasks,
    isLoading,
    allCompleted,
    anyFailed,
    progress,
    taskArray: Array.from(tasks.values()),
  };
}

export default useAgentTaskSubscription;
