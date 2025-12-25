'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  GitBranch,
  Save,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateApprovalMatrix } from '@/hooks/queries/useApprovals';
import {
  appliesToLabels,
  type AppliesTo,
} from '@/types/approvals.types';

// ============================================================================
// NEW APPROVAL MATRIX PAGE
// ============================================================================

export default function NewApprovalMatrixPage() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const enterpriseId = userProfile?.enterprise_id;
  const userId = userProfile?.id;

  const createMutation = useCreateApprovalMatrix();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    applies_to: 'contracts' as AppliesTo,
    is_default: false,
    priority: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.applies_to) {
      newErrors.applies_to = 'Please select what this matrix applies to';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || !enterpriseId || !userId) return;

    try {
      const matrix = await createMutation.mutateAsync({
        enterpriseId,
        userId,
        data: formData,
      });

      router.push(`/dashboard/settings/approvals/${matrix.id}`);
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (!enterpriseId) {
    return (
      <div className="min-h-screen bg-ghost-100 flex items-center justify-center">
        <p className="font-mono text-sm text-ghost-600">No enterprise selected</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Top Status Bar */}
      <div className="border-b border-ghost-300 bg-white px-6 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard/settings/approvals')}
              className="p-2 hover:bg-ghost-100"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-purple-500 animate-pulse" />
              <span className="font-mono text-xs text-ghost-700 uppercase">
                NEW APPROVAL MATRIX
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="border border-ghost-300 bg-white p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100">
              <GitBranch className="h-6 w-6 text-purple-900" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-purple-900 mb-1">
                Create Approval Matrix
              </h1>
              <p className="font-mono text-xs text-ghost-600 uppercase">
                Define a new approval workflow
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="border border-ghost-300 bg-white p-6 space-y-6">
            {/* Name */}
            <div>
              <label className="block font-mono text-xs font-semibold text-ghost-700 uppercase mb-2">
                Matrix Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., High Value Contract Approvals"
                className={`w-full px-4 py-3 border font-mono text-sm focus:border-purple-900 focus:outline-none ${
                  errors.name ? 'border-red-500' : 'border-ghost-300'
                }`}
              />
              {errors.name && (
                <div className="flex items-center gap-2 mt-2 text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  <span className="font-mono text-xs">{errors.name}</span>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block font-mono text-xs font-semibold text-ghost-700 uppercase mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe when this approval matrix should be used..."
                rows={3}
                className="w-full px-4 py-3 border border-ghost-300 font-mono text-sm focus:border-purple-900 focus:outline-none resize-none"
              />
            </div>

            {/* Applies To */}
            <div>
              <label className="block font-mono text-xs font-semibold text-ghost-700 uppercase mb-2">
                Applies To *
              </label>
              <select
                value={formData.applies_to}
                onChange={(e) => setFormData({ ...formData, applies_to: e.target.value as AppliesTo })}
                className={`w-full px-4 py-3 border font-mono text-sm focus:border-purple-900 focus:outline-none ${
                  errors.applies_to ? 'border-red-500' : 'border-ghost-300'
                }`}
              >
                {Object.entries(appliesToLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {errors.applies_to && (
                <div className="flex items-center gap-2 mt-2 text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  <span className="font-mono text-xs">{errors.applies_to}</span>
                </div>
              )}
              <p className="font-mono text-xs text-ghost-500 mt-2">
                Select the type of items this approval matrix will handle
              </p>
            </div>

            {/* Priority */}
            <div>
              <label className="block font-mono text-xs font-semibold text-ghost-700 uppercase mb-2">
                Priority
              </label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                min={0}
                max={100}
                className="w-full px-4 py-3 border border-ghost-300 font-mono text-sm focus:border-purple-900 focus:outline-none"
              />
              <p className="font-mono text-xs text-ghost-500 mt-2">
                Lower numbers = higher priority. Matrices are evaluated in priority order.
              </p>
            </div>

            {/* Is Default */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="is_default"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="mt-1 h-4 w-4 border-ghost-300 text-purple-900 focus:ring-purple-900"
              />
              <div>
                <label
                  htmlFor="is_default"
                  className="font-mono text-sm font-medium text-purple-900 cursor-pointer"
                >
                  Set as default matrix
                </label>
                <p className="font-mono text-xs text-ghost-500 mt-1">
                  The default matrix is used when no other matrix rules match
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="border border-ghost-300 bg-white p-6 mt-6 flex justify-between items-center">
            <button
              type="button"
              onClick={() => router.push('/dashboard/settings/approvals')}
              className="border border-ghost-300 px-6 py-3 font-mono text-xs uppercase hover:border-ghost-500"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={createMutation.isPending}
              className="border border-purple-900 bg-purple-900 text-white px-6 py-3 font-mono text-xs uppercase hover:bg-purple-800 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="h-3 w-3" />
              {createMutation.isPending ? 'Creating...' : 'Create Matrix'}
            </button>
          </div>
        </form>

        {/* Help Section */}
        <div className="border border-ghost-300 bg-ghost-50 p-6 mt-6">
          <h3 className="font-mono text-sm font-semibold text-purple-900 uppercase mb-3">
            Next Steps
          </h3>
          <div className="space-y-3 font-mono text-xs text-ghost-600">
            <p>
              After creating the matrix, you&apos;ll be able to:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Add approval rules with conditions</li>
              <li>Configure approvers and approval modes</li>
              <li>Set up escalation policies</li>
              <li>Define SLA requirements</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
