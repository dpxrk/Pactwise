"use client";

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ScrollControls } from '@react-three/drei';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { MainExperience } from '@/components/webgl/scenes/animated/MainExperience';
import { PactwiseLogoPremium } from '@/components/ui/PactwiseLogo';
import { InteractionProvider, useInteraction } from '@/contexts/InteractionContext';
import { AI_AGENTS } from '@/app/_components/landing/constants';

interface AnimatedLandingPageContentProps {
  onScrollInit?: (scrollFn: () => void) => void;
}

function AnimatedLandingPageContent({ onScrollInit }: AnimatedLandingPageContentProps) {
  const router = useRouter();
  const [scrollProgress, setScrollProgress] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const agentsSectionRef = React.useRef<HTMLDivElement>(null);
  const { activeAgentId, setActiveAgentId } = useInteraction();

  // Find the active agent
  const activeAgent = AI_AGENTS.find((agent) => agent.id === activeAgentId);

  // Scroll to AI Constellation section when agent is clicked
  const scrollToAgentSection = React.useCallback(() => {
    if (agentsSectionRef.current && containerRef.current) {
      const sectionTop = agentsSectionRef.current.offsetTop;
      containerRef.current.scrollTo({
        top: sectionTop,
        behavior: 'smooth'
      });
    }
  }, []);

  // Initialize scroll function for parent
  React.useEffect(() => {
    if (onScrollInit) {
      onScrollInit(scrollToAgentSection);
    }
  }, [onScrollInit, scrollToAgentSection]);

  React.useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        const scrollTop = containerRef.current.scrollTop;
        const scrollHeight = containerRef.current.scrollHeight - containerRef.current.clientHeight;
        const progress = scrollTop / scrollHeight;
        setScrollProgress(progress);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-screen bg-purple-950 overflow-y-auto">
      {/* Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 bg-purple-950/80 backdrop-blur-md border-b border-purple-500/30 pointer-events-auto">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="cursor-pointer" onClick={() => router.push('/')}>
              <PactwiseLogoPremium size="lg" variant="light" />
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/auth/sign-in')}
                className="hidden md:inline-flex px-6 py-2 border border-purple-300 text-purple-100 hover:bg-purple-800 hover:border-purple-200 transition-all duration-200 font-mono text-sm tracking-wider"
              >
                SIGN IN
              </button>
              <button
                onClick={() => router.push('/auth/sign-up')}
                className="inline-flex items-center gap-2 px-6 py-2 bg-purple-500 text-purple-900 hover:bg-white font-bold font-mono text-sm tracking-wider transition-all duration-200"
              >
                GET STARTED
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Fixed Canvas Background */}
      <div className="fixed inset-0 z-0">
        <Canvas
          camera={{ position: [0, 0, 10], fov: 75 }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
          }}
          eventSource={containerRef as React.MutableRefObject<HTMLElement>}
          eventPrefix="client"
        >
          <Suspense fallback={null}>
            <MainExperience scrollProgress={scrollProgress} />
          </Suspense>
        </Canvas>
      </div>

      {/* HTML Overlay with Native Scroll - pointer-events-none by default, enabled on content */}
      <div className="relative z-10" style={{ height: '400vh', pointerEvents: 'none' }}>
        {/* Hero Section */}
        <section className="h-screen w-full flex flex-col justify-center items-center p-8 md:p-20 pt-24">
          <div className="pointer-events-auto max-w-5xl">
            <div className="mb-4 flex items-center gap-2 px-3 py-1 border border-purple-300/30 rounded-full bg-purple-900/50 backdrop-blur-sm w-fit mx-auto">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-xs font-mono text-purple-300 tracking-widest">SYSTEM ONLINE</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-sans font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-purple-300 mb-6 tracking-tight leading-tight text-center">
              INTELLIGENT<br />SYSTEMS
            </h1>
            <p className="text-xl md:text-2xl text-purple-200 mb-8 max-w-3xl mx-auto leading-relaxed text-center">
              Transform your entire contract lifecycle. Analyze, negotiate, comply, and optimize—
              <span className="text-white font-semibold"> with unprecedented precision.</span>
            </p>
            <div className="flex flex-col md:flex-row gap-8 mt-8 border-t border-b border-purple-500/20 py-6 bg-purple-900/40 backdrop-blur-md w-fit mx-auto">
              <div className="flex flex-col items-center px-6">
                <span className="text-3xl font-mono text-white mb-1">150ms</span>
                <span className="text-xs font-mono text-purple-500 tracking-wider">AVG PROCESSING TIME</span>
              </div>
              <div className="flex flex-col items-center px-6">
                <span className="text-3xl font-mono text-white mb-1">24/7</span>
                <span className="text-xs font-mono text-purple-500 tracking-wider">AUTONOMOUS OPERATION</span>
              </div>
              <div className="flex flex-col items-center px-6">
                <span className="text-3xl font-mono text-white mb-1">SOC2</span>
                <span className="text-xs font-mono text-purple-500 tracking-wider">CERTIFIED</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="h-screen w-full flex flex-col justify-center items-start p-8 md:p-20">
          <div className="max-w-2xl pointer-events-auto">
            <h2 className="text-4xl font-sans font-bold text-purple-100 mb-6">Neural Processing Engine</h2>
            <p className="text-lg text-purple-300 leading-relaxed font-light mb-6">
              Advanced transformer models process thousands of contracts simultaneously
              with sub-second response times. Multiple AI agents collaborate in real-time
              to solve complex contract challenges.
            </p>
            <div className="space-y-3 mb-8 text-sm text-purple-400 font-mono">
              <div className="flex items-start gap-3">
                <span className="text-purple-500 select-none">→</span>
                <span>Distributed task queue with PostgreSQL-backed agent orchestration</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-purple-500 select-none">→</span>
                <span>Memory systems with 24h short-term and persistent long-term storage</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-purple-500 select-none">→</span>
                <span>Multi-tenant isolation with enterprise-level security (SOC2 Type II)</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-purple-500 select-none">→</span>
                <span>Real-time collaboration with live updates via Supabase Realtime</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="p-4 border border-purple-500/30 bg-purple-900/50 backdrop-blur">
                <span className="text-2xl font-mono text-white block mb-2">10,000+</span>
                <span className="text-xs text-purple-300 uppercase tracking-wider">contracts/hour</span>
              </div>
              <div className="p-4 border border-purple-500/30 bg-purple-900/50 backdrop-blur">
                <span className="text-2xl font-mono text-white block mb-2">99.9%</span>
                <span className="text-xs text-purple-300 uppercase tracking-wider">system uptime</span>
              </div>
            </div>
          </div>
        </section>

        {/* Agents Section */}
        <section ref={agentsSectionRef} className="h-screen w-full flex flex-col justify-center items-end p-8 md:p-20">
          <div className="max-w-2xl pointer-events-auto">
            <h2 className="text-4xl font-sans font-bold text-purple-100 mb-4 text-right">AI Constellation</h2>
            <p className="text-purple-300 text-sm mb-8 text-right font-mono">
              <span className="inline-flex items-center gap-2 px-3 py-1 border border-purple-400/50 bg-purple-900/80 rounded">
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                Click on the 3D agents to explore their capabilities
              </span>
            </p>
            <div className="space-y-4">
              {AI_AGENTS.map((agent) => {
                const isActive = activeAgentId === agent.id;
                return (
                  <div
                    key={agent.id}
                    className={`group relative p-6 border-r-2 transition-all cursor-default ${
                      isActive
                        ? 'border-purple-300 bg-gradient-to-l from-purple-800/90 to-purple-900/60 scale-105 shadow-lg shadow-purple-500/50'
                        : 'border-purple-500/30 hover:border-purple-300 bg-gradient-to-l from-purple-900/80 to-transparent'
                    }`}
                    style={{
                      borderRightColor: isActive ? agent.color : undefined
                    }}
                  >
                    <div className="flex items-start justify-end gap-3">
                      <div className="text-right flex-1">
                        <h3 className={`text-xl font-mono transition-colors ${isActive ? 'text-white' : 'text-white'}`}>
                          {agent.name}
                        </h3>
                        <p className={`text-sm mt-1 leading-relaxed transition-colors ${isActive ? 'text-purple-200' : 'text-purple-300'}`}>
                          {agent.description}
                        </p>
                        {agent.details && agent.details.length > 0 && (
                          <div className="mt-3 text-xs text-purple-400 space-y-1">
                            <div className="flex items-center justify-end gap-2">
                              <span>{agent.details[0]}</span>
                            </div>
                            {agent.details[1] && (
                              <div className="flex items-center justify-end gap-2">
                                <span>{agent.details[1]}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div
                        className={`w-3 h-3 rounded-sm flex-shrink-0 mt-1.5 transition-all ${
                          isActive ? 'opacity-100 scale-125' : 'opacity-60 group-hover:opacity-100'
                        }`}
                        style={{ backgroundColor: agent.color }}
                      />
                    </div>
                    {isActive && (
                      <div
                        className="absolute inset-0 rounded pointer-events-none"
                        style={{
                          boxShadow: `0 0 20px ${agent.color}40, inset 0 0 20px ${agent.color}20`
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="h-screen w-full flex flex-col justify-center items-center p-8 md:p-20">
          <div className="pointer-events-auto flex flex-col items-center">
            <h2 className="text-5xl md:text-7xl font-sans font-bold text-white mb-8 text-center">
              START<br />AUTOMATING
            </h2>
            <p className="text-xl text-purple-300 max-w-2xl text-center mb-12 font-light">
              Transform your contract lifecycle with intelligent automation.
              Join forward-thinking legal teams building the future of contract management.
            </p>
            <button
              onClick={() => router.push('/auth/sign-up')}
              className="group relative px-8 py-4 bg-purple-500 text-purple-900 font-bold font-mono tracking-widest hover:bg-white transition-colors duration-300 cursor-pointer"
            >
              <span className="relative z-10 flex items-center gap-2">
                GET STARTED
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
          </div>
        </section>
      </div>

    </div>
  );
}

// Wrap with InteractionProvider
export default function AnimatedLandingPage() {
  // Create scroll function at wrapper level
  const scrollToAgentRef = React.useRef<(() => void) | null>(null);

  const handleScrollToAgent = React.useCallback(() => {
    if (scrollToAgentRef.current) {
      scrollToAgentRef.current();
    }
  }, []);

  return (
    <InteractionProvider scrollToAgent={handleScrollToAgent}>
      <AnimatedLandingPageContent onScrollInit={(scrollFn) => { scrollToAgentRef.current = scrollFn; }} />
    </InteractionProvider>
  );
}
