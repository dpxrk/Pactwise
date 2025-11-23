"use client";

import React from 'react';
import { X, Cpu, Zap, Activity, Shield } from 'lucide-react';
import { useTypewriter, useCounter } from '@/hooks/useLandingAnimations';

interface AgentDetailPanelProps {
  agent: {
    id: string;
    name: string;
    role: string;
    description: string;
    color: string;
    geometry?: string;
    details?: string[];
    stats?: { label: string; value: string }[];
  };
  onClose: () => void;
}

// Icon mapping for agent roles
const getRoleIcon = (role: string) => {
  switch (role.toLowerCase()) {
    case 'analysis':
      return <Cpu className="w-5 h-5" />;
    case 'intelligence':
      return <Activity className="w-5 h-5" />;
    case 'operations':
      return <Zap className="w-5 h-5" />;
    case 'guardian':
      return <Shield className="w-5 h-5" />;
    default:
      return <Cpu className="w-5 h-5" />;
  }
};

export const AgentDetailPanel: React.FC<AgentDetailPanelProps> = ({ agent, onClose }) => {
  const description = useTypewriter(agent.description, 20, 300);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center md:justify-end md:pr-12 pointer-events-none">
      {/* Backdrop with smooth fade in */}
      <div
        className="absolute inset-0 bg-purple-900/60 backdrop-blur-sm pointer-events-auto animate-fade-in"
        onClick={onClose}
      />

      {/* Floating HUD Card */}
      <div
        className="relative w-full max-w-md mx-4 md:mx-0 pointer-events-auto animate-zoom-in"
        style={{
          animation: 'zoomIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <div
          className="relative border-2 bg-ghost-50 p-8 shadow-2xl"
          style={{
            borderColor: agent.color,
          }}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-purple-50 transition-colors rounded"
            aria-label="Close panel"
          >
            <X className="w-5 h-5 text-ghost-700" />
          </button>

          {/* Header with Icon and Title */}
          <div className="flex items-start gap-4 mb-6">
            <div
              className="p-3 rounded"
              style={{ backgroundColor: agent.color + '20', color: agent.color }}
            >
              {getRoleIcon(agent.role)}
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-purple-900 mb-1">{agent.name}</h3>
              <p className="text-sm font-mono text-ghost-500 uppercase tracking-wider">
                {agent.role}
              </p>
            </div>
          </div>

          {/* Description with Typewriter Effect */}
          <div className="mb-6">
            <p className="text-ghost-700 text-base leading-relaxed font-mono">
              {description}
              <span className="animate-pulse">|</span>
            </p>
          </div>

          {/* Technical Details */}
          {agent.details && agent.details.length > 0 && (
            <div className="mb-6">
              <h4 className="text-xs font-mono text-ghost-500 uppercase tracking-wider mb-3">
                Technical Capabilities
              </h4>
              <ul className="space-y-2">
                {agent.details.map((detail, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-ghost-700 font-mono"
                    style={{
                      animation: `slideInLeft 0.4s ease-out ${index * 0.1 + 0.5}s backwards`,
                    }}
                  >
                    <span
                      className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0"
                      style={{ backgroundColor: agent.color }}
                    />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Performance Stats */}
          {agent.stats && agent.stats.length > 0 && (
            <div className="pt-6 border-t border-ghost-200">
              <div className="grid grid-cols-2 gap-4">
                {agent.stats.map((stat, index) => (
                  <StatItem
                    key={index}
                    label={stat.label}
                    value={stat.value}
                    color={agent.color}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Decorative Corner Elements */}
          <div
            className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2"
            style={{ borderColor: agent.color }}
          />
          <div
            className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2"
            style={{ borderColor: agent.color }}
          />
          <div
            className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2"
            style={{ borderColor: agent.color }}
          />
          <div
            className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2"
            style={{ borderColor: agent.color }}
          />
        </div>
      </div>

      {/* Inline Styles for Animations */}
      <style jsx>{`
        @keyframes zoomIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .animate-zoom-in {
          animation: zoomIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
};

// Stat Item Component with Counter Animation
interface StatItemProps {
  label: string;
  value: string;
  color: string;
}

const StatItem: React.FC<StatItemProps> = ({ label, value, color }) => {
  const animatedValue = useCounter(value, 1500);

  return (
    <div className="flex flex-col items-center group cursor-default">
      <span
        className="text-2xl font-mono font-bold mb-1 transition-colors"
        style={{ color: color }}
      >
        {animatedValue}
      </span>
      <span className="text-xs font-mono text-ghost-500 tracking-wider text-center">
        {label}
      </span>
    </div>
  );
};
