import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AgentType } from '@/types/agents.types';

// ============================================================================
// TYPES
// ============================================================================

/** Notification mode for agent activity */
export type NotificationMode = 'silent' | 'realtime' | 'summary';

/** Per-agent notification preference */
export interface AgentNotificationPreference {
  agentType: AgentType;
  notificationMode: NotificationMode;
  soundEnabled: boolean;
  showInActivityIndicator: boolean;
}

/** Agent preferences state */
interface AgentPreferencesState {
  // Global settings
  globalMode: NotificationMode;
  globalSoundEnabled: boolean;
  showActivityIndicator: boolean;

  // Per-agent overrides (if not set, uses global)
  perAgentPreferences: Partial<Record<AgentType, AgentNotificationPreference>>;

  // Activity tracking (non-persisted)
  activeTasks: Map<string, ActiveAgentTask>;

  // Actions
  setGlobalMode: (mode: NotificationMode) => void;
  setGlobalSoundEnabled: (enabled: boolean) => void;
  setShowActivityIndicator: (show: boolean) => void;
  setAgentPreference: (agentType: AgentType, preference: Partial<AgentNotificationPreference>) => void;
  removeAgentPreference: (agentType: AgentType) => void;
  getEffectivePreference: (agentType: AgentType) => AgentNotificationPreference;

  // Activity tracking
  addActiveTask: (task: ActiveAgentTask) => void;
  updateActiveTask: (taskId: string, updates: Partial<ActiveAgentTask>) => void;
  removeActiveTask: (taskId: string) => void;
  clearActiveTasks: () => void;

  // Reset
  resetToDefaults: () => void;
}

/** Active agent task for real-time tracking */
export interface ActiveAgentTask {
  id: string;
  agentType: AgentType;
  taskType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number; // 0-100
  message?: string;
  startedAt: Date;
  completedAt?: Date;
  contractId?: string;
  vendorId?: string;
  documentId?: string;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const defaultGlobalPreferences = {
  globalMode: 'realtime' as NotificationMode,
  globalSoundEnabled: false,
  showActivityIndicator: true,
  perAgentPreferences: {} as Partial<Record<AgentType, AgentNotificationPreference>>,
};

// ============================================================================
// STORE
// ============================================================================

export const useAgentPreferencesStore = create<AgentPreferencesState>()(
  persist(
    (set, get) => ({
      ...defaultGlobalPreferences,
      activeTasks: new Map(),

      // Global settings
      setGlobalMode: (mode) => set({ globalMode: mode }),

      setGlobalSoundEnabled: (enabled) => set({ globalSoundEnabled: enabled }),

      setShowActivityIndicator: (show) => set({ showActivityIndicator: show }),

      // Per-agent preferences
      setAgentPreference: (agentType, preference) =>
        set((state) => ({
          perAgentPreferences: {
            ...state.perAgentPreferences,
            [agentType]: {
              agentType,
              notificationMode: preference.notificationMode ?? state.globalMode,
              soundEnabled: preference.soundEnabled ?? state.globalSoundEnabled,
              showInActivityIndicator: preference.showInActivityIndicator ?? true,
              ...state.perAgentPreferences[agentType],
              ...preference,
            },
          },
        })),

      removeAgentPreference: (agentType) =>
        set((state) => {
          const { [agentType]: _, ...rest } = state.perAgentPreferences;
          return { perAgentPreferences: rest };
        }),

      getEffectivePreference: (agentType) => {
        const state = get();
        const agentPref = state.perAgentPreferences[agentType];

        if (agentPref) {
          return agentPref;
        }

        // Return global defaults
        return {
          agentType,
          notificationMode: state.globalMode,
          soundEnabled: state.globalSoundEnabled,
          showInActivityIndicator: true,
        };
      },

      // Activity tracking (non-persisted)
      addActiveTask: (task) =>
        set((state) => {
          const newTasks = new Map(state.activeTasks);
          newTasks.set(task.id, task);
          return { activeTasks: newTasks };
        }),

      updateActiveTask: (taskId, updates) =>
        set((state) => {
          const newTasks = new Map(state.activeTasks);
          const existing = newTasks.get(taskId);
          if (existing) {
            newTasks.set(taskId, { ...existing, ...updates });
          }
          return { activeTasks: newTasks };
        }),

      removeActiveTask: (taskId) =>
        set((state) => {
          const newTasks = new Map(state.activeTasks);
          newTasks.delete(taskId);
          return { activeTasks: newTasks };
        }),

      clearActiveTasks: () => set({ activeTasks: new Map() }),

      // Reset
      resetToDefaults: () =>
        set({
          ...defaultGlobalPreferences,
          activeTasks: new Map(),
        }),
    }),
    {
      name: 'agent-preferences-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist preferences, not active tasks
      partialize: (state) => ({
        globalMode: state.globalMode,
        globalSoundEnabled: state.globalSoundEnabled,
        showActivityIndicator: state.showActivityIndicator,
        perAgentPreferences: state.perAgentPreferences,
      }),
    }
  )
);

// ============================================================================
// HELPER HOOKS
// ============================================================================

/** Get active tasks count */
export const useActiveTasksCount = () => {
  const activeTasks = useAgentPreferencesStore((state) => state.activeTasks);
  return activeTasks.size;
};

/** Get active tasks by agent type */
export const useActiveTasksByAgent = (agentType: AgentType) => {
  const activeTasks = useAgentPreferencesStore((state) => state.activeTasks);
  return Array.from(activeTasks.values()).filter((t) => t.agentType === agentType);
};

/** Get processing tasks only */
export const useProcessingTasks = () => {
  const activeTasks = useAgentPreferencesStore((state) => state.activeTasks);
  return Array.from(activeTasks.values()).filter((t) => t.status === 'processing');
};

/** Check if user wants notifications for an agent */
export const useShouldNotify = (agentType: AgentType): boolean => {
  const pref = useAgentPreferencesStore((state) => state.getEffectivePreference(agentType));
  return pref.notificationMode === 'realtime';
};
