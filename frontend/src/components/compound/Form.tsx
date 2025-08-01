import React, { createContext, useContext, ReactNode, FormHTMLAttributes } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Context for sharing form state
interface FormContextType {
  errors?: Record<string, string>;
  isSubmitting?: boolean;
  touched?: Record<string, boolean>;
}

const FormContext = createContext<FormContextType>({});

// Main Form component
interface FormProps extends FormHTMLAttributes<HTMLFormElement> {
  children: ReactNode;
  errors?: Record<string, string>;
  isSubmitting?: boolean;
  touched?: Record<string, boolean>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export function Form({ 
  children, 
  errors = {}, 
  isSubmitting = false, 
  touched = {},
  onSubmit,
  className,
  ...props 
}: FormProps) {
  return (
    <FormContext.Provider value={{ errors, isSubmitting, touched }}>
      <form 
        onSubmit={onSubmit} 
        className={cn('space-y-6', className)}
        {...props}
      >
        {children}
      </form>
    </FormContext.Provider>
  );
}

// Form Section component
interface FormSectionProps {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export function FormSection({ children, title, description, className }: FormSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && <h3 className="text-lg font-medium">{title}</h3>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

// Form Field component
interface FormFieldProps {
  children: ReactNode;
  name: string;
  className?: string;
}

export function FormField({ children, name, className }: FormFieldProps) {
  const { errors, touched } = useContext(FormContext);
  const hasError = errors?.[name] && touched?.[name];
  
  return (
    <div className={cn('space-y-2', className)}>
      {children}
      {hasError && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {errors[name]}
        </div>
      )}
    </div>
  );
}

// Form Label component
interface FormLabelProps {
  children: ReactNode;
  htmlFor: string;
  required?: boolean;
  className?: string;
}

export function FormLabel({ children, htmlFor, required, className }: FormLabelProps) {
  return (
    <Label htmlFor={htmlFor} className={cn('text-sm font-medium', className)}>
      {children}
      {required && <span className="text-destructive ml-1">*</span>}
    </Label>
  );
}

// Form Input component
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string;
}

export function FormInput({ name, className, ...props }: FormInputProps) {
  const { errors, touched } = useContext(FormContext);
  const hasError = errors?.[name] && touched?.[name];
  
  return (
    <Input
      id={name}
      name={name}
      className={cn(hasError && 'border-destructive focus-visible:ring-destructive', className)}
      {...props}
    />
  );
}

// Form Textarea component
interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  name: string;
}

export function FormTextarea({ name, className, ...props }: FormTextareaProps) {
  const { errors, touched } = useContext(FormContext);
  const hasError = errors?.[name] && touched?.[name];
  
  return (
    <Textarea
      id={name}
      name={name}
      className={cn(hasError && 'border-destructive focus-visible:ring-destructive', className)}
      {...props}
    />
  );
}

// Form Select component
interface FormSelectProps {
  name: string;
  placeholder?: string;
  children: ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

export function FormSelect({ name, placeholder, children, value, onValueChange, className }: FormSelectProps) {
  const { errors, touched } = useContext(FormContext);
  const hasError = errors?.[name] && touched?.[name];
  
  const selectProps: { value?: string; onValueChange?: (value: string) => void } = {};
  if (value !== undefined) {
    selectProps.value = value;
  }
  if (onValueChange !== undefined) {
    selectProps.onValueChange = onValueChange;
  }
  
  return (
    <Select {...selectProps}>
      <SelectTrigger 
        id={name}
        className={cn(hasError && 'border-destructive focus:ring-destructive', className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {children}
      </SelectContent>
    </Select>
  );
}

// Form Select Option component
interface FormSelectOptionProps {
  value: string;
  children: ReactNode;
}

export function FormSelectOption({ value, children }: FormSelectOptionProps) {
  return <SelectItem value={value}>{children}</SelectItem>;
}

// Form Help Text component
interface FormHelpTextProps {
  children: ReactNode;
  className?: string;
}

export function FormHelpText({ children, className }: FormHelpTextProps) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      {children}
    </p>
  );
}

// Form Error component
interface FormErrorProps {
  name: string;
  className?: string;
}

export function FormError({ name, className }: FormErrorProps) {
  const { errors, touched } = useContext(FormContext);
  const hasError = errors?.[name] && touched?.[name];
  
  if (!hasError) return null;
  
  return (
    <div className={cn('flex items-center gap-2 text-sm text-destructive', className)}>
      <AlertCircle className="h-4 w-4" />
      {errors[name]}
    </div>
  );
}

// Form Success Message component
interface FormSuccessProps {
  children: ReactNode;
  className?: string;
}

export function FormSuccess({ children, className }: FormSuccessProps) {
  return (
    <Alert className={cn('border-success text-success', className)}>
      <CheckCircle2 className="h-4 w-4" />
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}

// Form Actions component
interface FormActionsProps {
  children: ReactNode;
  className?: string;
}

export function FormActions({ children, className }: FormActionsProps) {
  return (
    <div className={cn('flex items-center justify-end gap-3 pt-4', className)}>
      {children}
    </div>
  );
}

// Form Submit Button component
interface FormSubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  loadingText?: string;
}

export function FormSubmitButton({ 
  children, 
  loadingText = 'Submitting...', 
  className,
  ...props 
}: FormSubmitButtonProps) {
  const { isSubmitting } = useContext(FormContext);
  
  return (
    <Button 
      type="submit" 
      disabled={isSubmitting}
      className={className}
      {...props}
    >
      {isSubmitting ? loadingText : children}
    </Button>
  );
}

// Form Reset Button component
interface FormResetButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  onReset?: () => void;
}

export function FormResetButton({ children, onReset, ...props }: FormResetButtonProps) {
  const { isSubmitting } = useContext(FormContext);
  
  return (
    <Button 
      type="button" 
      variant="outline"
      disabled={isSubmitting}
      onClick={onReset}
      {...props}
    >
      {children}
    </Button>
  );
}

// Form Group component (for inline fields)
interface FormGroupProps {
  children: ReactNode;
  className?: string;
}

export function FormGroup({ children, className }: FormGroupProps) {
  return (
    <div className={cn('grid gap-4 md:grid-cols-2', className)}>
      {children}
    </div>
  );
}

// Export all components as named exports and compound component
export default Object.assign(Form, {
  Section: FormSection,
  Field: FormField,
  Label: FormLabel,
  Input: FormInput,
  Textarea: FormTextarea,
  Select: FormSelect,
  SelectOption: FormSelectOption,
  HelpText: FormHelpText,
  Error: FormError,
  Success: FormSuccess,
  Actions: FormActions,
  SubmitButton: FormSubmitButton,
  ResetButton: FormResetButton,
  Group: FormGroup,
});