'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';
import type { AgentType, AgentConfig } from '@/types/agents.types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings, Save, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ConfigurationPanelProps {
  agentType: AgentType;
}

/**
 * Configuration panel with Bloomberg Terminal aesthetic
 * Dense form layout, monospace inputs, purple/pink accents
 */
export default function ConfigurationPanel({ agentType }: ConfigurationPanelProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [config, setConfig] = useState<AgentConfig>({
    runIntervalMinutes: 60,
    retryAttempts: 3,
    timeoutMinutes: 30,
    enabled: true,
    priority: 'medium',
    customSettings: {},
  });
  const [originalConfig, setOriginalConfig] = useState<AgentConfig | null>(null);

  const enterpriseId = user?.user_metadata?.enterprise_id;

  useEffect(() => {
    loadConfiguration();
  }, [agentType, enterpriseId]);

  const loadConfiguration = async () => {
    if (!enterpriseId) return;

    try {
      // Get agent
      const { data: agentData } = await supabase
        .from('agents')
        .select('id, config')
        .eq('enterprise_id', enterpriseId)
        .eq('type', agentType)
        .single();

      if (agentData) {
        setAgentId(agentData.id);
        const loadedConfig = (agentData.config as AgentConfig) || {};
        const mergedConfig = {
          runIntervalMinutes: loadedConfig.runIntervalMinutes ?? 60,
          retryAttempts: loadedConfig.retryAttempts ?? 3,
          timeoutMinutes: loadedConfig.timeoutMinutes ?? 30,
          enabled: loadedConfig.enabled ?? true,
          priority: loadedConfig.priority ?? 'medium',
          customSettings: loadedConfig.customSettings ?? {},
        };
        setConfig(mergedConfig);
        setOriginalConfig(mergedConfig);
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!agentId) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('agents')
        .update({ config: config })
        .eq('id', agentId);

      if (error) throw error;

      setOriginalConfig(config);
      toast.success('Configuration saved successfully');
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (originalConfig) {
      setConfig({ ...originalConfig });
      toast.success('Configuration reset');
    }
  };

  const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);

  if (loading) {
    return (
      <Card className="bg-white border-ghost-300 p-6">
        <div className="text-center py-12 text-text-muted">Loading configuration...</div>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-ghost-300">
      {/* Header */}
      <div className="border-b border-ghost-300 px-6 py-4 bg-ghost-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-purple-500" />
          <h3 className="text-sm font-semibold text-text-primary">Agent Configuration</h3>
        </div>

        {hasChanges && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              className="border-ghost-300"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="bg-purple-900 text-white hover:bg-purple-800"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Configuration Form */}
      <div className="p-6 space-y-6">
        {/* Basic Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-text-primary border-b border-ghost-200 pb-2">
            Basic Settings
          </h4>

          <div className="grid grid-cols-2 gap-6">
            {/* Enabled Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-text-primary">Agent Enabled</Label>
                <p className="text-xs text-text-tertiary mt-1">
                  Enable or disable this agent globally
                </p>
              </div>
              <Switch
                checked={config.enabled ?? true}
                onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
              />
            </div>

            {/* Run Interval */}
            <div className="space-y-2">
              <Label htmlFor="runInterval" className="text-sm font-medium text-text-primary">
                Run Interval (minutes)
              </Label>
              <Input
                id="runInterval"
                type="number"
                value={config.runIntervalMinutes}
                onChange={(e) =>
                  setConfig({ ...config, runIntervalMinutes: parseInt(e.target.value) || 60 })
                }
                className="border-ghost-300 font-mono"
                min="1"
              />
              <p className="text-xs text-text-tertiary">How often the agent runs automatically</p>
            </div>

            {/* Retry Attempts */}
            <div className="space-y-2">
              <Label htmlFor="retryAttempts" className="text-sm font-medium text-text-primary">
                Retry Attempts
              </Label>
              <Input
                id="retryAttempts"
                type="number"
                value={config.retryAttempts}
                onChange={(e) =>
                  setConfig({ ...config, retryAttempts: parseInt(e.target.value) || 3 })
                }
                className="border-ghost-300 font-mono"
                min="0"
                max="10"
              />
              <p className="text-xs text-text-tertiary">Number of retry attempts on failure</p>
            </div>

            {/* Timeout */}
            <div className="space-y-2">
              <Label htmlFor="timeout" className="text-sm font-medium text-text-primary">
                Timeout (minutes)
              </Label>
              <Input
                id="timeout"
                type="number"
                value={config.timeoutMinutes}
                onChange={(e) =>
                  setConfig({ ...config, timeoutMinutes: parseInt(e.target.value) || 30 })
                }
                className="border-ghost-300 font-mono"
                min="1"
              />
              <p className="text-xs text-text-tertiary">Maximum execution time per task</p>
            </div>
          </div>
        </div>

        {/* Agent-Specific Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-text-primary border-b border-ghost-200 pb-2">
            Agent-Specific Settings
          </h4>

          {agentType === 'legal' && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-text-primary">
                  Auto Review Enabled
                </Label>
                <Switch
                  checked={
                    config.customSettings?.autoReviewEnabled !== undefined
                      ? Boolean(config.customSettings?.autoReviewEnabled)
                      : true
                  }
                  onCheckedChange={(checked) =>
                    setConfig({
                      ...config,
                      customSettings: { ...config.customSettings, autoReviewEnabled: checked },
                    })
                  }
                />
                <p className="text-xs text-text-tertiary">Automatically review new contracts</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-text-primary">Risk Threshold</Label>
                <Input
                  type="number"
                  value={
                    config.customSettings?.riskThreshold !== undefined
                      ? String(config.customSettings?.riskThreshold)
                      : '7'
                  }
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      customSettings: {
                        ...config.customSettings,
                        riskThreshold: parseInt(e.target.value) || 7,
                      },
                    })
                  }
                  className="border-ghost-300 font-mono"
                  min="1"
                  max="10"
                />
                <p className="text-xs text-text-tertiary">Minimum risk score for alerts (1-10)</p>
              </div>
            </div>
          )}

          {agentType === 'financial' && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-text-primary">
                  Currency Conversion
                </Label>
                <Switch
                  checked={
                    config.customSettings?.currencyConversion !== undefined
                      ? Boolean(config.customSettings?.currencyConversion)
                      : true
                  }
                  onCheckedChange={(checked) =>
                    setConfig({
                      ...config,
                      customSettings: { ...config.customSettings, currencyConversion: checked },
                    })
                  }
                />
                <p className="text-xs text-text-tertiary">Enable multi-currency support</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-text-primary">Analysis Depth</Label>
                <select
                  value={
                    config.customSettings?.analysisDepth
                      ? String(config.customSettings?.analysisDepth)
                      : 'detailed'
                  }
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      customSettings: { ...config.customSettings, analysisDepth: e.target.value },
                    })
                  }
                  className="w-full h-9 px-3 border border-ghost-300 bg-white font-mono text-sm"
                >
                  <option value="basic">Basic</option>
                  <option value="detailed">Detailed</option>
                  <option value="comprehensive">Comprehensive</option>
                </select>
                <p className="text-xs text-text-tertiary">Level of financial analysis detail</p>
              </div>
            </div>
          )}

          {agentType === 'notifications' && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-text-primary">Email Enabled</Label>
                <Switch
                  checked={
                    config.customSettings?.emailEnabled !== undefined
                      ? Boolean(config.customSettings?.emailEnabled)
                      : true
                  }
                  onCheckedChange={(checked) =>
                    setConfig({
                      ...config,
                      customSettings: { ...config.customSettings, emailEnabled: checked },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-text-primary">Slack Enabled</Label>
                <Switch
                  checked={
                    config.customSettings?.slackEnabled !== undefined
                      ? Boolean(config.customSettings?.slackEnabled)
                      : false
                  }
                  onCheckedChange={(checked) =>
                    setConfig({
                      ...config,
                      customSettings: { ...config.customSettings, slackEnabled: checked },
                    })
                  }
                />
              </div>
            </div>
          )}

          {!['legal', 'financial', 'notifications'].includes(agentType) && (
            <div className="text-sm text-text-muted text-center py-4">
              No agent-specific settings available for this agent type.
            </div>
          )}
        </div>

        {/* Advanced Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-text-primary border-b border-ghost-200 pb-2">
            Advanced Settings
          </h4>

          <div className="bg-ghost-100 border border-ghost-300 p-4">
            <p className="text-xs text-text-muted mb-2 uppercase tracking-wider">
              Raw Configuration (JSON)
            </p>
            <pre className="font-mono text-xs text-text-secondary overflow-x-auto">
              {JSON.stringify(config, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      {/* Footer */}
      {hasChanges && (
        <div className="border-t border-ghost-300 px-6 py-4 bg-warning/5 flex items-center justify-between">
          <div className="text-sm text-text-secondary">
            ⚠️ You have unsaved changes. Remember to save your configuration.
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-purple-900 text-white hover:bg-purple-800"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Configuration
              </>
            )}
          </Button>
        </div>
      )}
    </Card>
  );
}
