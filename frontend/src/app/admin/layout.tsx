import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Pactwise Admin",
  description: "Administrative Dashboard for Pactwise",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  
  // Check authentication
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect("/auth/sign-in?redirectTo=/admin");
  }
  
  // Check if user has admin or owner role
  const { data: userProfile } = await supabase
    .from("users")
    .select("role, enterprise_id")
    .eq("auth_id", session.user.id)
    .single();
  
  if (!userProfile || !["admin", "owner"].includes(userProfile.role)) {
    redirect("/dashboard");
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Admin Sidebar */}
        <aside className="w-64 bg-gray-900 text-white min-h-screen">
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-8">Admin Portal</h1>
            <nav className="space-y-2">
              <a
                href="/admin"
                className="block px-4 py-2 rounded hover:bg-gray-800 transition-colors"
              >
                Dashboard
              </a>
              <a
                href="/admin/users"
                className="block px-4 py-2 rounded hover:bg-gray-800 transition-colors"
              >
                User Management
              </a>
              <a
                href="/admin/enterprises"
                className="block px-4 py-2 rounded hover:bg-gray-800 transition-colors"
              >
                Enterprise Management
              </a>
              <a
                href="/admin/system"
                className="block px-4 py-2 rounded hover:bg-gray-800 transition-colors"
              >
                System Health
              </a>
              <a
                href="/admin/analytics"
                className="block px-4 py-2 rounded hover:bg-gray-800 transition-colors"
              >
                Platform Analytics
              </a>
              <a
                href="/admin/billing"
                className="block px-4 py-2 rounded hover:bg-gray-800 transition-colors"
              >
                Billing & Subscriptions
              </a>
              <a
                href="/admin/support"
                className="block px-4 py-2 rounded hover:bg-gray-800 transition-colors"
              >
                Support Tickets
              </a>
              <a
                href="/admin/settings"
                className="block px-4 py-2 rounded hover:bg-gray-800 transition-colors"
              >
                Platform Settings
              </a>
            </nav>
          </div>
          
          <div className="absolute bottom-0 w-64 p-6 border-t border-gray-800">
            <a
              href="/dashboard"
              className="block px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              ← Back to Main App
            </a>
          </div>
        </aside>
        
        {/* Main Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}