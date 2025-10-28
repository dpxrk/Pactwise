"use client";

import { motion } from "framer-motion";
import { Rocket, Lock, Clock, HeadphonesIcon } from "lucide-react";
import Link from "next/link";

import { ModernSignUpForm } from "@/components/auth/ModernSignUpForm";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding (2/3 of screen) */}
      <div
        className="hidden lg:flex lg:w-2/3 relative overflow-hidden bg-purple-900"
      >
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 opacity-90" />

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
              <div className="text-4xl font-bold text-white">
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
            <h1 className="text-6xl font-bold leading-tight mb-6 text-white">
              Start your free trial today
            </h1>
            <p className="text-2xl leading-relaxed text-purple-200">
              Join thousands of companies already transforming their contract
              management with AI-powered insights.
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
              <div className="flex-shrink-0 w-10 h-10 bg-white/10 flex items-center justify-center">
                <Rocket className="w-6 h-6 text-purple-200" />
              </div>
              <div>
                <div className="font-semibold mb-1 text-white">
                  Quick Setup
                </div>
                <div className="text-sm text-purple-200">
                  Get started in under 5 minutes
                </div>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-white/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-200" />
              </div>
              <div>
                <div className="font-semibold mb-1 text-white">
                  14-Day Free Trial
                </div>
                <div className="text-sm text-purple-200">
                  No credit card required
                </div>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-white/10 flex items-center justify-center">
                <Lock className="w-6 h-6 text-purple-200" />
              </div>
              <div>
                <div className="font-semibold mb-1 text-white">
                  Secure & Private
                </div>
                <div className="text-sm text-purple-200">
                  SOC 2 Type II certified
                </div>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-white/10 flex items-center justify-center">
                <HeadphonesIcon className="w-6 h-6 text-purple-200" />
              </div>
              <div>
                <div className="font-semibold mb-1 text-white">
                  24/7 Support
                </div>
                <div className="text-sm text-purple-200">
                  Expert help when you need it
                </div>
              </div>
            </div>
          </motion.div>

          {/* Testimonial */}
          {/* <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="p-8 rounded-2xl mb-16"
            style={{ background: "rgba(215, 206, 178, 0.1)" }}
          >
            <blockquote>
              <p
                className="text-lg leading-relaxed mb-4"
                style={{ color: "#f7f5f0" }}
              >
                "Pactwise transformed our contract management process. What used to take days now takes hours. The AI insights have helped us save over $2M in the first year alone."
              </p>
              <footer>
                <div
                  className="font-semibold"
                  style={{ color: "#f7f5f0" }}
                >
                  Sarah Chen
                </div>
                <div
                  className="text-sm opacity-70"
                  style={{ color: "#d7ceb2" }}
                >
                  Chief Legal Officer, TechCorp
                </div>
              </footer>
            </blockquote>
          </motion.div> */}

          {/* Bottom Link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <p className="text-sm text-purple-200">
              Already have an account?{" "}
              <Link
                href="/auth/sign-in"
                className="font-medium text-white hover:underline"
              >
                Sign in instead
              </Link>
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Sign Up Form (1/3 of screen) */}
      <div className="w-full lg:w-1/3 flex items-center justify-center p-8 bg-ghost-100">
        {/* Mobile logo */}
        <div className="lg:hidden absolute top-8 left-8">
          <Link href="/" className="text-2xl font-bold text-purple-900">
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
          <ModernSignUpForm />
        </motion.div>
      </div>
    </div>
  );
}
