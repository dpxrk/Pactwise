import { requireAdminAuth } from '@/lib/auth/middleware';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import UserManagementClient from './UserManagementClient';

export default async function UsersPage() {
  // Verify admin access
  const adminUser = await requireAdminAuth();
  
  // Fetch all users using service role
  const supabase = await createAdminSupabaseClient();
  
  const { data: users, error } = await supabase
    .from('users')
    .select(`
      *,
      enterprises (
        id,
        name,
        domain
      )
    `)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Failed to fetch users:', error);
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-admin-primary text-white">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">User Management</h1>
              <p className="text-admin-accent text-sm">
                Manage all platform users
              </p>
            </div>
            <nav className="flex items-center space-x-4">
              <a href="/" className="hover:text-admin-accent transition-colors">
                Dashboard
              </a>
              <a href="/enterprises" className="hover:text-admin-accent transition-colors">
                Enterprises
              </a>
              <a href="/system" className="hover:text-admin-accent transition-colors">
                System
              </a>
            </nav>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <UserManagementClient 
          initialUsers={users || []} 
          currentAdminId={adminUser.id}
        />
      </main>
    </div>
  );
}