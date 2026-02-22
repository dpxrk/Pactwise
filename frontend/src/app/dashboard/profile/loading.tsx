import { SkeletonLoader } from '@/components/loading';

export default function ProfileLoading() {
  return (
    <div className="p-6 space-y-6">
      <SkeletonLoader variant="form" />
    </div>
  );
}
