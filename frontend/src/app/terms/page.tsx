import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Header Bar */}
      <div className="border-b border-ghost-300 bg-white px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
            Terms of Service
          </h1>
          <Link href="/auth/sign-up">
            <Button
              variant="ghost"
              size="sm"
              className="font-mono text-xs uppercase tracking-wider hover:bg-ghost-100"
            >
              <ArrowLeft className="mr-2 h-3 w-3" />
              Back to Sign Up
            </Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-white border border-ghost-300 p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-semibold text-purple-900 mb-3">Terms of Service</h2>
            <p className="font-mono text-xs text-ghost-700">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="space-y-8">
            <div className="border-l-2 border-purple-500 pl-6">
              <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700 mb-3">
                1. Acceptance of Terms
              </h3>
              <p className="text-sm text-ghost-700 leading-relaxed">
                By accessing and using Pactwise, you agree to be bound by these Terms of Service.
              </p>
            </div>

            <div className="border-l-2 border-purple-500 pl-6">
              <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700 mb-3">
                2. Use of Service
              </h3>
              <p className="text-sm text-ghost-700 leading-relaxed">
                You may use our service for lawful purposes only. You agree not to use the service in any way that violates any applicable laws or regulations.
              </p>
            </div>

            <div className="border-l-2 border-purple-500 pl-6">
              <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700 mb-3">
                3. Account Responsibilities
              </h3>
              <p className="text-sm text-ghost-700 leading-relaxed">
                You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
              </p>
            </div>

            <div className="border-l-2 border-purple-500 pl-6">
              <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700 mb-3">
                4. Privacy
              </h3>
              <p className="text-sm text-ghost-700 leading-relaxed">
                Your use of our service is also governed by our Privacy Policy. Please review our Privacy Policy to understand our practices.
              </p>
            </div>

            <div className="border-l-2 border-purple-500 pl-6">
              <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700 mb-3">
                5. Contact Information
              </h3>
              <p className="text-sm text-ghost-700 leading-relaxed">
                If you have any questions about these Terms, please contact us at{' '}
                <a href="mailto:legal@pactwise.com" className="text-purple-900 hover:text-purple-500 font-mono">
                  legal@pactwise.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}