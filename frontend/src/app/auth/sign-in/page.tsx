"use client";

import dynamic from 'next/dynamic';
import { TrendingUp, Shield, Users, Zap } from "lucide-react";
import Link from "next/link";
import React, { Suspense } from "react";

// Dynamic imports for heavy components
const MotionDiv = dynamic(() => import("framer-motion").then(mod => ({ default: mod.motion.div })), {
  loading: () => <div className="opacity-0"></div>,
  ssr: false
});

const ModernSignInForm = dynamic(() => import("@/components/auth/ModernSignInForm").then(mod => ({ default: mod.ModernSignInForm })), {
  loading: () => <div className="w-full max-w-sm p-8 bg-white border border-ghost-300"><div className="h-64 flex items-center justify-center"><div className="inline-block animate-spin h-8 w-8 border-2 border-purple-900 border-t-transparent"></div></div></div>,
  ssr: false
});

export default function SignInPage() {
  return (
    <div className="min-h-screen flex bg-ghost-100">
      {/* Left Panel - Branding (2/3 of screen) */}
      <div
        className="hidden lg:flex lg:w-2/3 relative overflow-hidden bg-purple-900"
      >
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 opacity-90" />

        {/* Content Container */}
        <div className="relative z-10 w-full max-w-2xl mx-auto p-16 flex flex-col justify-center">
          {/* Logo */}
          <Suspense fallback={<div className="mb-16 opacity-0"></div>}>
            <MotionDiv
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-16"
            >
              <Link href="/" className="inline-block">
                <div className="text-4xl font-bold text-white">
                  Pactwise
                </div>
              </Link>
            </MotionDiv>
          </Suspense>

          {/* Main Heading */}
          <Suspense fallback={<div className="mb-12 opacity-0"></div>}>
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-12"
            >
              <h1 className="text-6xl font-bold leading-tight mb-6 text-white">
                Transform your contract management
              </h1>
              <p className="text-2xl leading-relaxed text-purple-200">
                Join leading enterprises using AI-powered insights to streamline
                operations and reduce risk.
              </p>
            </MotionDiv>
          </Suspense>

          {/* Feature List */}
          <Suspense fallback={<div className="grid grid-cols-2 gap-6 mb-16 opacity-0"></div>}>
            <MotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-2 gap-6 mb-16"
            >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-white/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-purple-200" />
              </div>
              <div>
                <div className="font-semibold mb-1 text-white">
                  Enterprise Security
                </div>
                <div className="text-sm text-purple-200">
                  Bank-grade encryption & compliance
                </div>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-white/10 flex items-center justify-center">
                <Zap className="w-6 h-6 text-purple-200" />
              </div>
              <div>
                <div className="font-semibold mb-1 text-white">
                  Lightning Fast
                </div>
                <div className="text-sm text-purple-200">
                  AI analysis in seconds, not hours
                </div>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-white/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-200" />
              </div>
              <div>
                <div className="font-semibold mb-1 text-white">
                  Team Collaboration
                </div>
                <div className="text-sm text-purple-200">
                  Real-time workflow management
                </div>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-white/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-200" />
              </div>
              <div>
                <div className="font-semibold mb-1 text-white">
                  Smart Analytics
                </div>
                <div className="text-sm text-purple-200">
                  Data-driven insights & reporting
                </div>
              </div>
            </div>
          </MotionDiv>
          </Suspense>
        </div>
      </div>

      {/* Right Panel - Sign In Form (1/3 of screen) */}
      <div className="w-full lg:w-1/3 flex items-center justify-center p-8 bg-ghost-100">
        {/* Mobile logo */}
        <div className="lg:hidden absolute top-8 left-8">
          <Link
            href="/"
            className="text-2xl font-bold text-purple-900"
          >
            Pactwise
          </Link>
        </div>

        {/* Form container */}
        <Suspense fallback={<div className="w-full max-w-sm opacity-0"><div className="h-96"></div></div>}>
          <MotionDiv
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-sm"
          >
            <ModernSignInForm />
          </MotionDiv>
        </Suspense>
      </div>
    </div>
  );
}
