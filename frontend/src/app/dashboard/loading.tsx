export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Top Status Bar Skeleton */}
      <div className="border-b border-ghost-300 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-ghost-300 rounded-full animate-pulse" />
              <div className="h-3 w-32 bg-ghost-300 animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="h-3 w-24 bg-ghost-300 animate-pulse" />
            <div className="h-3 w-24 bg-ghost-300 animate-pulse" />
            <div className="h-3 w-24 bg-ghost-300 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="p-6 space-y-6">
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="border border-ghost-300 bg-white p-4">
              <div className="h-3 w-24 bg-ghost-300 mb-3 animate-pulse" />
              <div className="h-8 w-32 bg-ghost-300 mb-2 animate-pulse" />
              <div className="h-3 w-16 bg-ghost-300 animate-pulse" />
            </div>
          ))}
        </div>

        {/* Table Skeleton */}
        <div className="border border-ghost-300 bg-white">
          <div className="border-b border-ghost-300 px-4 py-3">
            <div className="h-3 w-40 bg-ghost-300 animate-pulse" />
          </div>
          <div className="p-4 space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-4 flex-1 bg-ghost-200 animate-pulse" />
                <div className="h-4 flex-1 bg-ghost-200 animate-pulse" />
                <div className="h-4 flex-1 bg-ghost-200 animate-pulse" />
                <div className="h-4 w-20 bg-ghost-200 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}