"use client";

import React from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useContractModalStore, useContractFormStore } from '@/stores/contracts';

export function ContractModal() {
  const { isModalOpen, closeModal } = useContractModalStore((state) => ({
    isModalOpen: state.isModalOpen,
    closeModal: state.closeModal,
  }));

  const {
    formData,
    updateFormData,
    submitContract,
    isFormValid,
    isSubmitting
  } = useContractFormStore((state) => ({
    formData: state.formData,
    updateFormData: state.updateFormData,
    submitContract: state.submitContract,
    isFormValid: state.isFormValid,
    isSubmitting: state.isSubmitting
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid()) {
      try {
        await submitContract('Default Vendor', true);
        closeModal();
      } catch (error) {
        console.error('Failed to submit contract:', error);
      }
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={closeModal}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Contract</DialogTitle>
          <DialogDescription>
            Add a new contract to your system. Fill in all required fields.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="contractName">Contract Name</Label>
              <Input
                id="contractName"
                value={formData.contractName}
                onChange={(e) => updateFormData('contractName', e.target.value)}
                placeholder="Enter contract name"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contractType">Contract Type</Label>
              <Select
                value={formData.contractType}
                onValueChange={(value) => updateFormData('contractType', value)}
              >
                <SelectTrigger id="contractType">
                  <SelectValue placeholder="Select contract type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nda">NDA</SelectItem>
                  <SelectItem value="msa">MSA</SelectItem>
                  <SelectItem value="sow">SOW</SelectItem>
                  <SelectItem value="saas">SaaS</SelectItem>
                  <SelectItem value="lease">Lease</SelectItem>
                  <SelectItem value="employment">Employment</SelectItem>
                  <SelectItem value="partnership">Partnership</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contractValue">Contract Value</Label>
              <Input
                id="contractValue"
                type="text"
                value={formData.contractValue}
                onChange={(e) => updateFormData('contractValue', e.target.value)}
                placeholder="Enter contract value"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contractCategory">Category</Label>
              <Input
                id="contractCategory"
                value={formData.contractCategory}
                onChange={(e) => updateFormData('contractCategory', e.target.value)}
                placeholder="Enter category"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contractOwner">Contract Owner</Label>
              <Input
                id="contractOwner"
                value={formData.contractOwner}
                onChange={(e) => updateFormData('contractOwner', e.target.value)}
                placeholder="Enter owner name"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contractDescription">Description</Label>
              <Textarea
                id="contractDescription"
                value={formData.contractDescription}
                onChange={(e) => updateFormData('contractDescription', e.target.value)}
                placeholder="Enter contract description"
                rows={4}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !isFormValid()}>
              {isSubmitting ? 'Creating...' : 'Create Contract'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ContractModal;