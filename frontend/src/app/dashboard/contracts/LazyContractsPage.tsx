'use client';

import dynamic from 'next/dynamic';
import { PremiumLoader } from '@/components/premium/PremiumLoader';

const AllContracts = dynamic(
  () => import('./page'),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <PremiumLoader size="lg" text="Loading contracts..." />
      </div>
    ),
    ssr: false
  }
);

export default AllContracts;