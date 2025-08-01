'use client'

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { SelectRangeEventHandler } from "react-day-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange) => void;
  presets?: boolean;
  className?: string;
}

const PRESET_RANGES = [
  {
    label: "Last 7 days",
    value: "7d",
    getRange: () => ({
      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      to: new Date(),
    }),
  },
  {
    label: "Last 30 days",
    value: "30d",
    getRange: () => ({
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: new Date(),
    }),
  },
  {
    label: "Last 90 days",
    value: "90d",
    getRange: () => ({
      from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      to: new Date(),
    }),
  },
  {
    label: "This month",
    value: "month",
    getRange: () => {
      const now = new Date();
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      };
    },
  },
  {
    label: "This quarter",
    value: "quarter",
    getRange: () => {
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3);
      return {
        from: new Date(now.getFullYear(), quarter * 3, 1),
        to: new Date(now.getFullYear(), quarter * 3 + 3, 0),
      };
    },
  },
  {
    label: "This year",
    value: "year",
    getRange: () => ({
      from: new Date(new Date().getFullYear(), 0, 1),
      to: new Date(new Date().getFullYear(), 11, 31),
    }),
  },
  {
    label: "Last year",
    value: "last-year",
    getRange: () => {
      const lastYear = new Date().getFullYear() - 1;
      return {
        from: new Date(lastYear, 0, 1),
        to: new Date(lastYear, 11, 31),
      };
    },
  },
];

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  presets = true,
  className,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);

  const handlePresetChange = (presetValue: string) => {
    const preset = PRESET_RANGES.find(p => p.value === presetValue);
    if (preset && onChange) {
      const range = preset.getRange();
      onChange(range);
      setSelectedPreset(presetValue);
    }
  };

  const handleDateSelect: SelectRangeEventHandler = (range) => {
    if (range && onChange) {
      onChange({
        from: range.from,
        to: range.to
      });
      setSelectedPreset(""); // Clear preset when custom date is selected
    }
  };

  const handleClear = () => {
    if (onChange) {
      onChange({ from: undefined, to: undefined });
      setSelectedPreset("");
    }
  };

  const formatDateRange = () => {
    if (!value?.from) return "Select date range";
    
    if (value.from && !value.to) {
      return format(value.from, "MMM d, yyyy");
    }
    
    if (value.from && value.to) {
      return `${format(value.from, "MMM d, yyyy")} - ${format(value.to, "MMM d, yyyy")}`;
    }
    
    return "Select date range";
  };

  const hasSelection = value?.from || value?.to;

  return (
    <div className={cn("space-y-2", className)}>
      {presets && (
        <div className="flex items-center space-x-2">
          <Select value={selectedPreset} onValueChange={handlePresetChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Quick select" />
            </SelectTrigger>
            <SelectContent>
              {PRESET_RANGES.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedPreset && (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <span>{PRESET_RANGES.find(p => p.value === selectedPreset)?.label}</span>
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => {
                  setSelectedPreset("");
                  handleClear();
                }}
              />
            </Badge>
          )}
        </div>
      )}

      <div className="flex items-center space-x-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "min-w-[280px] justify-start text-left font-normal",
                !hasSelection && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatDateRange()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={value?.from || new Date()}
              selected={value}
              onSelect={handleDateSelect}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        {hasSelection && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-10 px-3"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {hasSelection && (
        <div className="text-sm text-muted-foreground">
          {value?.from && value?.to && (
            <span>
              {Math.ceil((value.to.getTime() - value.from.getTime()) / (1000 * 60 * 60 * 24))} days selected
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;