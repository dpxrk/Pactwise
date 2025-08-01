import { PremiumLoader } from '@/components/premium/PremiumLoader';

export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <PremiumLoader size="lg" text="Loading dashboard..." />
    </div>
  );
}