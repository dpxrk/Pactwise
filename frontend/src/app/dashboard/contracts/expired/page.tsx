'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function ExpiredContractsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/contracts?status=expired');
  }, [router]);

  return (
    <div className="min-h-screen bg-ghost-100 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" showText text="Redirecting..." />
        <p className="mt-4 font-mono text-xs text-ghost-600">
          Redirecting to expired contracts...
        </p>
      </div>
    </div>
  );
}
