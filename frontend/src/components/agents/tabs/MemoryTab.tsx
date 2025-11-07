'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { agentsAPI } from '@/lib/api/agents';
import { toast } from 'sonner';
import MemoryViewer from '@/components/agents/MemoryViewer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Brain, Trash2, Download, AlertCircle } from 'lucide-react';
import type { AgentType } from '@/types/agents.types';

export default function AgentMemoryTab() {
  const { userProfile } = useAuth();
  const [selectedAgentType, setSelectedAgentType] = useState<AgentType>('secretary');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const agentTypes: { value: AgentType; label: string }[] = [
    { value: 'secretary', label: 'Document Secretary' },
    { value: 'financial', label: 'Financial Analyst' },
    { value: 'legal', label: 'Legal Analyst' },
    { value: 'compliance', label: 'Compliance Monitor' },
    { value: 'risk_assessment', label: 'Risk Assessment' },
    { value: 'vendor', label: 'Vendor Manager' },
    { value: 'analytics', label: 'Analytics Engine' },
    { value: 'notifications', label: 'Notification Manager' },
    { value: 'manager', label: 'System Manager' },
    { value: 'workflow', label: 'Workflow Engine' },
    { value: 'data-quality', label: 'Data Quality Monitor' },
    { value: 'integration', label: 'Integration Hub' },
  ];

  const handleClearMemory = async () => {
    if (!showClearConfirm) {
      setShowClearConfirm(true);
      return;
    }

    if (!userProfile?.enterprise_id) return;

    try {
      await agentsAPI.clearAgentMemory({
        agentType: selectedAgentType,
        enterpriseId: userProfile.enterprise_id,
        memoryType: 'all',
        userId: userProfile.id,
      });

      toast.success('Agent memory cleared successfully');
      setShowClearConfirm(false);
      // Trigger re-render of MemoryViewer by updating key
      window.location.reload(); // Simple approach - could use state management instead
    } catch (error) {
      console.error('Failed to clear memory:', error);
      toast.error('Failed to clear memory');
      setShowClearConfirm(false);
    }
  };

  const handleExportMemory = async () => {
    if (!userProfile?.enterprise_id) return;

    try {
      const data = await agentsAPI.exportAgentMemory({
        agentType: selectedAgentType,
        enterpriseId: userProfile.enterprise_id,
        memoryType: 'all',
      });

      // Download as JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedAgentType}-memory-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Memory exported successfully');
    } catch (error) {
      console.error('Failed to export memory:', error);
      toast.error('Failed to export memory');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Agent Selector and Actions */}
      <Card className="bg-white border-ghost-300 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 border border-purple-500/20">
              <Brain className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-purple-900 font-mono">AGENT MEMORY SYSTEM</h2>
              <p className="text-sm text-ghost-600 mt-1">
                View and manage agent memories across short-term and long-term storage
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedAgentType} onValueChange={(value) => setSelectedAgentType(value as AgentType)}>
              <SelectTrigger className="w-64 border-ghost-300 font-mono">
                <SelectValue placeholder="Select Agent" />
              </SelectTrigger>
              <SelectContent>
                {agentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value} className="font-mono">
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportMemory}
              className="border-ghost-300 hover:border-purple-500 hover:text-purple-500"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleClearMemory}
              className={`border-ghost-300 ${
                showClearConfirm
                  ? 'border-error text-error hover:bg-error hover:text-white'
                  : 'hover:border-error hover:text-error'
              }`}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {showClearConfirm ? 'Confirm Clear?' : 'Clear Memory'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Memory Consolidation Info */}
      <Card className="bg-purple-500/5 border-purple-500/20 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-purple-500 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-purple-900 mb-1 font-mono">MEMORY CONSOLIDATION</h3>
            <p className="text-xs text-ghost-700 leading-relaxed">
              Short-term memories (24-hour window) are automatically consolidated into long-term storage based on
              importance scoring and access patterns. Memories decay over time unless regularly accessed or marked
              as critical.
            </p>
          </div>
        </div>
      </Card>

      {/* Memory Viewer */}
      <MemoryViewer agentType={selectedAgentType} />
    </div>
  );
}
