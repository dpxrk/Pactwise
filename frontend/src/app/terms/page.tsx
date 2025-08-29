import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/auth/sign-up">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign Up
            </Button>
          </Link>
        </div>
        
        <div className="bg-card border rounded-lg p-8">
          <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
          <div className="prose prose-gray max-w-none">
            <p className="text-muted-foreground mb-4">
              Last updated: {new Date().toLocaleDateString()}
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-3">1. Acceptance of Terms</h2>
            <p className="mb-4">
              By accessing and using Pactwise, you agree to be bound by these Terms of Service.
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-3">2. Use of Service</h2>
            <p className="mb-4">
              You may use our service for lawful purposes only. You agree not to use the service in any way that violates any applicable laws or regulations.
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-3">3. Account Responsibilities</h2>
            <p className="mb-4">
              You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-3">4. Privacy</h2>
            <p className="mb-4">
              Your use of our service is also governed by our Privacy Policy. Please review our Privacy Policy to understand our practices.
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-3">5. Contact Information</h2>
            <p className="mb-4">
              If you have any questions about these Terms, please contact us at legal@pactwise.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}