'use client';

import dynamic from 'next/dynamic';

// Dynamically import the optimized landing page with no SSR
const OptimizedLandingPage = dynamic(
  () => import('./OptimizedLandingPage'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }
);

export default function Page() {
  return <OptimizedLandingPage />;
}