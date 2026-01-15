'use client';

import {
  Bot,
  FileSearch,
  Scale,
  DollarSign,
  Building2,
  BarChart3,
  Shield,
  Bell,
  Workflow,
  Brain,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import React from 'react';

import { useToast } from '@/components/premium/Toast';
import { useAgentPreferencesStore } from '@/stores/agentPreferencesStore';
import type { AgentType } from '@/types/agents.types';

// ============================================================================
// AGENT METADATA
// ============================================================================

const agentIcons: Record<AgentType, React.ComponentType<{ className?: string }>> = {
  manager: Workflow,
  theory_of_mind_manager: Brain,
  workflow: Workflow,
  secretary: FileSearch,
  continual_secretary: FileSearch,
  metacognitive_secretary: FileSearch,
  legal: Scale,
  compliance: Shield,
  risk_assessment: Shield,
  financial: DollarSign,
  causal_financial: DollarSign,
  quantum_financial: DollarSign,
  vendor: Building2,
  analytics: BarChart3,
  notifications: Bell,
  'data-quality': BarChart3,
  integration: Workflow,
};

const agentLabels: Record<AgentType, string> = {
  manager: 'Manager Agent',
  theory_of_mind_manager: 'Theory of Mind Manager',
  workflow: 'Workflow Agent',
  secretary: 'Secretary Agent',
  continual_secretary: 'Learning Secretary',
  metacognitive_secretary: 'Metacognitive Secretary',
  legal: 'Legal Agent',
  compliance: 'Compliance Agent',
  risk_assessment: 'Risk Assessment Agent',
  financial: 'Financial Agent',
  causal_financial: 'Causal Financial Agent',
  quantum_financial: 'Quantum Financial Agent',
  vendor: 'Vendor Agent',
  analytics: 'Analytics Agent',
  notifications: 'Notifications Agent',
  'data-quality': 'Data Quality Agent',
  integration: 'Integration Agent',
};

// ============================================================================
// AGENT TOAST HOOK
// ============================================================================

interface AgentToastOptions {
  agentType: AgentType;
  taskType: string;
  status: 'started' | 'completed' | 'failed';
  message?: string;
  contractTitle?: string;
  vendorName?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function useAgentToast() {
  const { toast } = useToast();
  const { getEffectivePreference, globalMode } = useAgentPreferencesStore();

  const showAgentToast = (options: AgentToastOptions) => {
    const {
      agentType,
      taskType,
      status,
      message,
      contractTitle,
      vendorName,
      duration = 4000,
      action,
    } = options;

    // Check if we should show notification
    const pref = getEffectivePreference(agentType);
    if (pref.notificationMode === 'silent' || globalMode === 'silent') {
      return;
    }

    // Build context string
    const contextParts: string[] = [];
    if (contractTitle) contextParts.push(`Contract: ${contractTitle}`);
    if (vendorName) contextParts.push(`Vendor: ${vendorName}`);
    const contextString = contextParts.length > 0 ? contextParts.join(' | ') : undefined;

    // Determine toast type and title based on status
    const toastConfig = {
      started: {
        type: 'info' as const,
        title: `${agentLabels[agentType]} Started`,
        description: message || `Processing: ${taskType.replace(/_/g, ' ')}`,
      },
      completed: {
        type: 'success' as const,
        title: `${agentLabels[agentType]} Complete`,
        description: message || `Finished: ${taskType.replace(/_/g, ' ')}`,
      },
      failed: {
        type: 'error' as const,
        title: `${agentLabels[agentType]} Failed`,
        description: message || `Error in: ${taskType.replace(/_/g, ' ')}`,
      },
    };

    const config = toastConfig[status];

    toast({
      type: config.type,
      title: config.title,
      description: contextString ? `${config.description}\n${contextString}` : config.description,
      duration,
      action,
    });

    // Play sound if enabled
    if (pref.soundEnabled && status !== 'started') {
      playNotificationSound(status === 'completed' ? 'success' : 'error');
    }
  };

  // Convenience methods
  const notifyTaskStarted = (
    agentType: AgentType,
    taskType: string,
    context?: { contractTitle?: string; vendorName?: string }
  ) => {
    showAgentToast({
      agentType,
      taskType,
      status: 'started',
      ...context,
    });
  };

  const notifyTaskCompleted = (
    agentType: AgentType,
    taskType: string,
    message?: string,
    context?: { contractTitle?: string; vendorName?: string },
    action?: { label: string; onClick: () => void }
  ) => {
    showAgentToast({
      agentType,
      taskType,
      status: 'completed',
      message,
      action,
      ...context,
    });
  };

  const notifyTaskFailed = (
    agentType: AgentType,
    taskType: string,
    errorMessage?: string,
    context?: { contractTitle?: string; vendorName?: string }
  ) => {
    showAgentToast({
      agentType,
      taskType,
      status: 'failed',
      message: errorMessage,
      duration: 6000, // Longer duration for errors
      ...context,
    });
  };

  return {
    showAgentToast,
    notifyTaskStarted,
    notifyTaskCompleted,
    notifyTaskFailed,
  };
}

// ============================================================================
// SOUND EFFECTS
// ============================================================================

function playNotificationSound(type: 'success' | 'error') {
  if (typeof window === 'undefined') return;

  // Use Web Audio API for lightweight notification sounds
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (type === 'success') {
      // Pleasant ascending tone
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    } else {
      // Descending tone for error
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
      oscillator.frequency.setValueAtTime(349.23, audioContext.currentTime + 0.1); // F4
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    }

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch {
    // Silently fail if audio not available
  }
}

// ============================================================================
// AGENT TOAST CONTENT COMPONENT
// ============================================================================

interface AgentToastContentProps {
  agentType: AgentType;
  status: 'processing' | 'completed' | 'failed';
  message: string;
}

export const AgentToastContent: React.FC<AgentToastContentProps> = ({
  agentType,
  status,
  message,
}) => {
  const Icon = agentIcons[agentType] || Bot;

  const statusIcon = {
    processing: <Loader2 className="h-4 w-4 animate-spin text-purple-500" />,
    completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    failed: <XCircle className="h-4 w-4 text-red-500" />,
  };

  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 p-1.5 rounded-md bg-purple-50">
        <Icon className="h-4 w-4 text-purple-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-ghost-800">
            {agentLabels[agentType]}
          </span>
          {statusIcon[status]}
        </div>
        <p className="text-xs text-ghost-500 mt-0.5 line-clamp-2">{message}</p>
      </div>
    </div>
  );
};

export default useAgentToast;
