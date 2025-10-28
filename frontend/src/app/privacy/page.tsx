import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Header Bar */}
      <div className="border-b border-ghost-300 bg-white px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
            Privacy Policy
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
            <h2 className="text-3xl font-semibold text-purple-900 mb-3">Privacy Policy</h2>
            <p className="font-mono text-xs text-ghost-700">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="space-y-8">
            <div className="border-l-2 border-purple-500 pl-6">
              <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700 mb-3">
                1. Information We Collect
              </h3>
              <p className="text-sm text-ghost-700 leading-relaxed">
                We collect information you provide directly to us, such as when you create an account, upload contracts, or contact us for support.
              </p>
            </div>

            <div className="border-l-2 border-purple-500 pl-6">
              <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700 mb-3">
                2. How We Use Your Information
              </h3>
              <p className="text-sm text-ghost-700 leading-relaxed">
                We use the information we collect to provide, maintain, and improve our services, process transactions, and communicate with you.
              </p>
            </div>

            <div className="border-l-2 border-purple-500 pl-6">
              <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700 mb-3">
                3. Data Security
              </h3>
              <p className="text-sm text-ghost-700 leading-relaxed">
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
              </p>
            </div>

            <div className="border-l-2 border-purple-500 pl-6">
              <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700 mb-3">
                4. Data Retention
              </h3>
              <p className="text-sm text-ghost-700 leading-relaxed">
                We retain your information for as long as necessary to provide our services and fulfill the purposes outlined in this privacy policy.
              </p>
            </div>

            <div className="border-l-2 border-purple-500 pl-6">
              <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700 mb-3">
                5. Your Rights
              </h3>
              <p className="text-sm text-ghost-700 leading-relaxed">
                You have the right to access, update, or delete your personal information. You may also opt-out of certain communications from us.
              </p>
            </div>

            <div className="border-l-2 border-purple-500 pl-6">
              <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700 mb-3">
                6. Contact Us
              </h3>
              <p className="text-sm text-ghost-700 leading-relaxed">
                If you have any questions about this Privacy Policy, please contact us at{' '}
                <a href="mailto:privacy@pactwise.com" className="text-purple-900 hover:text-purple-500 font-mono">
                  privacy@pactwise.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}