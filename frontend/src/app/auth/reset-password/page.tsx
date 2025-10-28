'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

import { ModernResetPasswordForm } from '@/components/auth/ModernResetPasswordForm';

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex bg-ghost-100">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-purple-900 text-white flex-col p-12">
        <div className="mb-12">
          <Link href="/" className="text-2xl font-mono font-bold tracking-tight">
            <span style={{ fontWeight: 400 }}>P</span>
            <span style={{ fontWeight: 300 }}>ACT</span>
            <span style={{ fontWeight: 200 }}>WISE</span>
          </Link>
        </div>

        <div className="flex-1 flex flex-col justify-center space-y-8">
          <div>
            <h1 className="font-mono text-xs uppercase tracking-wider text-purple-300 mb-4">
              PASSWORD RESET
            </h1>
            <p className="text-3xl font-light leading-tight mb-6">
              Secure Account Recovery
            </p>
            <p className="text-purple-200 leading-relaxed">
              Reset your password securely. Enter your email address and we'll send you instructions to create a new password.
            </p>
          </div>

          <div className="border-l-2 border-purple-500 pl-6 space-y-4">
            <div>
              <div className="font-mono text-xs uppercase tracking-wider text-purple-300 mb-2">
                SECURITY
              </div>
              <p className="text-sm text-purple-200">
                Enterprise-grade encryption protects your account
              </p>
            </div>
            <div>
              <div className="font-mono text-xs uppercase tracking-wider text-purple-300 mb-2">
                VERIFICATION
              </div>
              <p className="text-sm text-purple-200">
                Multi-factor authentication ensures account safety
              </p>
            </div>
          </div>
        </div>

        <div className="mt-auto">
          <div className="font-mono text-xs text-purple-400">
            PACTWISE ENTERPRISE PLATFORM
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col bg-ghost-100">
        {/* Header Bar */}
        <div className="border-b border-ghost-300 bg-white px-6 py-3">
          <Link
            href="/auth/sign-in"
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-ghost-700 hover:text-purple-900 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            BACK TO SIGN IN
          </Link>
        </div>

        {/* Form Content */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <Suspense fallback={
              <div className="bg-white border border-ghost-300 p-8">
                <div className="text-center">
                  <div className="inline-block animate-spin h-8 w-8 border-2 border-purple-900 border-t-transparent"></div>
                  <p className="mt-4 font-mono text-xs uppercase tracking-wider text-ghost-700">
                    LOADING...
                  </p>
                </div>
              </div>
            }>
              <ModernResetPasswordForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}