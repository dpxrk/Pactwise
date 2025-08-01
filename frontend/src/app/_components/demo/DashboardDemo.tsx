"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Circle, 
  Play, 
  RotateCcw,
  Sparkles,
  Move,
  Settings2
} from "lucide-react";

export function DashboardDemo() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const demoSteps = [
    {
      title: "Welcome to Your Customizable Dashboard",
      description: "This dashboard features drag-and-drop metric cards that you can customize to your needs.",
      action: "Start Demo",
      icon: Sparkles,
    },
    {
      title: "Drag & Drop Metrics",
      description: "Hover over any metric card to see the drag handle. Click and drag to reorder your metrics.",
      action: "Next",
      icon: Move,
    },
    {
      title: "Customize Your View",
      description: "Click the settings icon in the top right to open the customization menu.",
      action: "Next",
      icon: Settings2,
    },
    {
      title: "Toggle Metrics On/Off",
      description: "In the customization menu, you can toggle individual metrics on or off to show only what matters to you.",
      action: "Next",
      icon: CheckCircle2,
    },
    {
      title: "Save Your Preferences",
      description: "Your dashboard layout is automatically saved and will persist across sessions.",
      action: "Complete",
      icon: CheckCircle2,
    },
  ];

  const handleNext = () => {
    if (currentStep < demoSteps.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setIsAnimating(false);
      }, 300);
    }
  };

  const handleReset = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(0);
      setIsAnimating(false);
    }, 300);
  };

  const currentStepData = demoSteps[currentStep];
  const Icon = currentStepData.icon;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">Dashboard Customization Guide</CardTitle>
          <Badge variant="outline" className="ml-2">
            Step {currentStep + 1} of {demoSteps.length}
          </Badge>
        </div>
        <CardDescription>
          Learn how to customize your dashboard with drag-and-drop functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Indicator */}
        <div className="flex items-center justify-center space-x-2">
          {demoSteps.map((_, index) => (
            <div
              key={index}
              className={`transition-all duration-300 ${
                index === currentStep
                  ? "w-8 h-2 bg-primary rounded-full"
                  : index < currentStep
                  ? "w-2 h-2 bg-primary rounded-full"
                  : "w-2 h-2 bg-gray-300 rounded-full"
              }`}
            />
          ))}
        </div>

        {/* Current Step Content */}
        <div 
          className={`space-y-4 transition-all duration-300 ${
            isAnimating ? "opacity-0 transform translate-y-2" : "opacity-100 transform translate-y-0"
          }`}
        >
          <div className="flex items-center justify-center p-8">
            <Icon className="w-16 h-16 text-primary" />
          </div>
          
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold">{currentStepData.title}</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {currentStepData.description}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center space-x-4 pt-4">
          {currentStep === demoSteps.length - 1 ? (
            <Button 
              onClick={handleReset}
              variant="outline"
              className="min-w-[120px]"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Start Over
            </Button>
          ) : (
            <Button 
              onClick={handleNext}
              className="min-w-[120px]"
            >
              {currentStep === 0 ? (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  {currentStepData.action}
                </>
              ) : (
                currentStepData.action
              )}
            </Button>
          )}
        </div>

        {/* Feature Highlights */}
        {currentStep === 0 && (
          <div className="border-t pt-6 mt-6">
            <h4 className="font-semibold mb-3">Key Features:</h4>
            <ul className="space-y-2">
              <li className="flex items-start">
                <CheckCircle2 className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Drag and drop metric cards to reorder your dashboard
                </span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Toggle individual metrics on or off
                </span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Preferences are automatically saved to your account
                </span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Reset to default layout at any time
                </span>
              </li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}