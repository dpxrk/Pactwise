"use client";

import { Canvas } from '@react-three/fiber';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Shield, Clock, FileCheck, TrendingUp, ChevronDown, Phone, Mail, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { Suspense, useRef, useEffect, useState } from 'react';

import { LenisProvider, useLenis } from '@/components/providers/LenisProvider';
import { PactwiseLogoPremium } from '@/components/ui/PactwiseLogo';
import { MainExperience } from '@/components/webgl/scenes/animated/MainExperience';
import { QualityProvider } from '@/contexts/QualityContext';


// ============================================
// NAVIGATION
// ============================================
function Navigation() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const { scrollProgress } = useLenis();

  useEffect(() => {
    setScrolled(scrollProgress > 0.02);
  }, [scrollProgress]);

  return (
    <motion.nav
      className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-white/10'
          : 'bg-transparent'
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <motion.div
            className="cursor-pointer"
            onClick={() => router.push('/')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <PactwiseLogoPremium size="lg" variant={scrolled ? 'light' : 'light'} />
          </motion.div>

          <div className="hidden md:flex items-center gap-8">
            {[
              { label: 'Why', href: '#why' },
              { label: 'How', href: '#how' },
              { label: 'What', href: '#what' },
            ].map((item, i) => (
              <motion.a
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-white/70 hover:text-white transition-colors relative group"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white/60 group-hover:w-full transition-all duration-300" />
              </motion.a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              onClick={() => router.push('/auth/sign-in')}
              className="hidden md:inline-flex px-4 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Sign In
            </motion.button>
            <motion.button
              onClick={() => router.push('/auth/sign-up')}
              className="relative inline-flex items-center px-5 py-2.5 bg-white text-[#0a0a0f] text-sm font-semibold rounded-full overflow-hidden group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="relative z-10">Get Started</span>
              <motion.div
                className="absolute inset-0 bg-gray-200"
                initial={{ x: '-100%' }}
                whileHover={{ x: 0 }}
                transition={{ duration: 0.3 }}
              />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}

// ============================================
// GOLDEN CIRCLE STORYTELLING: WHY → HOW → WHAT
// ============================================

// ============================================
// HERO SECTION (Opening - Sets up the WHY)
// ============================================
function HeroSection() {
  const router = useRouter();
  const { scrollProgress } = useLenis();
  const heroOpacity = Math.max(0, 1 - scrollProgress * 4);
  const heroY = scrollProgress * 100;

  return (
    <section
      className="relative min-h-screen flex items-center justify-center pt-16"
      style={{ opacity: heroOpacity, transform: `translateY(${heroY}px)` }}
    >
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-white/80">Trusted by 50+ Enterprise Legal Teams</span>
          </motion.div>

          {/* Headline - The WHY hook */}
          <motion.h1
            className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-6 leading-[0.9]"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <span className="block">Your Legal Team</span>
            <span className="block bg-gradient-to-r from-white via-gray-200 to-white bg-clip-text text-transparent">
              Deserves Better
            </span>
          </motion.h1>

          {/* Subtitle - The Problem */}
          <motion.p
            className="text-xl md:text-2xl text-white/60 mb-10 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Because brilliant legal minds shouldn&apos;t spend 60-hour weeks
            drowning in repetitive contract reviews.
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <motion.button
              onClick={() => router.push('/auth/sign-up')}
              className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#0a0a0f] font-semibold rounded-full overflow-hidden"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="relative z-10">See the Difference</span>
              <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
              <motion.div
                className="absolute inset-0 bg-gray-100"
                initial={{ x: '-100%' }}
                whileHover={{ x: 0 }}
                transition={{ duration: 0.4 }}
              />
            </motion.button>

            <motion.button
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/20 text-white font-medium rounded-full hover:bg-white/5 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Play className="w-5 h-5" />
              Watch Story
            </motion.button>
          </motion.div>

          {/* Trust Badges */}
          <motion.div
            className="flex flex-wrap justify-center gap-6 text-white/40 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            {['SOC2 Type II', 'GDPR Compliant', 'ISO 27001', '99.9% Uptime'].map((badge) => (
              <div key={badge} className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>{badge}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <ChevronDown className="w-8 h-8 text-white/40" />
      </motion.div>
    </section>
  );
}

// ============================================
// STATS SECTION (Floating)
// ============================================
function StatsOverlay() {
  const { scrollProgress } = useLenis();
  const showStats = scrollProgress > 0.08 && scrollProgress < 0.25;

  const stats = [
    { value: '87%', label: 'Time Saved' },
    { value: '98%', label: 'Cost Reduction' },
    { value: '10K+', label: 'Contracts/Hour' },
    { value: '99.7%', label: 'Accuracy Rate' },
  ];

  return (
    <AnimatePresence>
      {showStats && (
        <motion.div
          className="fixed top-1/2 right-8 -translate-y-1/2 z-30 space-y-4"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 50 }}
          transition={{ duration: 0.5 }}
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="text-right"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="text-3xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-white/50 uppercase tracking-wider">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================
// Helper function for smooth section opacity
// ============================================
function calculateSectionOpacity(
  scrollProgress: number,
  sectionStart: number,
  sectionEnd: number,
  fadeInDuration: number = 0.03,
  fadeOutDuration: number = 0.03
): number {
  // Not in range at all
  if (scrollProgress < sectionStart || scrollProgress > sectionEnd) return 0;

  // Fade in
  const fadeInEnd = sectionStart + fadeInDuration;
  if (scrollProgress < fadeInEnd) {
    return (scrollProgress - sectionStart) / fadeInDuration;
  }

  // Fade out
  const fadeOutStart = sectionEnd - fadeOutDuration;
  if (scrollProgress > fadeOutStart) {
    return (sectionEnd - scrollProgress) / fadeOutDuration;
  }

  // Fully visible
  return 1;
}

// ============================================
// WHY SECTION - The Belief & Problem
// "We believe legal teams should be strategists, not paper pushers"
// ============================================
function WhySection() {
  const { scrollProgress } = useLenis();
  const sectionStart = 0.18;
  const sectionEnd = 0.38;
  const opacity = calculateSectionOpacity(scrollProgress, sectionStart, sectionEnd);
  const isVisible = opacity > 0;

  const beliefs = [
    {
      icon: Clock,
      problem: 'The Old Way',
      belief: 'The New Reality',
      oldText: '60-hour weeks reviewing contracts',
      newText: 'Strategic work that matters',
    },
    {
      icon: Shield,
      problem: 'The Old Way',
      belief: 'The New Reality',
      oldText: 'Compliance anxiety and missed risks',
      newText: 'Peace of mind with 99.7% accuracy',
    },
    {
      icon: FileCheck,
      problem: 'The Old Way',
      belief: 'The New Reality',
      oldText: 'Manual data extraction for days',
      newText: 'Instant insights in seconds',
    },
    {
      icon: TrendingUp,
      problem: 'The Old Way',
      belief: 'The New Reality',
      oldText: 'Reactive firefighting',
      newText: 'Proactive risk prevention',
    },
  ];

  if (!isVisible) return null;

  return (
    <motion.section
      id="why"
      className="fixed inset-0 flex items-center justify-center z-20 pointer-events-none"
      style={{ opacity }}
    >
      <div className="container mx-auto px-6 pointer-events-auto">
        <motion.div
          className="max-w-5xl mx-auto"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="text-center mb-12">
            <motion.span
              className="inline-block px-4 py-1 rounded-full bg-white/5 text-white/70 text-sm mb-4 uppercase tracking-wider border border-white/10"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              Why We Exist
            </motion.span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              We Believe in <span className="text-white/80">Transformation</span>
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">
              Legal teams should be architects of business success, not drowning in paperwork.
              It&apos;s time to reclaim your expertise.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {beliefs.map((belief, i) => (
              <motion.div
                key={i}
                className="group relative p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/30 transition-all duration-500"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                    <belief.icon className="w-6 h-6 text-white/70" />
                  </div>
                  <div className="flex-1">
                    {/* Old way - crossed out */}
                    <div className="mb-3 opacity-60">
                      <span className="text-xs uppercase tracking-wider text-white/40">Before</span>
                      <p className="text-white/40 line-through decoration-red-400/50">{belief.oldText}</p>
                    </div>
                    {/* New reality */}
                    <div>
                      <span className="text-xs uppercase tracking-wider text-emerald-400/80">After</span>
                      <p className="text-white font-medium">{belief.newText}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}

// ============================================
// HOW SECTION - The Method & Approach
// "AI agents that amplify your expertise"
// ============================================
function HowSection() {
  const { scrollProgress } = useLenis();
  const sectionStart = 0.42;
  const sectionEnd = 0.62;
  const opacity = calculateSectionOpacity(scrollProgress, sectionStart, sectionEnd);
  const isVisible = opacity > 0;

  const agents = [
    {
      name: 'Contract Analyst',
      role: 'The Meticulous Reviewer',
      description: 'Extracts every detail so you never miss a clause',
    },
    {
      name: 'Vendor Intelligence',
      role: 'The Relationship Manager',
      description: 'Predicts issues before they become problems',
    },
    {
      name: 'Legal Operations',
      role: 'The Workflow Architect',
      description: 'Routes and automates for maximum efficiency',
    },
    {
      name: 'Compliance Guardian',
      role: 'The Vigilant Protector',
      description: 'Ensures nothing falls through the cracks',
    },
  ];

  if (!isVisible) return null;

  return (
    <motion.section
      id="how"
      className="fixed inset-0 flex items-center justify-center z-20 pointer-events-none"
      style={{ opacity }}
    >
      <div className="container mx-auto px-6 pointer-events-auto">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <motion.span
              className="inline-block px-4 py-1 rounded-full bg-white/5 text-white/70 text-sm mb-4 uppercase tracking-wider border border-white/10"
            >
              How We Do It
            </motion.span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Your AI <span className="text-white/80">Agent Team</span>
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">
              Four specialized AI agents working together—not to replace you,
              but to amplify your expertise.
            </p>
          </div>

          {/* Agent Cards in a connected flow */}
          <div className="relative">
            {/* Connection lines */}
            <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent hidden md:block" />

            <div className="grid md:grid-cols-4 gap-4">
              {agents.map((agent, i) => (
                <motion.div
                  key={agent.name}
                  className="relative text-center p-5 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/30 transition-all"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                >
                  {/* Numbered badge */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white text-[#0a0a0f] flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </div>

                  <h3 className="text-lg font-semibold text-white mt-2">{agent.name}</h3>
                  <p className="text-white/60 text-sm mb-2">{agent.role}</p>
                  <p className="text-white/40 text-sm">{agent.description}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Process flow indicator */}
          <motion.div
            className="mt-10 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <p className="text-white/40 text-sm">
              Upload → Analyze → Route → Protect → <span className="text-white/70">Transform</span>
            </p>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}

// ============================================
// WHAT SECTION - The Product & Results
// "Here's what you get - and the proof it works"
// ============================================
function WhatSection() {
  const { scrollProgress } = useLenis();
  const sectionStart = 0.68;
  const sectionEnd = 0.82;
  const opacity = calculateSectionOpacity(scrollProgress, sectionStart, sectionEnd);
  const isVisible = opacity > 0;

  const metrics = [
    { value: '87%', label: 'Time Saved', detail: 'From 60-hour to 8-hour weeks' },
    { value: '$18M', label: 'Cost Reduced', detail: 'Across our customer base' },
    { value: '99.7%', label: 'Accuracy', detail: 'AI-powered precision' },
    { value: '10K+', label: 'Contracts/Hour', detail: 'Processing capacity' },
  ];

  if (!isVisible) return null;

  return (
    <motion.section
      id="what"
      className="fixed inset-0 flex items-center justify-center z-20 pointer-events-none"
      style={{ opacity }}
    >
      <div className="container mx-auto px-6 pointer-events-auto">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <motion.span
              className="inline-block px-4 py-1 rounded-full bg-white/5 text-white/70 text-sm mb-4 uppercase tracking-wider border border-white/10"
            >
              What You Get
            </motion.span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Real Results, <span className="text-white/80">Proven Impact</span>
            </h2>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {metrics.map((metric, i) => (
              <motion.div
                key={metric.label}
                className="text-center p-5 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="text-3xl md:text-4xl font-bold text-white mb-1">{metric.value}</div>
                <div className="text-white/70 font-medium text-sm">{metric.label}</div>
                <div className="text-white/40 text-xs mt-1">{metric.detail}</div>
              </motion.div>
            ))}
          </div>

          {/* Testimonial */}
          <motion.div
            className="p-8 rounded-2xl bg-white/5 border border-white/10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <blockquote className="text-xl md:text-2xl text-white/80 italic mb-6 text-center">
              &ldquo;We went from drowning in paperwork to having strategic conversations.
              Pactwise didn&apos;t just save us time—it changed how we work.&rdquo;
            </blockquote>
            <div className="text-center">
              <p className="text-white font-semibold">Sarah Chen</p>
              <p className="text-white/50 text-sm">General Counsel, Fortune 500 Tech Company</p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}

// ============================================
// CTA SECTION - The Invitation
// "Start your transformation journey"
// ============================================
function CTASection() {
  const router = useRouter();
  const { scrollProgress } = useLenis();
  // Smooth fade in for CTA section (starts at 0.85, fully visible by 0.88)
  const sectionStart = 0.85;
  const opacity = Math.min(1, Math.max(0, (scrollProgress - sectionStart) / 0.03));
  const isVisible = opacity > 0;

  if (!isVisible) return null;

  return (
    <motion.section
      className="fixed inset-0 flex items-center justify-center z-20 pointer-events-none"
      style={{ opacity }}
    >
      <div className="container mx-auto px-6 pointer-events-auto">
        <motion.div
          className="max-w-3xl mx-auto text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Story recap */}
          <motion.p
            className="text-white/60 text-lg mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            You&apos;ve seen the WHY. You understand the HOW. You know the WHAT.
          </motion.p>

          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Now It&apos;s Time to <span className="text-white/80">Transform</span>
          </h2>
          <p className="text-xl text-white/50 mb-10">
            Join the legal teams who reclaimed their weekends and became strategic partners.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <motion.button
              onClick={() => router.push('/auth/sign-up')}
              className="group relative inline-flex items-center justify-center gap-2 px-10 py-5 bg-white text-[#0a0a0f] text-lg font-semibold rounded-full overflow-hidden"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="relative z-10">Start Your Journey</span>
              <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
            </motion.button>

            <motion.a
              href="mailto:sales@pactwise.com"
              className="inline-flex items-center justify-center gap-2 px-10 py-5 border border-white/20 text-white font-medium rounded-full hover:bg-white/5 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Mail className="w-5 h-5" />
              Talk to Us
            </motion.a>
          </div>

          <div className="flex items-center justify-center gap-6 text-sm text-white/40">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              <span>1-800-PACTWISE</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <span>sales@pactwise.com</span>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}

// ============================================
// SCROLL PROGRESS INDICATOR - Golden Circle Journey
// ============================================
function ScrollProgressBar() {
  const { scrollProgress } = useLenis();

  const sections = [
    { label: 'START', position: 0 },
    { label: 'WHY', position: 0.18 },
    { label: 'HOW', position: 0.42 },
    { label: 'WHAT', position: 0.68 },
    { label: 'JOIN', position: 0.85 },
  ];

  return (
    <div className="fixed left-6 top-1/2 -translate-y-1/2 z-50 hidden lg:block">
      <div className="relative h-48 w-1">
        {/* Track */}
        <div className="absolute inset-0 bg-white/10 rounded-full" />

        {/* Progress */}
        <motion.div
          className="absolute top-0 left-0 w-full bg-white/60 rounded-full"
          style={{ height: `${scrollProgress * 100}%` }}
        />

        {/* Section markers */}
        {sections.map((section) => (
          <div
            key={section.label}
            className="absolute left-4 -translate-y-1/2"
            style={{ top: `${section.position * 100}%` }}
          >
            <div
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                scrollProgress >= section.position
                  ? 'bg-white scale-125'
                  : 'bg-white/30'
              }`}
            />
            <span
              className={`absolute left-4 text-[10px] font-medium tracking-wider whitespace-nowrap transition-colors ${
                scrollProgress >= section.position ? 'text-white/70' : 'text-white/30'
              }`}
            >
              {section.label}
            </span>
          </div>
        ))}
      </div>

      {/* Percentage */}
      <div className="mt-4 text-center">
        <span className="text-xs font-mono text-white/40">
          {Math.round(scrollProgress * 100)}%
        </span>
      </div>
    </div>
  );
}

// ============================================
// MAIN CONTENT WRAPPER
// ============================================
function LandingContent() {
  const { scrollProgress } = useLenis();
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="relative min-h-[600vh]">
      {/* Fixed Full-Screen Canvas */}
      <div className="fixed inset-0 z-0">
        <Canvas
          camera={{ position: [0, 0, 12], fov: 60 }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
            stencil: false,
          }}
          dpr={[1, 2]}
        >
          <Suspense fallback={null}>
            <MainExperience scrollProgress={scrollProgress} />
          </Suspense>
        </Canvas>
      </div>

      {/* Navigation */}
      <Navigation />

      {/* Scroll Progress */}
      <ScrollProgressBar />

      {/* Stats Overlay */}
      <StatsOverlay />

      {/* Content Sections - Golden Circle: WHY → HOW → WHAT */}
      <HeroSection />
      <WhySection />
      <HowSection />
      <WhatSection />
      <CTASection />
    </div>
  );
}

// ============================================
// PAGE EXPORT
// ============================================
export default function ImmersiveLandingPage() {
  return (
    <QualityProvider>
      <LenisProvider>
        <LandingContent />
      </LenisProvider>
    </QualityProvider>
  );
}
