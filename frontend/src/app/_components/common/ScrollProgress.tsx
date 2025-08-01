"use client";

import React, { useEffect, useState } from "react";

const ScrollProgress = () => {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const updateScrollProgress = () => {
      const scrollTop = window.scrollY;
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (scrollTop / documentHeight) * 100;
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", updateScrollProgress);
    window.addEventListener("resize", updateScrollProgress);
    
    // Initial calculation
    updateScrollProgress();

    return () => {
      window.removeEventListener("scroll", updateScrollProgress);
      window.removeEventListener("resize", updateScrollProgress);
    };
  }, []);

  return (
    <>
      {/* Top progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 z-[60] pointer-events-none">
        <div className="relative h-full overflow-hidden">
          {/* Background track */}
          <div className="absolute inset-0 bg-white/5" />
          
          {/* Progress fill */}
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-500 transition-all duration-150 ease-out"
            style={{
              width: `${scrollProgress}%`,
              backgroundSize: '200% 100%',
              animation: 'gradient-shift 3s ease infinite'
            }}
          >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </div>
          
          {/* Leading edge glow */}
          <div
            className="absolute top-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-teal-400/50 blur-sm transition-all duration-150"
            style={{
              left: `calc(${scrollProgress}% - 2rem)`,
              opacity: scrollProgress > 0 && scrollProgress < 100 ? 1 : 0
            }}
          />
        </div>
      </div>

      {/* Right side dot indicator */}
      <div className="fixed right-8 top-1/2 -translate-y-1/2 z-50 hidden lg:block">
        <div className="relative">
          {/* Track */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10 -translate-x-1/2" />
          
          {/* Progress */}
          <div 
            className="absolute left-1/2 top-0 w-px bg-gradient-to-b from-teal-500 to-cyan-500 -translate-x-1/2 transition-all duration-300"
            style={{
              height: `${scrollProgress}%`
            }}
          />
          
          {/* Sections */}
          <div className="relative flex flex-col gap-8">
            {[
              { label: "Hero", id: "hero" },
              { label: "Process", id: "process" },
              { label: "Features", id: "features" },
              { label: "Pricing", id: "pricing" },
              { label: "Benefits", id: "benefits" },
              { label: "FAQ", id: "faq" }
            ].map((section, index) => {
              const sectionProgress = (index + 1) / 6 * 100;
              const isActive = scrollProgress >= sectionProgress - 10;
              
              return (
                <button
                  key={section.id}
                  onClick={() => {
                    const element = document.getElementById(section.id);
                    element?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="group relative"
                >
                  <div className={`
                    w-3 h-3 rounded-full transition-all duration-300
                    ${isActive 
                      ? 'bg-gradient-to-r from-teal-400 to-cyan-400 scale-125' 
                      : 'bg-white/20 hover:bg-white/40'
                    }
                  `}>
                    {isActive && (
                      <div className="absolute inset-0 rounded-full bg-teal-400 animate-ping" />
                    )}
                  </div>
                  
                  {/* Label on hover */}
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
                    <div className="relative">
                      <div className="absolute right-0 px-3 py-1 bg-black/80 backdrop-blur-sm rounded-lg text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {section.label}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default ScrollProgress;