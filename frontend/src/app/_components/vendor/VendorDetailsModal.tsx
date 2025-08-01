'use client'

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VendorType } from "@/types/vendor.types";
import VendorDetails from "./VendorDetails";
import VendorForm from "./VendorForm";

interface VendorDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: VendorType | null;
  onEditVendor?: (vendor: Partial<VendorType>) => Promise<void>;
  onUpdateVendor?: (updatedVendor: VendorType) => void;
}

export const VendorDetailsModal: React.FC<VendorDetailsModalProps> = ({
  open,
  onOpenChange,
  vendor,
  onEditVendor,
  onUpdateVendor,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSubmitEdit = async (updatedData: Partial<VendorType>) => {
    if (!vendor || !onEditVendor) return;

    setLoading(true);
    try {
      await onEditVendor(updatedData);
      setIsEditing(false);
      
      // Update the vendor in the parent component if callback provided
      if (onUpdateVendor) {
        onUpdateVendor({ ...vendor, ...updatedData } as VendorType);
      }
    } catch (error) {
      console.error("Error updating vendor:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!vendor) return null;

  return (
    <>
      <Dialog open={open && !isEditing} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vendor Details</DialogTitle>
          </DialogHeader>
          <VendorDetails
            vendor={vendor}
            onEdit={handleEdit}
            onClose={() => onOpenChange(false)}
          />
        </DialogContent>
      </Dialog>

      <VendorForm
        open={isEditing}
        onOpenChange={(open) => {
          if (!open) {
            handleCancelEdit();
          }
        }}
        vendor={vendor}
        onSubmit={handleSubmitEdit}
        loading={loading}
      />
    </>
  );
};

export default VendorDetailsModal;