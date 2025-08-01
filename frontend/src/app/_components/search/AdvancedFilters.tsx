'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { format, subDays, subMonths, subYears } from 'date-fns';
import { 
  Filter, 
  X, 
  Calendar, 
  Tag, 
  User, 
  Building, 
  DollarSign, 
  Clock,
  Save,
  RefreshCw,
  Star,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Search,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// Filter value types
export type FilterValue = string | string[] | number | Date | boolean | { min: number; max: number } | { start: Date; end: Date };

// Filter field definition
export interface FilterField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'multiselect' | 'checkbox' | 'radio' | 'date' | 'daterange' | 'number' | 'numberrange' | 'slider';
  category: string;
  options?: { value: string; label: string; count?: number }[];
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: FilterValue;
  required?: boolean;
  description?: string;
}

// Active filter
export interface ActiveFilter {
  fieldId: string;
  value: FilterValue;
  operator?: 'equals' | 'contains' | 'gt' | 'lt' | 'between' | 'in' | 'not_in';
  label?: string;
}

// Saved filter
export interface SavedFilter {
  id: string;
  name: string;
  description?: string;
  filters: ActiveFilter[];
  isGlobal?: boolean;
  createdAt: Date;
  usageCount?: number;
}

// Quick filter presets
export interface QuickFilter {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  filters: ActiveFilter[];
  category?: string;
}

// Advanced filters props
export interface AdvancedFiltersProps {
  fields: FilterField[];
  activeFilters: ActiveFilter[];
  onFiltersChange: (filters: ActiveFilter[]) => void;
  onSaveFilter?: (name: string, description?: string) => void;
  savedFilters?: SavedFilter[];
  onLoadFilter?: (filterId: string) => void;
  onDeleteSavedFilter?: (filterId: string) => void;
  quickFilters?: QuickFilter[];
  variant?: 'sidebar' | 'modal' | 'inline';
  showQuickFilters?: boolean;
  showSavedFilters?: boolean;
  className?: string;
}

// Predefined filter fields for contracts and vendors
export const contractFilterFields: FilterField[] = [
  {
    id: 'status',
    label: 'Status',
    type: 'multiselect',
    category: 'General',
    options: [
      { value: 'draft', label: 'Draft', count: 12 },
      { value: 'active', label: 'Active', count: 45 },
      { value: 'expired', label: 'Expired', count: 8 },
      { value: 'terminated', label: 'Terminated', count: 3 }
    ]
  },
  {
    id: 'contractType',
    label: 'Contract Type',
    type: 'multiselect',
    category: 'General',
    options: [
      { value: 'nda', label: 'NDA', count: 15 },
      { value: 'msa', label: 'MSA', count: 8 },
      { value: 'saas', label: 'SaaS', count: 22 },
      { value: 'lease', label: 'Lease', count: 5 }
    ]
  },
  {
    id: 'vendor',
    label: 'Vendor',
    type: 'select',
    category: 'Relationships',
    options: [
      { value: 'vendor1', label: 'Microsoft Corporation' },
      { value: 'vendor2', label: 'Google LLC' },
      { value: 'vendor3', label: 'Amazon Web Services' }
    ]
  },
  {
    id: 'value',
    label: 'Contract Value',
    type: 'numberrange',
    category: 'Financial',
    min: 0,
    max: 1000000,
    step: 1000
  },
  {
    id: 'createdDate',
    label: 'Created Date',
    type: 'daterange',
    category: 'Timeline'
  },
  {
    id: 'endDate',
    label: 'End Date',
    type: 'daterange',
    category: 'Timeline'
  },
  {
    id: 'analysisStatus',
    label: 'Analysis Complete',
    type: 'checkbox',
    category: 'Analysis'
  }
];

