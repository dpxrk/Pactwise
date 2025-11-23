"use client";

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ScrollControls } from '@react-three/drei';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { MainExperience } from '@/components/webgl/scenes/animated/MainExperience';
import { PactwiseLogoPremium } from '@/components/ui/PactwiseLogo';

export default function AnimatedLandingPage() {
  const router = useRouter();

  return (
    <div className="relative w-full h-screen bg-purple-950 overflow-y-auto">
      {/* Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 bg-purple-950/80 backdrop-blur-md border-b border-purple-500/30">
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
        >
          <Suspense fallback={null}>
            <ScrollControls pages={4} damping={0.1}>
              <MainExperience />
            </ScrollControls>
          </Suspense>
        </Canvas>
      </div>

      {/* HTML Overlay with Native Scroll */}
      <div className="relative z-10 pointer-events-none" style={{ height: '400vh' }}>
        {/* Hero Section */}
        <section className="h-screen w-full flex flex-col justify-center items-center p-8 md:p-20 pt-24 pointer-events-auto">
          <div className="mb-4 flex items-center gap-2 px-3 py-1 border border-purple-300/30 rounded-full bg-purple-900/50 backdrop-blur-sm">
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
          <div className="flex flex-col md:flex-row gap-8 mt-8 border-t border-b border-purple-500/20 py-6 bg-purple-900/40 backdrop-blur-md">
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
        </section>

        {/* Features Section */}
        <section className="h-screen w-full flex flex-col justify-center items-start p-8 md:p-20 pointer-events-auto">
          <div className="max-w-xl">
            <h2 className="text-4xl font-sans font-bold text-purple-100 mb-6">Neural Processing Engine</h2>
            <p className="text-lg text-purple-300 leading-relaxed font-light mb-8">
              Advanced transformer models process thousands of contracts simultaneously
              with sub-second response times. Multiple AI agents collaborate in real-time
              to solve complex contract challenges.
            </p>
            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="p-4 border border-purple-500/30 bg-purple-900/50 backdrop-blur rounded">
                <span className="text-2xl font-mono text-white block mb-2">10,000+</span>
                <span className="text-xs text-purple-300">contracts/hour</span>
              </div>
              <div className="p-4 border border-purple-500/30 bg-purple-900/50 backdrop-blur rounded">
                <span className="text-2xl font-mono text-white block mb-2">AI</span>
                <span className="text-xs text-purple-300">powered knowledge graph</span>
              </div>
            </div>
          </div>
        </section>

        {/* Agents Section */}
        <section className="h-screen w-full flex flex-col justify-center items-end p-8 md:p-20 pointer-events-auto">
          <div className="max-w-xl">
            <h2 className="text-4xl font-sans font-bold text-purple-100 mb-10 text-right">AI Agent Network</h2>
            <div className="space-y-6">
              <div className="group relative p-6 border-r-2 border-purple-500/30 hover:border-purple-300 bg-gradient-to-l from-purple-900/80 to-transparent transition-all">
                <h3 className="text-xl font-mono text-white text-right">Contract Analyst AI</h3>
                <p className="text-purple-300 text-sm mt-1 text-right">Advanced NLP for context understanding, critical term extraction, and risk identification</p>
              </div>
              <div className="group relative p-6 border-r-2 border-purple-500/30 hover:border-purple-300 bg-gradient-to-l from-purple-900/80 to-transparent transition-all">
                <h3 className="text-xl font-mono text-white text-right">Vendor Intelligence AI</h3>
                <p className="text-purple-300 text-sm mt-1 text-right">Continuous monitoring with predictive analytics and autonomous relationship management</p>
              </div>
              <div className="group relative p-6 border-r-2 border-purple-500/30 hover:border-purple-300 bg-gradient-to-l from-purple-900/80 to-transparent transition-all">
                <h3 className="text-xl font-mono text-white text-right">Legal Operations AI</h3>
                <p className="text-purple-300 text-sm mt-1 text-right">Custom business logic and automated workflow handling for complex legal operations</p>
              </div>
              <div className="group relative p-6 border-r-2 border-purple-500/30 hover:border-purple-300 bg-gradient-to-l from-purple-900/80 to-transparent transition-all">
                <h3 className="text-xl font-mono text-white text-right">Compliance Guardian AI</h3>
                <p className="text-purple-300 text-sm mt-1 text-right">24/7 monitoring with automatic regulatory updates and policy enforcement</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="h-screen w-full flex flex-col justify-center items-center p-8 md:p-20 pointer-events-auto">
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
        </section>
      </div>
    </div>
  );
}
