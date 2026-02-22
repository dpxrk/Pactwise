import { SkeletonLoader } from '@/components/loading';

export default function AgentsLoading() {
  return (
    <div className="p-6 space-y-6">
      <SkeletonLoader variant="stats" className="mb-6" />
      <SkeletonLoader variant="card" count={4} />
    </div>
  );
}
