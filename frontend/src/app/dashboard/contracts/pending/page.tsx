'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function PendingContractsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/contracts?status=pending_analysis');
  }, [router]);

  return (
    <div className="min-h-screen bg-ghost-100 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" showText text="Redirecting..." />
        <p className="mt-4 font-mono text-xs text-ghost-600">
          Redirecting to pending contracts...
        </p>
      </div>
    </div>
  );
}