export const vendorFilterFields: FilterField[] = [
  {
    id: 'status',
    label: 'Status',
    type: 'multiselect',
    category: 'General',
    options: [
      { value: 'active', label: 'Active', count: 28 },
      { value: 'inactive', label: 'Inactive', count: 12 },
      { value: 'pending', label: 'Pending', count: 5 }
    ]
  },
  {
    id: 'category',
    label: 'Category',
    type: 'multiselect',
    category: 'General',
    options: [
      { value: 'technology', label: 'Technology', count: 15 },
      { value: 'marketing', label: 'Marketing', count: 8 },
      { value: 'legal', label: 'Legal', count: 4 },
      { value: 'finance', label: 'Finance', count: 6 }
    ]
  },
  {
    id: 'riskLevel',
    label: 'Risk Level',
    type: 'radio',
    category: 'Risk',
    options: [
      { value: 'low', label: 'Low Risk' },
      { value: 'medium', label: 'Medium Risk' },
      { value: 'high', label: 'High Risk' }
    ]
  },
  {
    id: 'complianceScore',
    label: 'Compliance Score',
    type: 'slider',
    category: 'Performance',
    min: 0,
    max: 100,
    step: 5
  },
  {
    id: 'totalSpend',
    label: 'Total Spend',
    type: 'numberrange',
    category: 'Financial',
    min: 0,
    max: 500000,
    step: 5000
  }
];

