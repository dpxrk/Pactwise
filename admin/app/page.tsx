import { requireAdminAuth } from '@/lib/auth/middleware';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import AdminDashboardClient from './AdminDashboardClient';

export default async function AdminDashboard() {
  // Verify admin access
  await requireAdminAuth();
  
  // Fetch dashboard stats using service role
  const supabase = await createAdminSupabaseClient();
  
  // Get total users count
  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);
  
  // Get total enterprises count
  const { count: totalEnterprises } = await supabase
    .from('enterprises')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);
  
  // Get total active contracts count
  const { count: totalContracts } = await supabase
    .from('contracts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .is('deleted_at', null);
  
  // Get total revenue (sum of contract values)
  const { data: revenueData } = await supabase
    .from('contracts')
    .select('value')
    .eq('status', 'active')
    .is('deleted_at', null);
  
  const totalRevenue = revenueData?.reduce((sum, contract) => 
    sum + (contract.value || 0), 0
  ) || 0;
  
  // Get recent activity
  const { data: recentUsers } = await supabase
    .from('users')
    .select('*, enterprises(name)')
    .order('created_at', { ascending: false })
    .limit(5);
  
  const stats = {
    totalUsers: totalUsers || 0,
    totalEnterprises: totalEnterprises || 0,
    totalContracts: totalContracts || 0,
    totalRevenue,
  };

  return <AdminDashboardClient stats={stats} recentUsers={recentUsers || []} />;
}
