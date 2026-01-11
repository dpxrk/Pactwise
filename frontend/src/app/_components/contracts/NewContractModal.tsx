'use client';

import { FileText, Sparkles, X } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

interface ContractTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  usageCount: number;
}

interface NewContractModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContractCreated?: () => void;
}

export function NewContractModal({
  open,
  onOpenChange,
  onContractCreated,
}: NewContractModalProps) {
  const { userProfile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [contractDetails, setContractDetails] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch templates from Supabase
  const { data: templatesData } = useQuery({
    queryKey: ['contract-templates', userProfile?.enterprise_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_templates')
        .select('id, name, description, category, usage_count')
        .order('usage_count', { ascending: false })
        .limit(10);

      if (error) throw error;

      return (data || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category || 'General',
        usageCount: t.usage_count || 0,
      }));
    },
    enabled: open,
  });

  // Fallback to sample templates if no templates found
  const templates: ContractTemplate[] = templatesData?.length ? templatesData : [
        {
          id: '1',
          name: 'Software License Agreement',
          description: 'Standard SaaS software licensing agreement',
          category: 'Technology',
          usageCount: 45,
        },
        {
          id: '2',
          name: 'Service Agreement',
          description: 'Professional services contract template',
          category: 'Services',
          usageCount: 32,
        },
        {
          id: '3',
          name: 'NDA (Mutual)',
          description: 'Mutual non-disclosure agreement',
          category: 'Legal',
          usageCount: 67,
        },
        {
          id: '4',
          name: 'Consulting Agreement',
          description: 'Independent contractor consulting contract',
          category: 'Services',
          usageCount: 28,
        },
        {
          id: '5',
          name: 'Master Service Agreement',
          description: 'MSA for ongoing vendor relationships',
          category: 'Procurement',
          usageCount: 51,
        },
        {
          id: '6',
          name: 'Purchase Order',
          description: 'Standard purchase order template',
          category: 'Procurement',
          usageCount: 89,
        },
      ];

  // Create contract mutation
  const createContractMutation = useMutation({
    mutationFn: async (data: { templateId: string; details: string }) => {
      if (!userProfile?.enterprise_id) throw new Error('No enterprise ID');

      const selectedTemplate = templates.find(t => t.id === data.templateId);

      const { data: contract, error } = await (supabase as any)
        .from('contracts')
        .insert({
          enterprise_id: userProfile.enterprise_id,
          title: `${selectedTemplate?.name || 'New Contract'} - ${new Date().toLocaleDateString()}`,
          description: data.details,
          template_id: data.templateId,
          status: 'draft',
          created_by: userProfile.id,
          updated_by: userProfile.id,
        })
        .select()
        .single();

      if (error) throw error;
      return contract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contract created successfully!');

      // Reset form
      setSelectedTemplateId(null);
      setContractDetails('');

      // Close modal
      onOpenChange(false);

      // Trigger refresh
      onContractCreated?.();
    },
    onError: (error: Error) => {
      console.error('Error creating contract:', error);
      toast.error('Failed to create contract. Please try again.');
    },
  });

  const handleCreateContract = async () => {
    if (!selectedTemplateId) {
      toast.error('Please select a template');
      return;
    }

    if (!contractDetails.trim()) {
      toast.error('Please provide contract details');
      return;
    }

    setIsLoading(true);

    try {
      await createContractMutation.mutateAsync({
        templateId: selectedTemplateId,
        details: contractDetails.trim(),
      });
    } catch (error) {
      // Error handled by mutation
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedTemplateId(null);
    setContractDetails('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-ghost-50">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-purple-900">
            Create New Contract
          </DialogTitle>
          <DialogDescription className="text-ghost-600">
            Select a template from your bank and provide contract details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Template Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold text-ghost-900">
              Select Template
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplateId(template.id)}
                  className={cn(
                    'group relative p-4 border-2 text-left transition-all duration-200',
                    'hover:border-purple-500 hover:shadow-md',
                    selectedTemplateId === template.id
                      ? 'border-purple-900 bg-purple-50 shadow-md'
                      : 'border-ghost-300 bg-white'
                  )}
                >
                  {/* Selection indicator */}
                  {selectedTemplateId === template.id && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-purple-900 flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'p-2 transition-colors',
                        selectedTemplateId === template.id
                          ? 'bg-purple-100'
                          : 'bg-ghost-100 group-hover:bg-purple-50'
                      )}
                    >
                      <FileText
                        className={cn(
                          'h-5 w-5 transition-colors',
                          selectedTemplateId === template.id
                            ? 'text-purple-900'
                            : 'text-ghost-600 group-hover:text-purple-900'
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4
                        className={cn(
                          'font-semibold text-sm mb-1 transition-colors',
                          selectedTemplateId === template.id
                            ? 'text-purple-900'
                            : 'text-ghost-900 group-hover:text-purple-900'
                        )}
                      >
                        {template.name}
                      </h4>
                      {template.description && (
                        <p className="text-xs text-ghost-600 line-clamp-2 mb-2">
                          {template.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-ghost-500">
                        <span className="px-2 py-0.5 bg-ghost-100 text-ghost-700 font-mono">
                          {template.category}
                        </span>
                        <span>•</span>
                        <span>Used {template.usageCount}×</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Contract Details Input */}
          <div className="space-y-3">
            <Label htmlFor="contract-details" className="text-base font-semibold text-ghost-900">
              Provide Contract Details
            </Label>
            <Textarea
              id="contract-details"
              value={contractDetails}
              onChange={(e) => setContractDetails(e.target.value)}
              placeholder="Describe the key details of this contract...

Example:
- Vendor: Acme Software Inc.
- Service: Cloud hosting and support
- Contract value: $50,000 annually
- Start date: January 1, 2025
- Duration: 12 months with auto-renewal
- Key terms: 99.9% uptime SLA, 24/7 support
- Special requirements: GDPR compliance, quarterly reviews"
              className="min-h-[200px] font-mono text-sm bg-white border-ghost-300 focus:border-purple-500 focus:ring-purple-500"
              disabled={!selectedTemplateId}
            />
            {!selectedTemplateId && (
              <p className="text-xs text-ghost-500 flex items-center gap-1">
                <span>Select a template above to provide contract details</span>
              </p>
            )}
            {selectedTemplateId && (
              <p className="text-xs text-purple-700 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                <span>AI will generate a contract based on your selected template and these details</span>
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            className="border-ghost-300 text-ghost-700 hover:bg-ghost-100"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleCreateContract}
            disabled={!selectedTemplateId || !contractDetails.trim() || isLoading}
            className="bg-purple-900 hover:bg-purple-800 text-white"
          >
            {isLoading ? (
              <>
                <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                Creating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Create Contract
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
