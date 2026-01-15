'use client';

import { PlayCircle, Loader2 } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { agentsAPI } from '@/lib/api/agents';
import type { AgentTaskPayload } from '@/types/agent-tasks.types';
import type { AgentType } from '@/types/agents.types';


interface TaskSubmissionFormProps {
  agentType: AgentType;
  onTaskCreated?: (taskId: string) => void;
}

/**
 * Dynamic task submission form for agents
 * Bloomberg Terminal aesthetic: Dense, monospace data, sharp edges
 */
export default function TaskSubmissionForm({ agentType, onTaskCreated }: TaskSubmissionFormProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    action: '',
    contractId: '',
    vendorId: '',
    documentText: '',
    scheduledFor: '',
    // Add more fields as needed
  });

  const enterpriseId = user?.user_metadata?.enterprise_id;
  const userId = user?.id;

  // Get action options based on agent type
  const getActionOptions = (): Array<{ value: string; label: string }> => {
    switch (agentType) {
      case 'secretary':
        return [
          { value: 'process_contract_document', label: 'Process Contract Document' },
          { value: 'process_vendor_document', label: 'Process Vendor Document' },
          { value: 'process_general_document', label: 'Process General Document' },
          { value: 'extract_clauses', label: 'Extract Clauses' },
          { value: 'detect_language', label: 'Detect Language' },
          { value: 'extract_certifications', label: 'Extract Certifications' },
          { value: 'update_metadata', label: 'Update Metadata' },
          { value: 'ocr_analysis', label: 'OCR Analysis' },
        ];
      case 'legal':
        return [
          { value: 'analyze_contract', label: 'Analyze Contract' },
          { value: 'analyze_vendor_compliance', label: 'Vendor Compliance Review' },
          { value: 'enterprise_compliance', label: 'Enterprise Compliance Audit' },
          { value: 'extract_clauses', label: 'Extract Legal Clauses' },
          { value: 'check_vendor_compliance', label: 'Check Vendor Compliance' },
          { value: 'check_missing_documents', label: 'Check Missing Documents' },
          { value: 'validate_certifications', label: 'Validate Certifications' },
          { value: 'analyze_nda', label: 'Analyze NDA' },
          { value: 'process_approval', label: 'Process Approval' },
        ];
      case 'financial':
        return [
          { value: 'analyze_contract_financials', label: 'Analyze Contract Financials' },
          { value: 'analyze_vendor_financials', label: 'Analyze Vendor Financials' },
          { value: 'analyze_budget', label: 'Analyze Budget Impact' },
          { value: 'analyze_spend_metrics', label: 'Analyze Spend Metrics' },
          { value: 'variance_analysis', label: 'Variance Analysis' },
          { value: 'calculate_roi', label: 'Calculate ROI' },
          { value: 'identify_savings', label: 'Identify Savings' },
          { value: 'forecast_spending', label: 'Forecast Spending' },
          { value: 'optimize_budget', label: 'Optimize Budget' },
        ];
      case 'manager':
        return [
          { value: 'analyze_request', label: 'Analyze Request' },
          { value: 'create_orchestration', label: 'Create Orchestration Plan' },
          { value: 'route_to_agents', label: 'Route to Agents' },
          { value: 'decompose_task', label: 'Decompose Complex Task' },
          { value: 'track_progress', label: 'Track Progress' },
          { value: 'coordinate_workflow', label: 'Coordinate Workflow' },
          { value: 'monitor_health', label: 'Monitor System Health' },
          { value: 'prioritize_queue', label: 'Prioritize Queue' },
        ];
      case 'workflow':
        return [
          { value: 'execute_workflow', label: 'Execute Workflow' },
          { value: 'execute_step', label: 'Execute Step' },
          { value: 'evaluate_condition', label: 'Evaluate Condition' },
          { value: 'execute_parallel', label: 'Execute Parallel Steps' },
          { value: 'manage_approval', label: 'Manage Approval' },
          { value: 'attempt_rollback', label: 'Attempt Rollback' },
        ];
      case 'vendor':
        return [
          { value: 'analyze_vendor', label: 'Analyze Vendor' },
          { value: 'evaluate_new_vendor', label: 'Evaluate New Vendor' },
          { value: 'assess_performance', label: 'Assess Performance' },
          { value: 'track_performance', label: 'Track Performance' },
          { value: 'monitor_sla', label: 'Monitor SLA' },
          { value: 'assess_health', label: 'Assess Health' },
          { value: 'generate_scorecard', label: 'Generate Scorecard' },
          { value: 'assess_risk', label: 'Assess Risk' },
        ];
      case 'analytics':
        return [
          { value: 'analyze_contract_metrics', label: 'Analyze Contract Metrics' },
          { value: 'analyze_vendor_performance', label: 'Analyze Vendor Performance' },
          { value: 'analyze_spending', label: 'Analyze Spending' },
          { value: 'forecast_budget', label: 'Forecast Budget' },
          { value: 'identify_trends', label: 'Identify Trends' },
          { value: 'generate_predictions', label: 'Generate Predictions' },
          { value: 'create_dashboard', label: 'Create Dashboard' },
          { value: 'generate_executive_summary', label: 'Generate Executive Summary' },
        ];
      case 'compliance':
        return [
          { value: 'full_compliance_audit', label: 'Full Compliance Audit' },
          { value: 'check_vendor_compliance', label: 'Check Vendor Compliance' },
          { value: 'check_data_compliance', label: 'Check Data Compliance' },
          { value: 'check_contract_compliance', label: 'Check Contract Compliance' },
          { value: 'audit_gdpr', label: 'GDPR Audit' },
          { value: 'audit_hipaa', label: 'HIPAA Audit' },
          { value: 'audit_soc2', label: 'SOC2 Audit' },
          { value: 'monitor_compliance', label: 'Monitor Compliance' },
          { value: 'generate_compliance_report', label: 'Generate Report' },
        ];
      case 'risk_assessment':
        return [
          { value: 'assess_contract_risk', label: 'Assess Contract Risk' },
          { value: 'assess_vendor_risk', label: 'Assess Vendor Risk' },
          { value: 'assess_financial_risk', label: 'Assess Financial Risk' },
          { value: 'assess_compliance_risk', label: 'Assess Compliance Risk' },
          { value: 'analyze_vulnerability', label: 'Analyze Vulnerability' },
          { value: 'recommend_mitigation', label: 'Recommend Mitigation' },
          { value: 'generate_risk_report', label: 'Generate Risk Report' },
        ];
      case 'notifications':
        return [
          { value: 'create_alert', label: 'Create Alert' },
          { value: 'schedule_reminder', label: 'Schedule Reminder' },
          { value: 'send_expiry_alert', label: 'Send Expiry Alert' },
          { value: 'send_compliance_reminder', label: 'Send Compliance Reminder' },
          { value: 'send_budget_alert', label: 'Send Budget Alert' },
          { value: 'send_approval_notification', label: 'Send Approval Notification' },
          { value: 'escalate', label: 'Escalate Issue' },
        ];
      case 'data-quality':
        return [
          { value: 'validate_records', label: 'Validate Records' },
          { value: 'assess_quality', label: 'Assess Quality' },
          { value: 'detect_anomalies', label: 'Detect Anomalies' },
          { value: 'clean_duplicates', label: 'Clean Duplicates' },
          { value: 'standardize_format', label: 'Standardize Format' },
          { value: 'enrich_data', label: 'Enrich Data' },
          { value: 'generate_quality_report', label: 'Generate Quality Report' },
        ];
      case 'integration':
        return [
          { value: 'process_webhook', label: 'Process Webhook' },
          { value: 'call_api', label: 'Call API' },
          { value: 'sync_data', label: 'Sync Data' },
          { value: 'sync_erp', label: 'Sync with ERP' },
          { value: 'import_sap', label: 'Import from SAP' },
          { value: 'export_accounting', label: 'Export to Accounting' },
          { value: 'connect_vendor_api', label: 'Connect Vendor API' },
        ];
      case 'continual_secretary':
        return [
          { value: 'learn_pattern', label: 'Learn Pattern' },
          { value: 'learn_preferences', label: 'Learn Preferences' },
          { value: 'optimize_extraction', label: 'Optimize Extraction' },
          { value: 'improve_categorization', label: 'Improve Categorization' },
          { value: 'process_contract_document', label: 'Process Contract Document' },
        ];
      case 'metacognitive_secretary':
        return [
          { value: 'monitor_confidence', label: 'Monitor Confidence' },
          { value: 'adjust_strategy', label: 'Adjust Strategy' },
          { value: 'track_cognitive_load', label: 'Track Cognitive Load' },
          { value: 'calibrate_confidence', label: 'Calibrate Confidence' },
          { value: 'process_contract_document', label: 'Process Contract Document' },
        ];
      case 'causal_financial':
        return [
          { value: 'identify_root_causes', label: 'Identify Root Causes' },
          { value: 'predict_interventions', label: 'Predict Interventions' },
          { value: 'generate_counterfactuals', label: 'Generate Counterfactuals' },
          { value: 'recommend_optimizations', label: 'Recommend Optimizations' },
          { value: 'analyze_causality', label: 'Analyze Causality' },
        ];
      case 'quantum_financial':
        return [
          { value: 'optimize_portfolio', label: 'Optimize Portfolio' },
          { value: 'handle_constraints', label: 'Handle Complex Constraints' },
          { value: 'forecast_volatility', label: 'Forecast Volatility' },
          { value: 'price_derivatives', label: 'Price Derivatives' },
          { value: 'quantum_simulation', label: 'Quantum Simulation' },
        ];
      case 'theory_of_mind_manager':
        return [
          { value: 'model_mental_states', label: 'Model Mental States' },
          { value: 'recognize_intentions', label: 'Recognize Intentions' },
          { value: 'detect_conflicts', label: 'Detect Conflicts' },
          { value: 'build_trust', label: 'Build Trust' },
          { value: 'predict_needs', label: 'Predict Needs' },
        ];
      default:
        return [{ value: 'process', label: 'Process Task' }];
    }
  };

  // Check if field should be shown for current agent type
  const shouldShowField = (field: string): boolean => {
    const fieldMap: Record<string, AgentType[]> = {
      contractId: ['secretary', 'legal', 'financial', 'compliance', 'risk_assessment', 'analytics', 'continual_secretary', 'metacognitive_secretary'],
      vendorId: ['vendor', 'financial', 'risk_assessment', 'compliance', 'analytics', 'secretary'],
      budgetId: ['financial', 'analytics', 'causal_financial', 'quantum_financial'],
      documentText: ['secretary', 'continual_secretary', 'metacognitive_secretary', 'legal', 'data-quality'],
      workflowId: ['workflow', 'manager', 'theory_of_mind_manager'],
      framework: ['compliance'],
      channels: ['notifications'],
      dataType: ['data-quality', 'analytics'],
    };

    return fieldMap[field]?.includes(agentType) ?? false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId || !enterpriseId) {
      toast.error('User not authenticated');
      return;
    }

    if (!formData.action) {
      toast.error('Please select an action');
      return;
    }

    setIsSubmitting(true);

    try {
      // Build payload based on agent type
      const payload: AgentTaskPayload = {
        action: formData.action as never, // Type assertion for dynamic action
        priority: formData.priority,
        ...(formData.contractId && { contractId: formData.contractId }),
        ...(formData.vendorId && { vendorId: formData.vendorId }),
        ...(formData.documentText && { documentText: formData.documentText }),
        ...(formData.scheduledFor && { scheduledFor: new Date(formData.scheduledFor).toISOString() }),
      };

      // Create task
      const task = await agentsAPI.createAgentTask({
        type: agentType,
        data: payload,
        priority: formData.priority === 'low' ? 1 : formData.priority === 'medium' ? 5 : formData.priority === 'high' ? 8 : 10,
        userId,
        enterpriseId,
      });

      toast.success('Task submitted successfully');

      // Reset form
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        action: '',
        contractId: '',
        vendorId: '',
        documentText: '',
        scheduledFor: '',
      });

      if (onTaskCreated) {
        onTaskCreated(task.id);
      }
    } catch (error) {
      console.error('Error submitting task:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const actionOptions = getActionOptions();

  return (
    <Card className="bg-white border-ghost-300 p-6">
      <h3 className="text-lg font-semibold text-purple-900 mb-4">Submit New Task</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Action Selection - REQUIRED */}
        <div className="space-y-2">
          <Label htmlFor="action" className="text-sm font-medium text-text-primary">
            Action <span className="text-error">*</span>
          </Label>
          <Select
            value={formData.action}
            onValueChange={(value) => setFormData({ ...formData, action: value })}
          >
            <SelectTrigger className="border-ghost-300 bg-white">
              <SelectValue placeholder="Select action" />
            </SelectTrigger>
            <SelectContent>
              {actionOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Priority Selection */}
        <div className="space-y-2">
          <Label htmlFor="priority" className="text-sm font-medium text-text-primary">
            Priority
          </Label>
          <Select
            value={formData.priority}
            onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') =>
              setFormData({ ...formData, priority: value })
            }
          >
            <SelectTrigger className="border-ghost-300 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">
                <span className="text-ghost-600">● Low</span>
              </SelectItem>
              <SelectItem value="medium">
                <span className="text-purple-500">● Medium</span>
              </SelectItem>
              <SelectItem value="high">
                <span className="text-warning">● High</span>
              </SelectItem>
              <SelectItem value="critical">
                <span className="text-error">● Critical</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-sm font-medium text-text-primary">
            Task Title
          </Label>
          <Input
            id="title"
            placeholder="Enter task title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="border-ghost-300 bg-white font-mono text-sm"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium text-text-primary">
            Description
          </Label>
          <Textarea
            id="description"
            placeholder="Provide task details..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="border-ghost-300 bg-white font-mono text-sm min-h-[80px]"
          />
        </div>

        {/* Contract ID - Show for relevant agents */}
        {shouldShowField('contractId') && (
          <div className="space-y-2">
            <Label htmlFor="contractId" className="text-sm font-medium text-text-primary">
              Contract ID
            </Label>
            <Input
              id="contractId"
              placeholder="contract_xxxxx"
              value={formData.contractId}
              onChange={(e) => setFormData({ ...formData, contractId: e.target.value })}
              className="border-ghost-300 bg-white font-mono text-sm"
            />
          </div>
        )}

        {/* Vendor ID - Show for relevant agents */}
        {shouldShowField('vendorId') && (
          <div className="space-y-2">
            <Label htmlFor="vendorId" className="text-sm font-medium text-text-primary">
              Vendor ID
            </Label>
            <Input
              id="vendorId"
              placeholder="vendor_xxxxx"
              value={formData.vendorId}
              onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
              className="border-ghost-300 bg-white font-mono text-sm"
            />
          </div>
        )}

        {/* Document Text - Show for secretary agents */}
        {shouldShowField('documentText') && (
          <div className="space-y-2">
            <Label htmlFor="documentText" className="text-sm font-medium text-text-primary">
              Document Text
            </Label>
            <Textarea
              id="documentText"
              placeholder="Paste document content here..."
              value={formData.documentText}
              onChange={(e) => setFormData({ ...formData, documentText: e.target.value })}
              className="border-ghost-300 bg-white font-mono text-xs min-h-[120px]"
            />
          </div>
        )}

        {/* Scheduled For - Optional */}
        <div className="space-y-2">
          <Label htmlFor="scheduledFor" className="text-sm font-medium text-text-primary">
            Schedule For (Optional)
          </Label>
          <Input
            id="scheduledFor"
            type="datetime-local"
            value={formData.scheduledFor}
            onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
            className="border-ghost-300 bg-white font-mono text-sm"
          />
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-ghost-300">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setFormData({
                title: '',
                description: '',
                priority: 'medium',
                action: '',
                contractId: '',
                vendorId: '',
                documentText: '',
                scheduledFor: '',
              })
            }
            className="border-ghost-300 text-text-secondary"
          >
            Reset
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !formData.action}
            className="bg-purple-900 text-white hover:bg-purple-800"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4 mr-2" />
                Submit Task
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
