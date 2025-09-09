"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminSignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    const supabase = createClient();
    
    try {
      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }
      
      // Check if user has admin/owner role
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('role')
        .eq('auth_id', authData.user.id)
        .single();
      
      if (profileError || !userProfile) {
        setError("Failed to verify user permissions");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
      
      if (!['admin', 'owner'].includes(userProfile.role)) {
        setError("You don't have permission to access the admin portal");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
      
      // Redirect to dashboard
      router.push('/');
      router.refresh();
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-admin-primary via-admin-secondary to-black flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Pactwise Admin
          </h1>
          <p className="text-admin-accent">Administrative Portal</p>
        </div>
        
        {/* Sign In Form */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-admin-primary mb-6">
            Sign In
          </h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded text-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label 
                htmlFor="email" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-admin-primary focus:border-transparent outline-none transition-colors"
                placeholder="admin@company.com"
              />
            </div>
            
            <div>
              <label 
                htmlFor="password" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-admin-primary focus:border-transparent outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-admin-primary text-white py-3 rounded font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Only administrators and owners can access this portal
            </p>
          </div>
          
          <div className="mt-4 pt-4 border-t text-center">
            <a 
              href={process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}
              className="text-sm text-admin-accent hover:text-admin-primary transition-colors"
            >
              ← Back to Main Application
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}