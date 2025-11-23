"use client";

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ScrollControls } from '@react-three/drei';
import { MainExperience } from '@/components/webgl/scenes/animated/MainExperience';

export default function AnimatedLandingPage() {
  return (
    <div className="relative w-full h-screen bg-purple-950 overflow-y-auto">
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
        <section className="h-screen w-full flex flex-col justify-center items-center p-8 md:p-20 pointer-events-auto">
          <div className="mb-4 flex items-center gap-2 px-3 py-1 border border-purple-300/30 rounded-full bg-purple-900/50 backdrop-blur-sm">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-xs font-mono text-purple-300 tracking-widest">SYSTEM ONLINE</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-sans font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-purple-300 mb-6 tracking-tight leading-tight text-center">
            INTELLIGENT<br />CONTRACTS
          </h1>
          <div className="flex flex-col md:flex-row gap-8 mt-8 border-t border-b border-purple-500/20 py-6 bg-purple-900/40 backdrop-blur-md">
            <div className="flex flex-col items-center px-6">
              <span className="text-3xl font-mono text-white mb-1">2.5M+</span>
              <span className="text-xs font-mono text-purple-500 tracking-wider">CONTRACTS PROCESSED</span>
            </div>
            <div className="flex flex-col items-center px-6">
              <span className="text-3xl font-mono text-white mb-1">87%</span>
              <span className="text-xs font-mono text-purple-500 tracking-wider">TIME SAVED</span>
            </div>
            <div className="flex flex-col items-center px-6">
              <span className="text-3xl font-mono text-white mb-1">94%</span>
              <span className="text-xs font-mono text-purple-500 tracking-wider">RISK REDUCTION</span>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="h-screen w-full flex flex-col justify-center items-start p-8 md:p-20 pointer-events-auto">
          <div className="max-w-xl">
            <h2 className="text-4xl font-sans font-bold text-purple-100 mb-6">Data Flow Landscape</h2>
            <p className="text-lg text-purple-300 leading-relaxed font-light mb-8">
              Visualize your entire contract repository as a living data landscape.
              Our neural engines process volume, risk, and value in real-time,
              turning static documents into actionable terrain.
            </p>
          </div>
        </section>

        {/* Agents Section */}
        <section className="h-screen w-full flex flex-col justify-center items-end p-8 md:p-20 pointer-events-auto">
          <div className="max-w-xl">
            <h2 className="text-4xl font-sans font-bold text-purple-100 mb-10 text-right">The Agent Constellation</h2>
            <div className="space-y-6">
              <div className="group relative p-6 border-r-2 border-purple-500/30 hover:border-purple-300 bg-gradient-to-l from-purple-900/80 to-transparent transition-all">
                <h3 className="text-xl font-mono text-white text-right">Contract Analyst</h3>
                <p className="text-purple-500 text-sm mt-1 text-right">Extracts meta-data instantly</p>
              </div>
              <div className="group relative p-6 border-r-2 border-purple-500/30 hover:border-purple-300 bg-gradient-to-l from-purple-900/80 to-transparent transition-all">
                <h3 className="text-xl font-mono text-white text-right">Vendor Intel</h3>
                <p className="text-purple-500 text-sm mt-1 text-right">Predicts vendor risk</p>
              </div>
              <div className="group relative p-6 border-r-2 border-purple-500/30 hover:border-purple-300 bg-gradient-to-l from-purple-900/80 to-transparent transition-all">
                <h3 className="text-xl font-mono text-white text-right">Legal Ops</h3>
                <p className="text-purple-500 text-sm mt-1 text-right">Automates workflow routing</p>
              </div>
              <div className="group relative p-6 border-r-2 border-purple-500/30 hover:border-purple-300 bg-gradient-to-l from-purple-900/80 to-transparent transition-all">
                <h3 className="text-xl font-mono text-white text-right">Compliance</h3>
                <p className="text-purple-500 text-sm mt-1 text-right">Enforces regulatory frameworks</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="h-screen w-full flex flex-col justify-center items-center p-8 md:p-20 pointer-events-auto">
          <h2 className="text-5xl md:text-7xl font-sans font-bold text-white mb-8 text-center">
            CONVERGENCE<br />POINT
          </h2>
          <p className="text-xl text-purple-300 max-w-2xl text-center mb-12 font-light">
            Join the network of forward-thinking legal operations teams utilizing
            Pactwise to decode the future of agreements.
          </p>
          <button className="group relative px-8 py-4 bg-purple-500 text-purple-900 font-bold font-mono tracking-widest hover:bg-white transition-colors duration-300">
            <span className="relative z-10 flex items-center gap-2">
              INITIATE_ACCESS
            </span>
          </button>
        </section>
      </div>
    </div>
  );
}
