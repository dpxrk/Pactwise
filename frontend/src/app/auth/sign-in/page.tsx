"use client";

import { motion } from "framer-motion";
import { TrendingUp, Shield, Users, Zap } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { ModernSignInForm } from "@/components/auth/ModernSignInForm";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding (2/3 of screen) */}
      <div
        className="hidden lg:flex lg:w-2/3 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #000000 0%, #291528 50%, #3a3e3b 100%)",
        }}
      >
        {/* Gradient mesh background - using new palette colors */}
        <div className="absolute inset-0">
          <div
            className="absolute top-20 left-10 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"
            style={{ background: "#9e829c" }}
          ></div>
          <div
            className="absolute top-40 right-20 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"
            style={{ background: "#f0eff4" }}
          ></div>
          <div
            className="absolute bottom-20 left-1/2 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-blob animation-delay-4000"
            style={{ background: "#291528" }}
          ></div>
        </div>

        {/* Content Container */}
        <div className="relative z-10 w-full max-w-2xl mx-auto p-16 flex flex-col justify-center">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-16"
          >
            <Link href="/" className="inline-block">
              <div className="text-4xl font-bold" style={{ color: "#f0eff4" }}>
                Pactwise
              </div>
            </Link>
          </motion.div>

          {/* Main Heading */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-12"
          >
            <h1
              className="text-6xl font-bold leading-tight mb-6"
              style={{ color: "#f0eff4" }}
            >
              Transform your contract management
            </h1>
            <p
              className="text-2xl leading-relaxed"
              style={{ color: "#9e829c" }}
            >
              Join leading enterprises using AI-powered insights to streamline
              operations and reduce risk.
            </p>
          </motion.div>

          {/* Feature List */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-2 gap-6 mb-16"
          >
            <div className="flex items-start gap-4">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(158, 130, 156, 0.2)" }}
              >
                <Shield className="w-6 h-6" style={{ color: "#9e829c" }} />
              </div>
              <div>
                <div
                  className="font-semibold mb-1"
                  style={{ color: "#f0eff4" }}
                >
                  Enterprise Security
                </div>
                <div
                  className="text-sm opacity-80"
                  style={{ color: "#9e829c" }}
                >
                  Bank-grade encryption & compliance
                </div>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(158, 130, 156, 0.2)" }}
              >
                <Zap className="w-6 h-6" style={{ color: "#9e829c" }} />
              </div>
              <div>
                <div
                  className="font-semibold mb-1"
                  style={{ color: "#f0eff4" }}
                >
                  Lightning Fast
                </div>
                <div
                  className="text-sm opacity-80"
                  style={{ color: "#9e829c" }}
                >
                  AI analysis in seconds, not hours
                </div>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(158, 130, 156, 0.2)" }}
              >
                <Users className="w-6 h-6" style={{ color: "#9e829c" }} />
              </div>
              <div>
                <div
                  className="font-semibold mb-1"
                  style={{ color: "#f0eff4" }}
                >
                  Team Collaboration
                </div>
                <div
                  className="text-sm opacity-80"
                  style={{ color: "#9e829c" }}
                >
                  Real-time workflow management
                </div>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(158, 130, 156, 0.2)" }}
              >
                <TrendingUp className="w-6 h-6" style={{ color: "#9e829c" }} />
              </div>
              <div>
                <div
                  className="font-semibold mb-1"
                  style={{ color: "#f0eff4" }}
                >
                  Smart Analytics
                </div>
                <div
                  className="text-sm opacity-80"
                  style={{ color: "#9e829c" }}
                >
                  Data-driven insights & reporting
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="grid grid-cols-3 gap-8 mb-16"
          >
            <div>
              <div
                className="text-2xl font-bold mb-2"
                style={{ color: "#f0eff4" }}
              >
                2.5M+
              </div>
              <div
                className="text-sm uppercase tracking-wider opacity-70"
                style={{ color: "#9e829c" }}
              >
                Contracts Analyzed
              </div>
            </div>
            <div>
              <div
                className="text-2xl font-bold mb-2"
                style={{ color: "#f0eff4" }}
              >
                99.7%
              </div>
              <div
                className="text-sm uppercase tracking-wider opacity-70"
                style={{ color: "#9e829c" }}
              >
                Accuracy Rate
              </div>
            </div>
            <div>
              <div
                className="text-2xl font-bold mb-2"
                style={{ color: "#f0eff4" }}
              >
                500+
              </div>
              <div
                className="text-sm uppercase tracking-wider opacity-70"
                style={{ color: "#9e829c" }}
              >
                Enterprise Clients
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Sign In Form (1/3 of screen) */}
      <div
        className="w-full lg:w-1/3 flex items-center justify-center p-8"
        style={{ background: "#f0eff4" }}
      >
        {/* Mobile logo */}
        <div className="lg:hidden absolute top-8 left-8">
          <Link
            href="/"
            className="text-2xl font-bold"
            style={{ color: "#291528" }}
          >
            Pactwise
          </Link>
        </div>

        {/* Form container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <Suspense
            fallback={
              <div className="flex justify-center">
                <div
                  className="w-8 h-8 border-2 rounded-full animate-spin"
                  style={{ borderColor: "#9e829c", borderTopColor: "#291528" }}
                />
              </div>
            }
          >
            <ModernSignInForm />
          </Suspense>
        </motion.div>
      </div>
    </div>
  );
}
