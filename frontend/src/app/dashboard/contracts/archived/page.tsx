'use client'

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function ArchivedContractsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/contracts?status=archived');
  }, [router]);

  return (
    <div className="min-h-screen bg-ghost-100 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" showText text="Redirecting..." />
        <p className="mt-4 font-mono text-xs text-ghost-600">
          Redirecting to archived contracts...
        </p>
      </div>
    </div>
  );
}
