"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface User {
  id: string;
  auth_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  enterprise_id: string;
  is_active: boolean;
  created_at: string;
  last_login_at?: string;
  enterprises?: {
    id: string;
    name: string;
    domain?: string;
  };
}

interface UserManagementClientProps {
  initialUsers: User[];
  currentAdminId: string;
}

export default function UserManagementClient({ 
  initialUsers, 
  currentAdminId 
}: UserManagementClientProps) {
  const [users, setUsers] = useState(initialUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const supabase = createClient();
  
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.enterprises?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = selectedRole === "all" || user.role === selectedRole;
    
    return matchesSearch && matchesRole;
  });
  
  const handleRoleChange = async (userId: string, newRole: string) => {
    setLoading(true);
    
    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId);
    
    if (error) {
      alert('Failed to update user role');
      console.error(error);
    } else {
      setUsers(users.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));
      setEditingUser(null);
    }
    
    setLoading(false);
  };
  
  const handleToggleActive = async (userId: string, isActive: boolean) => {
    setLoading(true);
    
    const { error } = await supabase
      .from('users')
      .update({ is_active: !isActive })
      .eq('id', userId);
    
    if (error) {
      alert('Failed to update user status');
      console.error(error);
    } else {
      setUsers(users.map(u => 
        u.id === userId ? { ...u, is_active: !isActive } : u
      ));
    }
    
    setLoading(false);
  };
  
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    
    setLoading(true);
    
    const { error } = await supabase
      .from('users')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', userId);
    
    if (error) {
      alert('Failed to delete user');
      console.error(error);
    } else {
      setUsers(users.filter(u => u.id !== userId));
    }
    
    setLoading(false);
  };
  
  return (
    <div>
      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search users by name, email, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-admin-primary focus:border-transparent outline-none"
            />
          </div>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-admin-primary focus:border-transparent outline-none"
          >
            <option value="all">All Roles</option>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="user">User</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
        
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {filteredUsers.length} of {users.length} users
          </p>
          <button className="px-4 py-2 bg-admin-primary text-white rounded hover:bg-opacity-90 transition-colors">
            Add New User
          </button>
        </div>
      </div>
      
      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {user.enterprises?.name || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {user.enterprises?.domain || ''}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingUser === user.id ? (
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        onBlur={() => setEditingUser(null)}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                        disabled={loading}
                        autoFocus
                      >
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="user">User</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <span
                        onClick={() => setEditingUser(user.id)}
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded cursor-pointer
                          ${user.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                            user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                            user.role === 'manager' ? 'bg-green-100 text-green-800' :
                            user.role === 'user' ? 'bg-gray-100 text-gray-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}
                      >
                        {user.role}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(user.id, user.is_active)}
                      disabled={loading || user.id === currentAdminId}
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded
                        ${user.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                        } ${user.id === currentAdminId ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                    >
                      {user.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.last_login_at 
                      ? new Date(user.last_login_at).toLocaleDateString()
                      : 'Never'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex space-x-2">
                      <button
                        className="text-blue-600 hover:text-blue-800"
                        onClick={() => alert('View details coming soon')}
                      >
                        View
                      </button>
                      <button
                        className="text-red-600 hover:text-red-800"
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={loading || user.id === currentAdminId}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No users found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}