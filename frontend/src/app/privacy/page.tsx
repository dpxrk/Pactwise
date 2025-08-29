import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
          <div className="prose prose-gray max-w-none">
            <p className="text-muted-foreground mb-4">
              Last updated: {new Date().toLocaleDateString()}
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-3">1. Information We Collect</h2>
            <p className="mb-4">
              We collect information you provide directly to us, such as when you create an account, upload contracts, or contact us for support.
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-3">2. How We Use Your Information</h2>
            <p className="mb-4">
              We use the information we collect to provide, maintain, and improve our services, process transactions, and communicate with you.
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-3">3. Data Security</h2>
            <p className="mb-4">
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-3">4. Data Retention</h2>
            <p className="mb-4">
              We retain your information for as long as necessary to provide our services and fulfill the purposes outlined in this privacy policy.
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-3">5. Your Rights</h2>
            <p className="mb-4">
              You have the right to access, update, or delete your personal information. You may also opt-out of certain communications from us.
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-3">6. Contact Us</h2>
            <p className="mb-4">
              If you have any questions about this Privacy Policy, please contact us at privacy@pactwise.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}