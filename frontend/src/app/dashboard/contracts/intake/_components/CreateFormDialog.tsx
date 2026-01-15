'use client';

import { FileText, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateIntakeForm } from '@/hooks/queries/useIntakeForms';
import { IntakeFormType, formTypeLabels } from '@/types/intake.types';

interface CreateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enterpriseId: string;
  userId: string;
}

const formTypeOptions: { value: IntakeFormType; label: string }[] = [
  { value: 'new_contract', label: formTypeLabels.new_contract },
  { value: 'contract_renewal', label: formTypeLabels.contract_renewal },
  { value: 'contract_amendment', label: formTypeLabels.contract_amendment },
  { value: 'vendor_onboarding', label: formTypeLabels.vendor_onboarding },
  { value: 'nda_request', label: formTypeLabels.nda_request },
  { value: 'procurement_request', label: formTypeLabels.procurement_request },
  { value: 'general', label: formTypeLabels.general },
];

export function CreateFormDialog({
  open,
  onOpenChange,
  enterpriseId,
  userId,
}: CreateFormDialogProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formType, setFormType] = useState<IntakeFormType>('general');

  const createForm = useCreateIntakeForm();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    try {
      const newForm = await createForm.mutateAsync({
        enterpriseId,
        userId,
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
          form_type: formType,
        },
      });

      // Reset form state
      setName('');
      setDescription('');
      setFormType('general');

      // Close dialog
      onOpenChange(false);

      // Navigate to form editor
      if (newForm?.id) {
        router.push(`/dashboard/contracts/intake/forms/${newForm.id}`);
      }
    } catch (error) {
      // Error is handled by the mutation's onError callback
      console.error('Failed to create form:', error);
    }
  };

  const handleClose = () => {
    if (!createForm.isPending) {
      setName('');
      setDescription('');
      setFormType('general');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm uppercase tracking-wider flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Create Intake Form
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            Create a new contract intake form. You can add fields and configure the form after creation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Form Name */}
          <div className="space-y-2">
            <label className="font-mono text-xs text-ghost-700 uppercase">
              Form Name <span className="text-red-500">*</span>
            </label>
            <Input
              variant="terminal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., New Vendor Contract Request"
              disabled={createForm.isPending}
              required
              autoFocus
            />
          </div>

          {/* Form Type */}
          <div className="space-y-2">
            <label className="font-mono text-xs text-ghost-700 uppercase">
              Form Type <span className="text-red-500">*</span>
            </label>
            <Select
              value={formType}
              onValueChange={(value) => setFormType(value as IntakeFormType)}
              disabled={createForm.isPending}
            >
              <SelectTrigger className="font-mono text-xs bg-white border border-ghost-300 hover:border-purple-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20">
                <SelectValue placeholder="Select form type" />
              </SelectTrigger>
              <SelectContent>
                {formTypeOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="font-mono text-xs"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="font-mono text-xs text-ghost-700 uppercase">
              Description <span className="text-ghost-500">(Optional)</span>
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this intake form..."
              disabled={createForm.isPending}
              rows={3}
              className="font-mono text-xs bg-white border border-ghost-300 hover:border-purple-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 resize-none"
            />
          </div>

          <DialogFooter className="pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={createForm.isPending}
              className="border border-ghost-300 bg-white px-4 py-2 font-mono text-xs text-ghost-700 hover:bg-ghost-50 disabled:opacity-50"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={!name.trim() || createForm.isPending}
              className="border border-purple-900 bg-purple-900 px-4 py-2 font-mono text-xs text-white hover:bg-purple-800 disabled:opacity-50 flex items-center gap-2"
            >
              {createForm.isPending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  CREATING...
                </>
              ) : (
                'CREATE FORM'
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
