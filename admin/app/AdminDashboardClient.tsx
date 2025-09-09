"use client";

import { useRouter } from "next/navigation";

// Simple date formatting function to replace date-fns
function formatTimeAgo(date: string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffMins > 0) {
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  } else {
    return 'just now';
  }
}

interface Stats {
  totalUsers: number;
  totalEnterprises: number;
  totalContracts: number;
  totalRevenue: number;
}

interface RecentUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
  enterprises?: {
    name: string;
  };
}

interface AdminDashboardClientProps {
  stats: Stats;
  recentUsers: RecentUser[];
}

export default function AdminDashboardClient({ 
  stats, 
  recentUsers 
}: AdminDashboardClientProps) {
  const router = useRouter();
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-admin-primary text-white">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Pactwise Admin Portal</h1>
            <nav className="flex items-center space-x-6">
              <a href="/" className="hover:text-admin-accent transition-colors">
                Dashboard
              </a>
              <a href="/users" className="hover:text-admin-accent transition-colors">
                Users
              </a>
              <a href="/enterprises" className="hover:text-admin-accent transition-colors">
                Enterprises
              </a>
              <a href="/system" className="hover:text-admin-accent transition-colors">
                System
              </a>
              <a 
                href={process.env.NEXT_PUBLIC_APP_URL || "https://pactwise.io"}
                className="ml-6 px-4 py-2 bg-admin-accent rounded hover:bg-opacity-80 transition-colors"
              >
                Main App →
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Total Users</h3>
            <p className="text-3xl font-bold text-admin-primary">{stats.totalUsers}</p>
            <p className="text-xs text-gray-500 mt-2">Platform-wide users</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Enterprises</h3>
            <p className="text-3xl font-bold text-admin-primary">{stats.totalEnterprises}</p>
            <p className="text-xs text-gray-500 mt-2">Active organizations</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Active Contracts</h3>
            <p className="text-3xl font-bold text-admin-primary">{stats.totalContracts}</p>
            <p className="text-xs text-gray-500 mt-2">Currently active</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Total Contract Value</h3>
            <p className="text-3xl font-bold text-admin-primary">
              ${stats.totalRevenue.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-2">Across all contracts</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => router.push("/users")}
              className="p-4 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Manage Users
            </button>
            <button
              onClick={() => router.push("/enterprises")}
              className="p-4 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Manage Enterprises
            </button>
            <button
              onClick={() => router.push("/system/logs")}
              className="p-4 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              View Logs
            </button>
            <button
              onClick={() => router.push("/system/health")}
              className="p-4 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              System Health
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Users</h2>
            <div className="space-y-3">
              {recentUsers.length > 0 ? (
                recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">
                        {user.first_name && user.last_name 
                          ? `${user.first_name} ${user.last_name}` 
                          : user.email}
                      </p>
                      <p className="text-sm text-gray-500">
                        {user.enterprises?.name || 'No enterprise'}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatTimeAgo(user.created_at)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No recent users</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">System Status</h2>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
                <div className="flex-1">
                  <p className="font-medium">All systems operational</p>
                  <p className="text-sm text-gray-500">Database, API, and services running normally</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                <div className="flex-1">
                  <p className="font-medium">Supabase Connected</p>
                  <p className="text-sm text-gray-500">Backend services are responding</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}