"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Settings2, RotateCcw, Save } from "lucide-react";
// import { useMutation } from "convex/react";
// import { api } from "../../../../convex/_generated/api";
// import { AVAILABLE_METRICS, MetricId } from "../../../../convex/dashboardPreferences";

// Temporary mock types and data - replace with actual implementation
type MetricId = string;
const AVAILABLE_METRICS = [
  { id: 'totalContracts', name: 'Total Contracts', type: 'metric', defaultEnabled: true },
  { id: 'activeVendors', name: 'Active Vendors', type: 'metric', defaultEnabled: true },
  { id: 'monthlySpend', name: 'Monthly Spend', type: 'chart', defaultEnabled: true },
];
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DashboardCustomizationMenuProps {
  enabledMetrics: MetricId[];
  onMetricsChange: (metrics: MetricId[]) => void;
}

export function DashboardCustomizationMenu({
  enabledMetrics,
  onMetricsChange,
}: DashboardCustomizationMenuProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [localEnabledMetrics, setLocalEnabledMetrics] = useState<MetricId[]>(enabledMetrics);
  
  // const savePreferences = useMutation(api.dashboardPreferences.saveUserPreferences);
  // const resetPreferences = useMutation(api.dashboardPreferences.resetUserPreferences);
  
  // Mock functions - replace with actual API calls
  const savePreferences = async (data: any) => console.log('Mock save:', data);
  const resetPreferences = async () => console.log('Mock reset');

  // Sync local state with props when dialog opens
  useEffect(() => {
    if (isDialogOpen) {
      setLocalEnabledMetrics(enabledMetrics);
    }
  }, [isDialogOpen, enabledMetrics]);

  const handleToggleMetric = (metricId: MetricId) => {
    setLocalEnabledMetrics((prev) => {
      if (prev.includes(metricId)) {
        return prev.filter((id) => id !== metricId);
      } else {
        return [...prev, metricId];
      }
    });
  };

  const handleSave = async () => {
    try {
      await savePreferences({
        enabledMetrics: localEnabledMetrics,
        metricOrder: localEnabledMetrics,
      });
      onMetricsChange(localEnabledMetrics);
      setIsDialogOpen(false);
      toast.success("Dashboard preferences saved");
    } catch (error) {
      toast.error("Failed to save preferences");
    }
  };

  const handleReset = async () => {
    try {
      await resetPreferences();
      const defaultMetrics = AVAILABLE_METRICS
        .filter((m) => m.defaultEnabled)
        .map((m) => m.id);
      setLocalEnabledMetrics(defaultMetrics);
      onMetricsChange(defaultMetrics);
      setIsDialogOpen(false);
      toast.success("Dashboard reset to default");
    } catch (error) {
      toast.error("Failed to reset preferences");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <Settings2 className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Dashboard Settings</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsDialogOpen(true)}>
            <Settings2 className="mr-2 h-4 w-4" />
            Customize Metrics
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to Default
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Customize Dashboard Metrics</DialogTitle>
            <DialogDescription>
              Choose which metrics to display on your dashboard. Drag metrics to reorder them.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-6">
              {/* Metric Cards Section */}
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-3">Metric Cards</h3>
                <div className="space-y-3">
                  {AVAILABLE_METRICS.filter(m => m.type === "metric").map((metric) => (
                    <div
                      key={metric.id}
                      className="flex items-center space-x-3"
                    >
                      <Checkbox
                        id={metric.id}
                        checked={localEnabledMetrics.includes(metric.id)}
                        onCheckedChange={() => handleToggleMetric(metric.id)}
                      />
                      <Label
                        htmlFor={metric.id}
                        className="text-sm font-normal cursor-pointer flex-1"
                      >
                        {metric.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chart Cards Section */}
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-3">Chart Cards</h3>
                <div className="space-y-3">
                  {AVAILABLE_METRICS.filter(m => m.type === "chart").map((metric) => (
                    <div
                      key={metric.id}
                      className="flex items-center space-x-3"
                    >
                      <Checkbox
                        id={metric.id}
                        checked={localEnabledMetrics.includes(metric.id)}
                        onCheckedChange={() => handleToggleMetric(metric.id)}
                      />
                      <Label
                        htmlFor={metric.id}
                        className="text-sm font-normal cursor-pointer flex-1"
                      >
                        {metric.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-between mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setLocalEnabledMetrics(enabledMetrics); // Reset to current state
                setIsDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <div className="space-x-2">
              <Button
                variant="outline"
                onClick={handleReset}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}