// Quick filters for common use cases
export const contractQuickFilters: QuickFilter[] = [
  {
    id: 'expiring_soon',
    label: 'Expiring Soon',
    icon: Clock,
    filters: [
      {
        fieldId: 'endDate',
        value: { start: new Date(), end: subDays(new Date(), -30) },
        operator: 'between'
      }
    ]
  },
  {
    id: 'high_value',
    label: 'High Value',
    icon: DollarSign,
    filters: [
      {
        fieldId: 'value',
        value: 100000,
        operator: 'gt'
      }
    ]
  },
  {
    id: 'pending_analysis',
    label: 'Pending Analysis',
    icon: Search,
    filters: [
      {
        fieldId: 'analysisStatus',
        value: false,
        operator: 'equals'
      }
    ]
  }
];

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  fields,
  activeFilters,
  onFiltersChange,
  onSaveFilter,
  savedFilters = [],
  onLoadFilter,
  onDeleteSavedFilter,
  quickFilters = [],
  variant = 'sidebar',
  showQuickFilters = true,
  showSavedFilters = true,
  className
}) => {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['General']));
  const [saveFilterDialogOpen, setSaveFilterDialogOpen] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [filterDescription, setFilterDescription] = useState('');

  // Group fields by category
  const fieldsByCategory = fields.reduce((acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category]!.push(field);
    return acc;
  }, {} as Record<string, FilterField[]>);

  // Get active filter for a field
  const getActiveFilter = useCallback((fieldId: string) => {
    return activeFilters.find(filter => filter.fieldId === fieldId);
  }, [activeFilters]);

  // Update filter value
  const updateFilter = useCallback((fieldId: string, value: FilterValue, operator?: string) => {
    const newFilters = activeFilters.filter(filter => filter.fieldId !== fieldId);
    
    if (value !== undefined && value !== null && value !== '' && 
        !(Array.isArray(value) && value.length === 0)) {
      const field = fields.find(f => f.id === fieldId);
      const newFilter: ActiveFilter = {
        fieldId,
        value,
        operator: operator as FilterOperator,
      };
      
      if (field?.label) {
        newFilter.label = field.label;
      }
      
      newFilters.push(newFilter);
    }

    onFiltersChange(newFilters);
  }, [activeFilters, fields, onFiltersChange]);

  // Remove filter
  const removeFilter = useCallback((fieldId: string) => {
    const newFilters = activeFilters.filter(filter => filter.fieldId !== fieldId);
    onFiltersChange(newFilters);
  }, [activeFilters, onFiltersChange]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    onFiltersChange([]);
  }, [onFiltersChange]);

  // Apply quick filter
  const applyQuickFilter = useCallback((quickFilter: QuickFilter) => {
    onFiltersChange(quickFilter.filters);
  }, [onFiltersChange]);

  // Toggle category expansion
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  // Save current filters
  const handleSaveFilter = useCallback(() => {
    if (onSaveFilter && filterName.trim()) {
      onSaveFilter(filterName.trim(), filterDescription.trim() || undefined);
      setSaveFilterDialogOpen(false);
      setFilterName('');
      setFilterDescription('');
    }
  }, [onSaveFilter, filterName, filterDescription]);

  // Render filter field
  const renderFilterField = useCallback((field: FilterField) => {
    const activeFilter = getActiveFilter(field.id);
    const value = activeFilter?.value;

    switch (field.type) {
      case 'text':
        return (
          <Input
            value={(value as string) || ''}
            onChange={(e) => updateFilter(field.id, e.target.value)}
            placeholder={field.placeholder}
          />
        );

      case 'select':
        return (
          <Select
            value={(value as string) || ''}
            onValueChange={(val: string) => updateFilter(field.id, val)}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || 'Select...'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center justify-between w-full">
                    <span>{option.label}</span>
                    {option.count && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {option.count}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multiselect':
        const selectedValues = (value as string[]) || [];
        return (
          <div className="space-y-2">
            {field.options?.map(option => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedValues.includes(option.value)}
                  onCheckedChange={(checked: boolean) => {
                    const newValues = checked
                      ? [...selectedValues, option.value]
                      : selectedValues.filter(v => v !== option.value);
                    updateFilter(field.id, newValues);
                  }}
                />
                <Label className="text-sm flex items-center gap-2">
                  {option.label}
                  {option.count && (
                    <Badge variant="outline" className="text-xs">
                      {option.count}
                    </Badge>
                  )}
                </Label>
              </div>
            ))}
          </div>
        );

      case 'radio':
        return (
          <RadioGroup
            value={(value as string) || ''}
            onValueChange={(val: string) => updateFilter(field.id, val)}
          >
            {field.options?.map(option => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} />
                <Label className="text-sm">{option.label}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={(value as boolean) || false}
              onCheckedChange={(checked: boolean) => updateFilter(field.id, checked)}
            />
            <Label className="text-sm">{field.description || 'Enable'}</Label>
          </div>
        );

      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left">
                <Calendar className="mr-2 h-4 w-4" />
                {value ? format(value as Date, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComponent
                mode="single"
                selected={value as Date}
                onSelect={(date: Date | undefined) => date && updateFilter(field.id, date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );

      case 'daterange':
        const dateRange = value as { start: Date; end: Date } || {};
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateRange.start ? format(dateRange.start, 'MMM dd') : 'Start'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={dateRange.start}
                    onSelect={(date) => updateFilter(field.id, { ...dateRange, start: date! })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateRange.end ? format(dateRange.end, 'MMM dd') : 'End'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={dateRange.end}
                    onSelect={(date) => updateFilter(field.id, { ...dateRange, end: date! })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        );

      case 'number':
        return (
          <Input
            type="number"
            value={(value as number) || ''}
            onChange={(e) => updateFilter(field.id, parseInt(e.target.value) || 0)}
            min={field.min}
            max={field.max}
            step={field.step}
          />
        );

      case 'numberrange':
        const numberRange = value as { min: number; max: number } || { min: field.min || 0, max: field.max || 100 };
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={numberRange.min || ''}
                onChange={(e) => updateFilter(field.id, { ...numberRange, min: parseInt(e.target.value) || 0 })}
                min={field.min}
                max={field.max}
              />
              <Input
                type="number"
                placeholder="Max"
                value={numberRange.max || ''}
                onChange={(e) => updateFilter(field.id, { ...numberRange, max: parseInt(e.target.value) || 0 })}
                min={field.min}
                max={field.max}
              />
            </div>
          </div>
        );

      case 'slider':
        return (
          <div className="space-y-2">
            <Slider
              value={[value as number || field.min || 0]}
              onValueChange={(vals: number[]) => vals[0] !== undefined && updateFilter(field.id, vals[0])}
              min={field.min || 0}
              max={field.max || 100}
              step={field.step || 1}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{field.min}</span>
              <span className="font-medium">{String(value || field.min)}</span>
              <span>{field.max}</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  }, [getActiveFilter, updateFilter]);

  // Active filters summary
  const activeFiltersCount = activeFilters.length;

  // Filter content
  const filterContent = (
    <div className="space-y-6">
      {/* Quick filters */}
      {showQuickFilters && quickFilters.length > 0 && (
        <div>
          <h4 className="font-medium text-sm mb-3">Quick Filters</h4>
          <div className="grid grid-cols-1 gap-2">
            {quickFilters.map(quickFilter => {
              const IconComponent = quickFilter.icon;
              return (
                <Button
                  key={quickFilter.id}
                  variant="outline"
                  size="sm"
                  onClick={() => applyQuickFilter(quickFilter)}
                  className="justify-start"
                >
                  {IconComponent && <IconComponent className="h-4 w-4 mr-2" />}
                  {quickFilter.label}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Saved filters */}
      {showSavedFilters && savedFilters.length > 0 && (
        <div>
          <h4 className="font-medium text-sm mb-3">Saved Filters</h4>
          <div className="space-y-2">
            {savedFilters.map(savedFilter => (
              <div
                key={savedFilter.id}
                className="flex items-center justify-between p-2 border rounded hover:bg-muted/50"
              >
                <div className="flex-1 cursor-pointer" onClick={() => onLoadFilter?.(savedFilter.id)}>
                  <p className="font-medium text-sm">{savedFilter.name}</p>
                  {savedFilter.description && (
                    <p className="text-xs text-muted-foreground">{savedFilter.description}</p>
                  )}
                </div>
                {onDeleteSavedFilter && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteSavedFilter(savedFilter.id)}
                    className="h-6 w-6 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter fields by category */}
      {Object.entries(fieldsByCategory).map(([category, categoryFields]) => (
        <Collapsible
          key={category}
          open={expandedCategories.has(category)}
          onOpenChange={() => toggleCategory(category)}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded">
            <h4 className="font-medium text-sm">{category}</h4>
            {expandedCategories.has(category) ? 
              <ChevronDown className="h-4 w-4" /> : 
              <ChevronRight className="h-4 w-4" />
            }
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-2">
            {categoryFields.map(field => (
              <div key={field.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{field.label}</Label>
                  {getActiveFilter(field.id) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFilter(field.id)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {renderFilterField(field)}
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      ))}

      {/* Actions */}
      <div className="space-y-2 pt-4 border-t">
        {activeFiltersCount > 0 && (
          <Button variant="outline" onClick={clearAllFilters} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Clear All ({activeFiltersCount})
          </Button>
        )}

        {onSaveFilter && activeFiltersCount > 0 && (
          <Dialog open={saveFilterDialogOpen} onOpenChange={setSaveFilterDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Save Filter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Filter</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="filterName">Filter Name</Label>
                  <Input
                    id="filterName"
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    placeholder="Enter filter name..."
                  />
                </div>
                <div>
                  <Label htmlFor="filterDescription">Description (optional)</Label>
                  <Textarea
                    id="filterDescription"
                    value={filterDescription}
                    onChange={(e) => setFilterDescription(e.target.value)}
                    placeholder="Describe what this filter is for..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSaveFilterDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveFilter} disabled={!filterName.trim()}>
                    Save Filter
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );

  // Modal variant
  if (variant === 'modal') {
    return (
      <>
        <Button variant="outline" onClick={() => setIsOpen(true)} className={className}>
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge className="ml-2" variant="secondary">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Advanced Filters</DialogTitle>
            </DialogHeader>
            {filterContent}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Inline variant
  if (variant === 'inline') {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filterContent}
        </CardContent>
      </Card>
    );
  }

  // Sidebar variant (default)
  return (
    <div className={cn('w-64 border-r bg-background', className)}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </h3>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary">
              {activeFiltersCount}
            </Badge>
          )}
        </div>
        {filterContent}
      </div>
    </div>
  );
};

export default AdvancedFilters;