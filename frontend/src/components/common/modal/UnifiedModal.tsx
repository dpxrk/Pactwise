"use client";

import React from "react";
import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UnifiedLoading } from "../loading/UnifiedLoading";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";
export type ModalVariant = "default" | "form" | "confirmation" | "alert";

interface BaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  size?: ModalSize;
  className?: string;
  showCloseButton?: boolean;
  preventClose?: boolean;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-[90vw]",
};

interface FormModalProps extends BaseModalProps {
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void | Promise<void>;
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  isDirty?: boolean;
}

export const FormModal: React.FC<FormModalProps> = ({
  open,
  onOpenChange,
  title,
  description,
  size = "md",
  className,
  showCloseButton = true,
  preventClose = false,
  children,
  onSubmit,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  isSubmitting = false,
  isDirty = false,
}) => {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(e);
  };

  const handleClose = () => {
    if (preventClose) return;
    if (isDirty) {
      if (confirm("You have unsaved changes. Are you sure you want to close?")) {
        onOpenChange(false);
      }
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={preventClose ? undefined : handleClose}>
      <DialogContent className={cn(sizeClasses[size], className)}>
        {showCloseButton && !preventClose && (
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 disabled:pointer-events-none"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        )}
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            {title ? (
              <DialogTitle>{title}</DialogTitle>
            ) : (
              <VisuallyHidden>
                <DialogTitle>Form</DialogTitle>
              </VisuallyHidden>
            )}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="py-4">{children}</div>
          <DialogFooter className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting || preventClose}
              className="border-gray-300"
            >
              {cancelLabel}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gray-900 hover:bg-gray-800 text-white"
            >
              {isSubmitting ? (
                <>
                  <UnifiedLoading variant="spinner" size="xs" className="mr-2" />
                  Saving...
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface ConfirmationModalProps extends BaseModalProps {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  variant?: "danger" | "warning" | "info" | "success";
  isProcessing?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  open,
  onOpenChange,
  title = "Confirm Action",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "info",
  isProcessing = false,
  size = "sm",
  className,
}) => {
  const icons = {
    danger: <AlertCircle className="w-5 h-5 text-red-600" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600" />,
    info: <Info className="w-5 h-5 text-blue-600" />,
    success: <CheckCircle className="w-5 h-5 text-green-600" />,
  };

  const buttonClasses = {
    danger: "bg-red-600 hover:bg-red-700 text-white",
    warning: "bg-amber-600 hover:bg-amber-700 text-white",
    info: "bg-gray-900 hover:bg-gray-800 text-white",
    success: "bg-green-600 hover:bg-green-700 text-white",
  };

  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={isProcessing ? undefined : onOpenChange}>
      <DialogContent className={cn(sizeClasses[size], className)}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            {icons[variant]}
            <DialogTitle>{title}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="py-4">
          <p className="text-gray-600">{message}</p>
        </div>
        <DialogFooter className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
            className="border-gray-300"
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing}
            className={buttonClasses[variant]}
          >
            {isProcessing ? (
              <>
                <UnifiedLoading variant="spinner" size="xs" className="mr-2" />
                Processing...
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface ViewModalProps extends BaseModalProps {
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const ViewModal: React.FC<ViewModalProps> = ({
  open,
  onOpenChange,
  title,
  description,
  size = "lg",
  className,
  showCloseButton = true,
  children,
  actions,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(sizeClasses[size], "max-h-[80vh] overflow-y-auto", className)}>
        {showCloseButton && (
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        )}
        <DialogHeader>
          {title ? (
            <DialogTitle>{title}</DialogTitle>
          ) : (
            <VisuallyHidden>
              <DialogTitle>View</DialogTitle>
            </VisuallyHidden>
          )}
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="py-4">{children}</div>
        {actions && <DialogFooter>{actions}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
};

interface AlertModalProps extends BaseModalProps {
  variant?: "error" | "warning" | "info" | "success";
  message: string;
  details?: string;
  onClose?: () => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  open,
  onOpenChange,
  title,
  variant = "info",
  message,
  details,
  onClose,
  size = "sm",
  className,
}) => {
  const configs = {
    error: {
      icon: <AlertCircle className="w-6 h-6 text-red-600" />,
      title: title || "Error",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
    },
    warning: {
      icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
      title: title || "Warning",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
    },
    info: {
      icon: <Info className="w-6 h-6 text-blue-600" />,
      title: title || "Information",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    success: {
      icon: <CheckCircle className="w-6 h-6 text-green-600" />,
      title: title || "Success",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
  };

  const config = configs[variant];

  const handleClose = () => {
    onClose?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(sizeClasses[size], className)}>
        <VisuallyHidden>
          <DialogTitle>{config.title}</DialogTitle>
        </VisuallyHidden>
        <div className={cn("p-4 rounded-lg border", config.bgColor, config.borderColor)}>
          <div className="flex gap-3">
            <div className="flex-shrink-0">{config.icon}</div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{config.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{message}</p>
              {details && (
                <div className="mt-3 text-xs text-gray-500 bg-white p-2 rounded border border-gray-200">
                  <pre className="whitespace-pre-wrap">{details}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleClose}
            className="bg-gray-900 hover:bg-gray-800 text-white"
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const useModal = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [data, setData] = React.useState<unknown>(null);

  const openModal = (modalData?: unknown) => {
    setData(modalData);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setTimeout(() => setData(null), 200);
  };

  return {
    isOpen,
    data,
    openModal,
    closeModal,
    setIsOpen,
  };
};

export default {
  FormModal,
  ConfirmationModal,
  ViewModal,
  AlertModal,
  useModal,
};