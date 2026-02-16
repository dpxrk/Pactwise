'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { Search, Building2, Plus, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

type OnboardingStep = 'choice' | 'search' | 'pin-entry' | 'new-company' | 'child-company';

interface CompanySearchResult {
  id: string;
  name: string;
  domain?: string;
  is_parent_organization?: boolean;
}

export default function OnboardingPage() {
  // Get user data from AuthContext
  const { user, isLoading: authLoading } = useAuth();
  const isLoaded = !authLoading;
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>('choice');
  const [isLoading, setIsLoading] = useState(false);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<CompanySearchResult | null>(null);

  // PIN entry state
  const [pin, setPin] = useState('');

  // Company creation state
  const [newCompanyName, setNewCompanyName] = useState('');
  const [childCompanyName, setChildCompanyName] = useState('');

  // Search enterprises query
  const { data: searchResults } = useQuery({
    queryKey: ['enterprise-search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];

      const { data, error } = await supabase
        .from('enterprises')
        .select('id, name, domain, is_parent_organization')
        .ilike('name', `%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      return data as CompanySearchResult[];
    },
    enabled: searchTerm.length >= 2,
  });

  // Create enterprise mutation
  const createEnterpriseMutation = useMutation({
    mutationFn: async (data: { name: string; domain: string }) => {
      // First create the enterprise
      const { data: enterprise, error: enterpriseError } = await (supabase as any)
        .from('enterprises')
        .insert({
          name: data.name,
          domain: data.domain,
          status: 'active',
          subscription_tier: 'starter',
          settings: {},
        })
        .select()
        .single();

      if (enterpriseError) throw enterpriseError;

      // Then update the user to be the owner
      if (user?.id) {
        const { error: userError } = await (supabase as any)
          .from('users')
          .update({
            enterprise_id: enterprise.id,
            role: 'owner',
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (userError) throw userError;
      }

      return enterprise;
    },
  });

  // Join as child enterprise mutation
  const joinAsChildMutation = useMutation({
    mutationFn: async (data: { parentId: string; childName: string; pin: string }) => {
      // Verify PIN (would need to implement PIN verification on the parent enterprise)
      // For now, just create the child enterprise

      // Create child enterprise
      const { data: childEnterprise, error: childError } = await (supabase as any)
        .from('enterprises')
        .insert({
          name: data.childName,
          parent_enterprise_id: data.parentId,
          status: 'active',
          subscription_tier: 'starter',
          settings: {},
        })
        .select()
        .single();

      if (childError) throw childError;

      // Update user
      if (user?.id) {
        const { error: userError } = await (supabase as any)
          .from('users')
          .update({
            enterprise_id: childEnterprise.id,
            role: 'admin',
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (userError) throw userError;
      }

      return childEnterprise;
    },
  });

  const handleCreateNewCompany = async () => {
    if (!newCompanyName.trim()) {
      toast.error('Please enter a company name');
      return;
    }

    setIsLoading(true);
    try {
      const domain = user?.email?.split('@')[1] || '';
      await createEnterpriseMutation.mutateAsync({
        name: newCompanyName.trim(),
        domain,
      });

      toast.success('Welcome to Pactwise! Your organization has been created.');
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to create enterprise:', error);
      toast.error('Failed to create your organization. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinAsChild = async () => {
    if (!selectedCompany || !pin.trim() || !childCompanyName.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await joinAsChildMutation.mutateAsync({
        parentId: selectedCompany.id,
        pin: pin.trim(),
        childName: childCompanyName.trim(),
      });

      toast.success(`Welcome! You've joined ${selectedCompany.name} as a child organization.`);
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Failed to join enterprise:', error);
      toast.error(error.message || 'Failed to join organization. Please check your PIN and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetFlow = () => {
    setStep('choice');
    setSearchTerm('');
    setSelectedCompany(null);
    setPin('');
    setNewCompanyName('');
    setChildCompanyName('');
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-ghost-100 flex items-center justify-center">
        <div className="bg-white border border-ghost-300 p-12">
          <div className="text-center">
            <div className="inline-block animate-spin h-12 w-12 border-2 border-purple-900 border-t-transparent mb-4"></div>
            <p className="font-mono text-xs uppercase tracking-wider text-ghost-700">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/sign-in');
    return null;
  }

  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Progress Bar */}
      <div className="border-b border-ghost-300 bg-white px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
            ORGANIZATION SETUP
          </h1>
          <div className="font-mono text-xs text-purple-900">
            STEP {step === 'choice' ? '1' : step === 'search' || step === 'new-company' ? '2' : '3'} / 3
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white border border-ghost-300 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-purple-900 mb-2">Welcome to Pactwise</h2>
              <p className="text-sm text-ghost-700">
                Set up your organization to get started with contract management.
              </p>
            </div>
            <div className="space-y-4">
          {step === 'choice' && (
            <>
              <div className="space-y-2 mb-6">
                <Label htmlFor="email" className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                  Your Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-ghost-100 border-ghost-300 font-mono text-sm"
                />
              </div>

              <div className="border-t border-ghost-300 pt-6 mb-6"></div>

              <div className="space-y-3">
                <p className="font-mono text-xs uppercase tracking-wider text-ghost-700 mb-4">
                  Choose how to get started
                </p>

                <Button
                  onClick={() => setStep('search')}
                  variant="outline"
                  className="w-full justify-start border-ghost-300 hover:bg-ghost-100 hover:border-purple-500 text-ghost-700 font-mono text-xs uppercase tracking-wider"
                >
                  <Search className="mr-2 h-4 w-4" />
                  Join Existing Organization
                </Button>

                <Button
                  onClick={() => setStep('new-company')}
                  className="w-full justify-start bg-purple-900 hover:bg-purple-800 text-white border-0 font-mono text-xs uppercase tracking-wider"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Organization
                </Button>
              </div>
            </>
          )}

          {step === 'search' && (
            <>
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-ghost-300">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFlow}
                  className="hover:bg-ghost-100"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                  Search for Organization
                </h3>
              </div>

              <div className="space-y-2 mb-4">
                <Label htmlFor="search" className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                  Company Name
                </Label>
                <Input
                  id="search"
                  placeholder="Type to search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-ghost-300 font-mono text-sm"
                />
              </div>

              {searchResults && (searchResults as CompanySearchResult[]).length > 0 && (
                <div className="space-y-2">
                  <Label className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                    Select Your Organization
                  </Label>
                  {(searchResults as CompanySearchResult[]).map((company) => (
                    <button
                      key={company.id}
                      type="button"
                      className={`w-full p-3 border cursor-pointer transition-colors text-left ${
                        selectedCompany?.id === company.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-ghost-300 hover:border-purple-500 focus:border-purple-900 focus:ring-2 focus:ring-purple-500'
                      }`}
                      onClick={() => {
                        setSelectedCompany(company);
                        setStep('pin-entry');
                      }}
                      aria-label={`Select ${company.name}${company.is_parent_organization ? ' (Parent Organization)' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-ghost-700" />
                        <span className="font-mono text-sm text-purple-900">{company.name}</span>
                        {company.is_parent_organization && (
                          <Badge variant="secondary" className="text-xs font-mono uppercase">
                            Parent
                          </Badge>
                        )}
                      </div>
                      {company.domain && (
                        <p className="text-xs text-ghost-700 mt-1 font-mono">{company.domain}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {searchTerm.length >= 2 && searchResults && (searchResults as CompanySearchResult[]).length === 0 && (
                <p className="text-sm text-ghost-700 text-center py-4 border border-ghost-300 p-4 font-mono">
                  No organizations found. Try a different search term or create a new organization.
                </p>
              )}
            </>
          )}

          {step === 'pin-entry' && selectedCompany && (
            <>
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-ghost-300">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep('search')}
                  className="hover:bg-ghost-100"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                  Enter Access PIN
                </h3>
              </div>

              <div className="border border-ghost-300 p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-5 w-5 text-purple-900" />
                  <span className="font-mono text-sm font-semibold text-purple-900">{selectedCompany.name}</span>
                </div>
                <p className="text-xs text-ghost-700 font-mono">
                  Enter the PIN provided by the organization administrator
                </p>
              </div>

              <div className="space-y-2 mb-4">
                <Label htmlFor="pin" className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                  Access PIN
                </Label>
                <Input
                  id="pin"
                  type="password"
                  placeholder="Enter 4-8 digit PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  maxLength={8}
                  className="border-ghost-300 font-mono text-sm"
                />
              </div>

              <div className="space-y-2 mb-6">
                <Label htmlFor="childCompany" className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                  Your Company/Division Name
                </Label>
                <Input
                  id="childCompany"
                  placeholder="e.g., Regional Office, Subsidiary Name"
                  value={childCompanyName}
                  onChange={(e) => setChildCompanyName(e.target.value)}
                  className="border-ghost-300 font-mono text-sm"
                />
                <p className="text-xs text-ghost-700 font-mono">
                  This will be your organization&apos;s name within the parent company
                </p>
              </div>

              <Button
                onClick={handleJoinAsChild}
                disabled={isLoading || !pin.trim() || !childCompanyName.trim() || pin.length < 4}
                className="w-full bg-purple-900 hover:bg-purple-800 text-white border-0 font-mono text-xs uppercase tracking-wider"
              >
                {isLoading ? 'Joining Organization...' : 'Join Organization'}
              </Button>
            </>
          )}

          {step === 'new-company' && (
            <>
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-ghost-300">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFlow}
                  className="hover:bg-ghost-100"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                  Create New Organization
                </h3>
              </div>

              <div className="space-y-2 mb-6">
                <Label htmlFor="newCompany" className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                  Organization Name
                </Label>
                <Input
                  id="newCompany"
                  placeholder="Enter your organization name"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  className="border-ghost-300 font-mono text-sm"
                />
                <p className="text-xs text-ghost-700 font-mono border-l-2 border-purple-500 pl-3">
                  You&apos;ll be the owner of this organization and can invite others to join
                </p>
              </div>

              <Button
                onClick={handleCreateNewCompany}
                disabled={isLoading || !newCompanyName.trim()}
                className="w-full bg-purple-900 hover:bg-purple-800 text-white border-0 font-mono text-xs uppercase tracking-wider"
              >
                {isLoading ? 'Creating Organization...' : 'Create Organization'}
              </Button>
            </>
          )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
