"use client";

import React from 'react';

export const AuroraBackground: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={`aurora ${className || ''}`}>
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute w-[200%] h-[200%] top-[-50%] left-[-50%]"
          style={{
            background: `
              radial-gradient(ellipse at 20% 80%, rgba(20, 184, 166, 0.15) 0%, transparent 50%),
              radial-gradient(ellipse at 80% 20%, rgba(6, 182, 212, 0.15) 0%, transparent 50%),
              radial-gradient(ellipse at 40% 40%, rgba(168, 85, 247, 0.1) 0%, transparent 50%)
            `,
            animation: 'aurora-wave 20s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-[200%] h-[200%] top-[-50%] left-[-50%]"
          style={{
            background: `
              radial-gradient(ellipse at 60% 70%, rgba(20, 184, 166, 0.1) 0%, transparent 50%),
              radial-gradient(ellipse at 30% 30%, rgba(6, 182, 212, 0.1) 0%, transparent 50%)
            `,
            animation: 'aurora-wave 25s ease-in-out infinite reverse',
          }}
        />
      </div>
    </div>
  );
};