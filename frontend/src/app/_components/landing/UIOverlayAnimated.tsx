"use client";

import React from 'react';
import { Scroll } from '@react-three/drei';
import { Terminal, Shield, Cpu, Activity, ArrowRight } from 'lucide-react';
import type { Agent } from '@/components/webgl/scenes/animated/MainExperience';

const AGENTS: Agent[] = [
  { id: '1', name: 'Contract Analyst', role: 'Analysis', description: 'Extracts meta-data instantly', color: '#dab5d5' },
  { id: '2', name: 'Vendor Intel', role: 'Intelligence', description: 'Predicts vendor risk', color: '#9e829c' },
  { id: '3', name: 'Legal Ops', role: 'Operations', description: 'Automates workflow routing', color: '#c388bb' },
  { id: '4', name: 'Compliance', role: 'Guardian', description: 'Enforces regulatory frameworks', color: '#f0eff4' },
];

interface Metric {
  label: string;
  value: string;
}

const METRICS: Metric[] = [
  { label: 'CONTRACTS PROCESSED', value: '2.5M+' },
  { label: 'TIME SAVED', value: '87%' },
  { label: 'RISK REDUCTION', value: '94%' },
];

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

const Section: React.FC<SectionProps> = ({ children, className = "", align = "center" }) => {
  const alignClass = align === "left" ? "items-start text-left" : align === "right" ? "items-end text-right" : "items-center text-center";
  return (
    <section className={`h-screen w-full flex flex-col justify-center p-8 md:p-20 ${alignClass} ${className}`}>
      {children}
    </section>
  );
};

export const UIOverlayAnimated: React.FC = () => {
  return (
    <Scroll html style={{ width: '100%' }}>

      {/* Hero Section */}
      <Section align="center">
        <div className="mb-4 flex items-center gap-2 px-3 py-1 border border-purple-300/30 rounded-full bg-purple-900/50 backdrop-blur-sm">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          <span className="text-xs font-mono text-purple-300 tracking-widest">SYSTEM ONLINE</span>
        </div>
        <h1 className="text-6xl md:text-8xl font-sans font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-purple-300 mb-6 tracking-tight leading-tight">
          INTELLIGENT<br />CONTRACTS
        </h1>
        <div className="flex flex-col md:flex-row gap-8 mt-8 border-t border-b border-purple-500/20 py-6 bg-purple-900/40 backdrop-blur-md">
          {METRICS.map((m, i) => (
            <div key={i} className="flex flex-col items-center px-6">
              <span className="text-3xl font-mono text-white mb-1">{m.value}</span>
              <span className="text-xs font-mono text-purple-500 tracking-wider">{m.label}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Features Section */}
      <Section align="left">
        <div className="max-w-xl">
          <h2 className="text-4xl font-sans font-bold text-purple-100 mb-6">Data Flow Landscape</h2>
          <p className="text-lg text-purple-300 leading-relaxed font-light mb-8">
            Visualize your entire contract repository as a living data landscape.
            Our neural engines process volume, risk, and value in real-time,
            turning static documents into actionable terrain.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border border-purple-500/30 bg-purple-900/50 backdrop-blur rounded">
              <Activity className="w-6 h-6 text-purple-500 mb-2" />
              <h3 className="font-mono text-sm text-white">LIVE MONITORING</h3>
            </div>
            <div className="p-4 border border-purple-500/30 bg-purple-900/50 backdrop-blur rounded">
              <Terminal className="w-6 h-6 text-purple-500 mb-2" />
              <h3 className="font-mono text-sm text-white">AUTO-EXECUTION</h3>
            </div>
          </div>
        </div>
      </Section>

      {/* Agents Section */}
      <Section align="right">
        <div className="max-w-xl">
          <h2 className="text-4xl font-sans font-bold text-purple-100 mb-10">The Agent Constellation</h2>
          <div className="space-y-6">
            {AGENTS.map((agent) => (
              <div key={agent.id} className="group relative p-6 border-r-2 border-purple-500/30 hover:border-purple-300 bg-gradient-to-l from-purple-900/80 to-transparent transition-all">
                <h3 className="text-xl font-mono text-white flex items-center gap-3 justify-end">
                  {agent.name}
                  {agent.id === '1' && <Cpu className="w-4 h-4" />}
                  {agent.id === '4' && <Shield className="w-4 h-4" />}
                </h3>
                <p className="text-purple-500 text-sm mt-1">{agent.description}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* CTA Section */}
      <Section align="center">
        <h2 className="text-5xl md:text-7xl font-sans font-bold text-white mb-8 text-center">
          CONVERGENCE<br />POINT
        </h2>
        <p className="text-xl text-purple-300 max-w-2xl text-center mb-12 font-light">
          Join the network of forward-thinking legal operations teams utilizing
          Pactwise to decode the future of agreements.
        </p>
        <button className="group relative px-8 py-4 bg-purple-500 text-purple-900 font-bold font-mono tracking-widest hover:bg-white transition-colors duration-300">
          <span className="relative z-10 flex items-center gap-2">
            INITIATE_ACCESS <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </span>
          <div className="absolute inset-0 bg-purple-300 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
        </button>

        <footer className="absolute bottom-10 text-purple-500 font-mono text-xs">
          PACTWISE SYSTEMS © {new Date().getFullYear()} | TERMINAL V.2.0.4
        </footer>
      </Section>

    </Scroll>
  );
};
