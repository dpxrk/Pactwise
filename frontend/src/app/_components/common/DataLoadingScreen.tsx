"use client";

import { Sparkles, Database, Shield, BarChart3 } from "lucide-react";
import React, { useEffect, useState } from "react";

interface DataLoadingScreenProps {
  onComplete?: () => void;
  minimumDuration?: number;
}

const DataLoadingScreen: React.FC<DataLoadingScreenProps> = ({ 
  onComplete, 
  minimumDuration = 2000 
}) => {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState(0);
  
  const loadingTasks = [
    { icon: Database, text: "Loading your contracts..." },
    { icon: Shield, text: "Verifying permissions..." },
    { icon: BarChart3, text: "Preparing analytics..." },
    { icon: Sparkles, text: "Finalizing dashboard..." }
  ];

  useEffect(() => {
    const startTime = Date.now();
    
    // Progress animation
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          const elapsedTime = Date.now() - startTime;
          if (elapsedTime >= minimumDuration) {
            clearInterval(progressInterval);
            setTimeout(() => {
              onComplete?.();
            }, 300);
          }
          return 100;
        }
        const increment = Math.max(3, Math.random() * 10 + 3);
        return Math.min(100, prev + increment);
      });
    }, 200);

    // Task rotation
    const taskInterval = setInterval(() => {
      setCurrentTask(prev => (prev + 1) % loadingTasks.length);
    }, 1000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(taskInterval);
    };
  }, [onComplete, minimumDuration, loadingTasks.length]);

  const CurrentIcon = loadingTasks[currentTask].icon;

  return (
    <div className="fixed inset-0 z-50 bg-[#f0eff4] flex items-center justify-center">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-[150%] h-[150%] bg-gradient-to-br from-[#291528]/5 via-transparent to-[#9e829c]/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-[150%] h-[150%] bg-gradient-to-tl from-[#291528]/5 via-transparent to-[#9e829c]/5 rounded-full blur-3xl animate-pulse animation-delay-1000" />
      </div>

      <div className="relative text-center max-w-md px-8">
        {/* Animated icon */}
        <div className="mb-8 animate-fade-in">
          <div className="inline-flex p-6 rounded-3xl bg-gradient-to-br from-[#291528] to-[#9e829c] animate-float relative">
            <CurrentIcon className="w-16 h-16 text-white" />
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#291528] to-[#9e829c] blur-xl opacity-30 animate-pulse" />
          </div>
        </div>

        {/* Loading text */}
        <h2 className="text-3xl font-bold text-[#291528] mb-2 animate-fade-in animation-delay-200">
          Welcome back
        </h2>
        <p className="text-lg text-[#3a3e3b] mb-8 animate-fade-in animation-delay-300">
          {loadingTasks[currentTask].text}
        </p>

        {/* Progress bar */}
        <div className="w-80 mx-auto animate-fade-in animation-delay-400">
          <div className="h-2 bg-[#9e829c]/20 rounded-full overflow-hidden backdrop-blur-sm">
            <div 
              className="h-full bg-gradient-to-r from-[#291528] via-[#9e829c] to-[#291528] rounded-full transition-all duration-300 ease-out relative"
              style={{ width: `${loadingProgress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </div>
          </div>
          
          {/* Progress percentage */}
          <div className="mt-4 flex justify-between items-center">
            <p className="text-sm text-[#9e829c]">
              Preparing your workspace...
            </p>
            <p className="text-sm text-[#3a3e3b] font-mono">
              {Math.round(loadingProgress)}%
            </p>
          </div>
        </div>

        {/* Pro tip */}
        <div className="mt-12 animate-fade-in animation-delay-600">
          <p className="text-xs text-[#9e829c] italic">
            Pro tip: Use keyboard shortcuts to navigate faster - press &apos;?&apos; to view all shortcuts
          </p>
        </div>
      </div>
    </div>
  );
};

export default DataLoadingScreen;