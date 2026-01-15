'use client';

import {
  ArrowLeft,
  FileSignature,
  Plus,
  Trash2,
  GripVertical,
  Calendar,
  Send,
  Save,
  Users,
  FileText,
  Search,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useContractList } from '@/hooks/queries/useContracts';
import { useCreateSignatureRequest, useSendSignatureRequest } from '@/hooks/queries/useSignatures';
import { cn } from '@/lib/utils';
import type { SigningOrder } from '@/types/signature-management.types';

// ============================================================================
// TYPES
// ============================================================================

interface SignatoryInput {
  id: string;
  email: string;
  name: string;
  company: string;
  role: string;
}

// Contract list item from Supabase - matches database schema
interface ContractListItem {
  id: string;
  title: string;
  contract_number?: string;
  vendor?: {
    id: string;
    name: string;
  };
}

// ============================================================================
// CREATE SIGNATURE PAGE
// ============================================================================

export default function CreateSignaturePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userProfile } = useAuth();
  const enterpriseId = userProfile?.enterprise_id;

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedContractId, setSelectedContractId] = useState<string | null>(
    searchParams.get('contract_id') || null
  );
  const [signingOrder, setSigningOrder] = useState<SigningOrder>('parallel');
  const [expiresAt, setExpiresAt] = useState('');
  const [signatories, setSignatories] = useState<SignatoryInput[]>([
    { id: crypto.randomUUID(), email: '', name: '', company: '', role: 'signatory' },
  ]);
  const [contractSearch, setContractSearch] = useState('');

  // Fetch contracts
  const { data: contractsData, isLoading: contractsLoading } = useContractList(
    enterpriseId as string,
    { search: contractSearch || undefined }
  );
  // Cast to proper type - Supabase returns actual db columns
  const contracts = contractsData as unknown as ContractListItem[] | undefined;

  // Mutations
  const createMutation = useCreateSignatureRequest();
  const sendMutation = useSendSignatureRequest();

  // Set default expiry date (14 days)
  useEffect(() => {
    const defaultExpiry = new Date();
    defaultExpiry.setDate(defaultExpiry.getDate() + 14);
    setExpiresAt(defaultExpiry.toISOString().split('T')[0]);
  }, []);

  // Update title when contract is selected
  useEffect(() => {
    if (selectedContractId && contracts) {
      const contract = contracts.find((c) => c.id === selectedContractId);
      if (contract && !title) {
        setTitle(`Signature Request - ${contract.title}`);
      }
    }
  }, [selectedContractId, contracts, title]);

  // Add signatory
  const addSignatory = () => {
    setSignatories([
      ...signatories,
      { id: crypto.randomUUID(), email: '', name: '', company: '', role: 'signatory' },
    ]);
  };

  // Remove signatory
  const removeSignatory = (id: string) => {
    if (signatories.length <= 1) {
      toast.error('At least one signatory is required');
      return;
    }
    setSignatories(signatories.filter((s) => s.id !== id));
  };

  // Update signatory
  const updateSignatory = (id: string, field: keyof SignatoryInput, value: string) => {
    setSignatories(
      signatories.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  // Validate form
  const validateForm = (): boolean => {
    if (!title.trim()) {
      toast.error('Title is required');
      return false;
    }
    if (!selectedContractId) {
      toast.error('Please select a contract');
      return false;
    }
    if (signatories.length === 0) {
      toast.error('At least one signatory is required');
      return false;
    }
    const invalidSignatories = signatories.filter(
      (s) => !s.email.trim() || !s.name.trim()
    );
    if (invalidSignatories.length > 0) {
      toast.error('All signatories must have an email and name');
      return false;
    }
    return true;
  };

  // Handle save as draft
  const handleSaveDraft = async () => {
    if (!validateForm() || !enterpriseId) return;

    try {
      await createMutation.mutateAsync({
        enterprise_id: enterpriseId,
        contract_id: selectedContractId!,
        title,
        message: message || undefined,
        signing_order: signingOrder,
        expires_at: expiresAt || undefined,
        signatories: signatories.map((s, index) => ({
          email: s.email,
          name: s.name,
          company: s.company || undefined,
          role: s.role,
          order_index: index,
        })),
      });
      router.push('/dashboard/contracts/signatures');
    } catch (_error) {
      // Error handled by mutation
    }
  };

  // Handle send immediately
  const handleSendNow = async () => {
    if (!validateForm() || !enterpriseId) return;

    try {
      const request = await createMutation.mutateAsync({
        enterprise_id: enterpriseId,
        contract_id: selectedContractId!,
        title,
        message: message || undefined,
        signing_order: signingOrder,
        expires_at: expiresAt || undefined,
        signatories: signatories.map((s, index) => ({
          email: s.email,
          name: s.name,
          company: s.company || undefined,
          role: s.role,
          order_index: index,
        })),
      });

      // Send immediately
      await sendMutation.mutateAsync(request.id);
      router.push('/dashboard/contracts/signatures');
    } catch (_error) {
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
              onClick={() => router.push('/dashboard/contracts/signatures')}
              className="p-1 hover:bg-ghost-100"
            >
              <ArrowLeft className="h-4 w-4 text-ghost-600" />
            </button>
            <div className="flex items-center gap-2">
              <FileSignature className="h-4 w-4 text-purple-600" />
              <span className="font-mono text-xs text-ghost-700 uppercase">
                NEW SIGNATURE REQUEST
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleSaveDraft}
              disabled={createMutation.isPending}
              className="border border-ghost-300 bg-white text-ghost-700 px-4 py-2 font-mono text-xs hover:border-purple-900 flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="h-3 w-3" />
              SAVE DRAFT
            </button>
            <button
              onClick={handleSendNow}
              disabled={createMutation.isPending || sendMutation.isPending}
              className="border border-purple-900 bg-purple-900 text-white px-4 py-2 font-mono text-xs hover:bg-purple-800 flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="h-3 w-3" />
              SEND NOW
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        {/* Basic Info */}
        <div className="border border-ghost-300 bg-white p-6 mb-6">
          <h2 className="font-mono text-sm font-semibold text-purple-900 uppercase mb-4">
            Basic Information
          </h2>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="font-mono text-xs text-ghost-600 block mb-1">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., NDA Signature Request"
                className="w-full border border-ghost-300 px-3 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none"
              />
            </div>

            {/* Contract Selection */}
            <div>
              <label className="font-mono text-xs text-ghost-600 block mb-1">
                Select Contract *
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ghost-400" />
                <input
                  type="text"
                  value={contractSearch}
                  onChange={(e) => setContractSearch(e.target.value)}
                  placeholder="Search contracts..."
                  className="w-full pl-10 pr-4 py-2 border border-ghost-300 font-mono text-sm focus:border-purple-900 focus:outline-none"
                />
              </div>

              {/* Contract List */}
              <div className="mt-2 border border-ghost-300 max-h-48 overflow-y-auto">
                {contractsLoading ? (
                  <div className="p-4">
                    <Skeleton className="h-8" />
                  </div>
                ) : contracts && contracts.length > 0 ? (
                  contracts.slice(0, 10).map((contract) => (
                    <button
                      key={contract.id}
                      onClick={() => setSelectedContractId(contract.id)}
                      className={cn(
                        'w-full text-left px-4 py-3 border-b border-ghost-200 last:border-b-0 hover:bg-ghost-50',
                        selectedContractId === contract.id && 'bg-purple-50'
                      )}
                    >
                      <div className="font-mono text-sm text-ghost-900">
                        {contract.title}
                      </div>
                      <div className="font-mono text-xs text-ghost-500">
                        {contract.contract_number || contract.vendor?.name || 'No vendor'}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center">
                    <FileText className="h-8 w-8 text-ghost-300 mx-auto mb-2" />
                    <p className="font-mono text-xs text-ghost-500">
                      No contracts found
                    </p>
                  </div>
                )}
              </div>

              {selectedContractId && contracts && (
                <div className="mt-2 px-3 py-2 bg-purple-50 border border-purple-200">
                  <span className="font-mono text-xs text-purple-700">
                    Selected:{' '}
                    {contracts.find((c) => c.id === selectedContractId)?.title}
                  </span>
                </div>
              )}
            </div>

            {/* Message */}
            <div>
              <label className="font-mono text-xs text-ghost-600 block mb-1">
                Message to Signatories
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Optional message to include in the signing request email..."
                rows={3}
                className="w-full border border-ghost-300 px-3 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none resize-none"
              />
            </div>

            {/* Options Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Signing Order */}
              <div>
                <label className="font-mono text-xs text-ghost-600 block mb-1">
                  Signing Order
                </label>
                <select
                  value={signingOrder}
                  onChange={(e) => setSigningOrder(e.target.value as SigningOrder)}
                  className="w-full border border-ghost-300 px-3 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none"
                >
                  <option value="parallel">Parallel (all at once)</option>
                  <option value="sequential">Sequential (in order)</option>
                </select>
              </div>

              {/* Expiry Date */}
              <div>
                <label className="font-mono text-xs text-ghost-600 block mb-1">
                  Expires On
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ghost-400" />
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-ghost-300 font-mono text-sm focus:border-purple-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Signatories */}
        <div className="border border-ghost-300 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-sm font-semibold text-purple-900 uppercase flex items-center gap-2">
              <Users className="h-4 w-4" />
              Signatories
            </h2>
            <button
              onClick={addSignatory}
              className="font-mono text-xs text-purple-900 hover:underline flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              Add Signatory
            </button>
          </div>

          <div className="space-y-4">
            {signatories.map((signatory, index) => (
              <div
                key={signatory.id}
                className="border border-ghost-200 p-4 bg-ghost-50"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {signingOrder === 'sequential' && (
                      <GripVertical className="h-4 w-4 text-ghost-400 cursor-grab" />
                    )}
                    <span className="font-mono text-xs text-ghost-600">
                      Signatory #{index + 1}
                    </span>
                  </div>
                  <button
                    onClick={() => removeSignatory(signatory.id)}
                    className="p-1 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="h-4 w-4 text-ghost-400 hover:text-red-500" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-mono text-xs text-ghost-500 block mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={signatory.email}
                      onChange={(e) =>
                        updateSignatory(signatory.id, 'email', e.target.value)
                      }
                      placeholder="email@example.com"
                      className="w-full border border-ghost-300 px-3 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-xs text-ghost-500 block mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={signatory.name}
                      onChange={(e) =>
                        updateSignatory(signatory.id, 'name', e.target.value)
                      }
                      placeholder="John Doe"
                      className="w-full border border-ghost-300 px-3 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-xs text-ghost-500 block mb-1">
                      Company
                    </label>
                    <input
                      type="text"
                      value={signatory.company}
                      onChange={(e) =>
                        updateSignatory(signatory.id, 'company', e.target.value)
                      }
                      placeholder="Company Inc."
                      className="w-full border border-ghost-300 px-3 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-xs text-ghost-500 block mb-1">
                      Role
                    </label>
                    <select
                      value={signatory.role}
                      onChange={(e) =>
                        updateSignatory(signatory.id, 'role', e.target.value)
                      }
                      className="w-full border border-ghost-300 px-3 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none bg-white"
                    >
                      <option value="signatory">Signatory</option>
                      <option value="witness">Witness</option>
                      <option value="approver">Approver</option>
                      <option value="counterparty">Counterparty</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {signingOrder === 'sequential' && signatories.length > 1 && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200">
              <p className="font-mono text-xs text-amber-700">
                Signatories will receive the signing request in the order shown above.
                Each signatory must complete signing before the next one is notified.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
