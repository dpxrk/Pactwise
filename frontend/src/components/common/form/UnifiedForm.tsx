"use client";

import React, { forwardRef } from "react";
import { UseFormReturn, FieldValues, Path, PathValue } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";

interface BaseFieldProps<T extends FieldValues> {
  name: Path<T>;
  label?: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  form: UseFormReturn<T>;
}

interface TextFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  type?: "text" | "email" | "password" | "number" | "tel" | "url";
  icon?: React.ReactNode;
  showPasswordToggle?: boolean;
}

export function TextField<T extends FieldValues>({
  name,
  label,
  placeholder,
  description,
  required = false,
  disabled = false,
  type = "text",
  icon,
  showPasswordToggle = false,
  className,
  form,
}: TextFieldProps<T>) {
  const [showPassword, setShowPassword] = React.useState(false);
  const error = form.formState.errors[name];
  const fieldType = type === "password" && showPassword ? "text" : type;

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={name} className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <Input
          id={name}
          type={fieldType}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full",
            icon && "pl-10",
            showPasswordToggle && type === "password" && "pr-10",
            error && "border-red-500 focus:ring-red-500"
          )}
          {...form.register(name)}
        />
        {showPasswordToggle && type === "password" && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {description && !error && (
        <p className="text-sm text-gray-500">{description}</p>
      )}
      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span>{error.message}</span>
        </div>
      )}
    </div>
  );
}

interface TextAreaFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  rows?: number;
  maxLength?: number;
}

export function TextAreaField<T extends FieldValues>({
  name,
  label,
  placeholder,
  description,
  required = false,
  disabled = false,
  rows = 4,
  maxLength,
  className,
  form,
}: TextAreaFieldProps<T>) {
  const error = form.formState.errors[name];
  const value = form.watch(name) || "";

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div className="flex justify-between">
          <Label htmlFor={name} className="text-sm font-medium text-gray-700">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          {maxLength && (
            <span className="text-xs text-gray-500">
              {value.length}/{maxLength}
            </span>
          )}
        </div>
      )}
      <Textarea
        id={name}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        className={cn(
          "w-full resize-none",
          error && "border-red-500 focus:ring-red-500"
        )}
        {...form.register(name)}
      />
      {description && !error && (
        <p className="text-sm text-gray-500">{description}</p>
      )}
      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span>{error.message}</span>
        </div>
      )}
    </div>
  );
}

interface SelectFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  options: { value: string; label: string }[];
}

export function SelectField<T extends FieldValues>({
  name,
  label,
  placeholder = "Select an option",
  description,
  required = false,
  disabled = false,
  options,
  className,
  form,
}: SelectFieldProps<T>) {
  const error = form.formState.errors[name];

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={name} className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Select
        disabled={disabled}
        value={form.watch(name)}
        onValueChange={(value) => form.setValue(name, value as PathValue<T, Path<T>>)}
      >
        <SelectTrigger
          id={name}
          className={cn(
            "w-full",
            error && "border-red-500 focus:ring-red-500"
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description && !error && (
        <p className="text-sm text-gray-500">{description}</p>
      )}
      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span>{error.message}</span>
        </div>
      )}
    </div>
  );
}

interface CheckboxFieldProps<T extends FieldValues> extends BaseFieldProps<T> {}

export function CheckboxField<T extends FieldValues>({
  name,
  label,
  description,
  disabled = false,
  className,
  form,
}: CheckboxFieldProps<T>) {
  const error = form.formState.errors[name];

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-start space-x-3">
        <Checkbox
          id={name}
          disabled={disabled}
          checked={form.watch(name)}
          onCheckedChange={(checked) => form.setValue(name, checked as PathValue<T, Path<T>>)}
          className={cn(error && "border-red-500")}
        />
        <div className="space-y-1">
          {label && (
            <Label htmlFor={name} className="text-sm font-medium text-gray-700 cursor-pointer">
              {label}
            </Label>
          )}
          {description && (
            <p className="text-sm text-gray-500">{description}</p>
          )}
        </div>
      </div>
      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span>{error.message}</span>
        </div>
      )}
    </div>
  );
}

interface RadioGroupFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  options: { value: string; label: string; description?: string }[];
}

export function RadioGroupField<T extends FieldValues>({
  name,
  label,
  description,
  required = false,
  disabled = false,
  options,
  className,
  form,
}: RadioGroupFieldProps<T>) {
  const error = form.formState.errors[name];

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      {description && (
        <p className="text-sm text-gray-500">{description}</p>
      )}
      <RadioGroup
        disabled={disabled}
        value={form.watch(name)}
        onValueChange={(value) => form.setValue(name, value as PathValue<T, Path<T>>)}
      >
        {options.map((option) => (
          <div key={option.value} className="flex items-start space-x-3">
            <RadioGroupItem
              value={option.value}
              id={`${name}-${option.value}`}
              className={cn(error && "border-red-500")}
            />
            <div className="space-y-1">
              <Label
                htmlFor={`${name}-${option.value}`}
                className="text-sm font-medium text-gray-700 cursor-pointer"
              >
                {option.label}
              </Label>
              {option.description && (
                <p className="text-sm text-gray-500">{option.description}</p>
              )}
            </div>
          </div>
        ))}
      </RadioGroup>
      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span>{error.message}</span>
        </div>
      )}
    </div>
  );
}

interface FormActionsProps {
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  isSubmitting?: boolean;
  className?: string;
  align?: "left" | "center" | "right";
}

export const FormActions = forwardRef<HTMLDivElement, FormActionsProps>(
  ({ submitLabel = "Submit", cancelLabel = "Cancel", onCancel, isSubmitting = false, className, align = "right" }, ref) => {
    const alignmentClasses = {
      left: "justify-start",
      center: "justify-center",
      right: "justify-end",
    };

    return (
      <div ref={ref} className={cn("flex gap-3", alignmentClasses[align], className)}>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="border-gray-300"
          >
            {cancelLabel}
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-gray-900 hover:bg-gray-800 text-white"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    );
  }
);

FormActions.displayName = "FormActions";

interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  className,
}) => {
  return (
    <div className={cn("space-y-4", className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
          {description && <p className="text-sm text-gray-500">{description}</p>}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
};

export default {
  TextField,
  TextAreaField,
  SelectField,
  CheckboxField,
  RadioGroupField,
  FormActions,
  FormSection,
};