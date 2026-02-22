'use client';

import { useRouter } from 'next/navigation';

import { FallbackError } from '@/components/errors';

export default function AgentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <FallbackError
      message="Something went wrong"
      description="An unexpected error occurred in the agents section. Please try again."
      technicalDetails={error.message}
      actions={[
        { label: 'Try again', onClick: reset, primary: true },
        { label: 'Go to Dashboard', onClick: () => router.push('/dashboard') },
      ]}
    />
  );
}
