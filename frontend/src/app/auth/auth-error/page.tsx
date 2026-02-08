'use client';

import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-ghost-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Error Card */}
        <div className="bg-white border-2 border-error-600 p-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 border border-error-600">
                <AlertCircle className="h-6 w-6 text-error-600" />
              </div>
              <div>
                <h1 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                  ERROR
                </h1>
                <p className="text-xl font-semibold text-purple-900 mt-1">
                  Authentication Failed
                </p>
              </div>
            </div>
            <p className="text-sm text-ghost-700 border-l-2 border-error-600 pl-4">
              There was a problem with your authentication request
            </p>
          </div>

          {/* Error Details */}
          <div className="border border-ghost-300 p-4 mb-6">
            <p className="font-mono text-xs uppercase tracking-wider text-ghost-700 mb-3">
              POSSIBLE CAUSES
            </p>
            <ul className="space-y-2 text-sm text-ghost-700">
              <li className="flex items-start gap-2">
                <span className="text-ghost-500 mt-0.5">•</span>
                <span>The authentication link has expired</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-ghost-500 mt-0.5">•</span>
                <span>The link has already been used</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-ghost-500 mt-0.5">•</span>
                <span>There was a network error</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-ghost-500 mt-0.5">•</span>
                <span>Your session has timed out</span>
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-3 mb-6">
            <Link href="/auth/sign-in" className="block">
              <Button className="w-full bg-purple-900 hover:bg-purple-800 text-white border-0 font-mono text-xs uppercase tracking-wider">
                Try Signing In Again
              </Button>
            </Link>
            <Link href="/auth/reset-password" className="block">
              <Button variant="outline" className="w-full border-ghost-300 text-ghost-700 hover:bg-ghost-100 font-mono text-xs uppercase tracking-wider">
                Reset Password
              </Button>
            </Link>
          </div>

          {/* Support Link */}
          <div className="border-t border-ghost-300 pt-4">
            <p className="text-center text-xs text-ghost-700">
              If you continue to experience issues,{' '}
              <a
                href="mailto:support@pactwise.com"
                className="text-purple-900 hover:text-purple-500 font-mono uppercase tracking-wider"
              >
                contact support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}