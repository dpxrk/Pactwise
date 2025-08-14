'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { toast } from 'sonner';
import { Search, Building2, Plus, ArrowLeft } from 'lucide-react';

type OnboardingStep = 'choice' | 'search' | 'pin-entry' | 'new-company' | 'child-company';

interface CompanySearchResult {
  _id: string;
  name: string;
  domain?: string;
  isParentOrganization?: boolean;
}

// Mock functions - replace with actual API calls
const useMutation = (fn: any) => async (args: any) => {
  console.log('Mutation called with:', args);
  return Promise.resolve({ success: true });
};

const useQuery = (fn: any, args: any) => {
  return { data: [] };
};

const api = {
  enterprises: {
    createEnterpriseWithOwner: (args: any) => { /* mock */ },
    joinEnterpriseAsChild: (args: any) => { /* mock */ },
    searchEnterprises: (args: any) => { /* mock */ },
  },
};

export default function OnboardingPage() {
  // TODO: Replace with Supabase user data
  const user = { firstName: 'Demo', lastName: 'User', emailAddresses: [{ emailAddress: 'demo@example.com' }] };
  const isLoaded = true;
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

//   const createEnterpriseWithOwner = useMutation(api.enterprises.createEnterpriseWithOwner);
//   const joinEnterpriseAsChild = useMutation(api.enterprises.joinEnterpriseAsChild);
//   const { data: searchResults } = useQuery(api.enterprises.searchEnterprises, {
    searchTerm: searchTerm.length >= 2 ? searchTerm : 'skip',
  });

  const handleCreateNewCompany = async () => {
    if (!newCompanyName.trim()) {
      toast.error('Please enter a company name');
      return;
    }

    setIsLoading(true);
    try {
      await createEnterpriseWithOwner({
        enterpriseName: newCompanyName.trim(),
        domain: user?.primaryEmailAddress?.emailAddress?.split('@')[1] || '',
        userEmail: user?.primaryEmailAddress?.emailAddress || '',
        authUserId: user?.id || '',
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
      await joinEnterpriseAsChild({
        parentEnterpriseId: selectedCompany._id,
        pin: pin.trim(),
        childCompanyName: childCompanyName.trim(),
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/sign-in');
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Welcome to Pactwise</CardTitle>
          <CardDescription>
            Set up your organization to get started with contract management.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'choice' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Your Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.primaryEmailAddress?.emailAddress || ''}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">
                  Choose how you'd like to get started:
                </p>
                
                <Button 
                  onClick={() => setStep('search')}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Search className="mr-2 h-4 w-4" />
                  Join an existing organization
                </Button>
                
                <Button 
                  onClick={() => setStep('new-company')}
                  className="w-full justify-start"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create a new organization
                </Button>
              </div>
            </>
          )}

          {step === 'search' && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={resetFlow}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h3 className="font-medium">Search for Organization</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="search">Company Name</Label>
                <Input
                  id="search"
                  placeholder="Type to search for your company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {searchResults && (searchResults as CompanySearchResult[]).length > 0 && (
                <div className="space-y-2">
                  <Label>Select Your Organization</Label>
                  {(searchResults as CompanySearchResult[]).map((company) => (
                    <div
                      key={company._id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedCompany?._id === company._id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => {
                        setSelectedCompany(company);
                        setStep('pin-entry');
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{company.name}</span>
                        {company.isParentOrganization && (
                          <Badge variant="secondary" className="text-xs">
                            Parent Org
                          </Badge>
                        )}
                      </div>
                      {company.domain && (
                        <p className="text-xs text-muted-foreground mt-1">{company.domain}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {searchTerm.length >= 2 && searchResults && (searchResults as CompanySearchResult[]).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No organizations found. Try a different search term or create a new organization.
                </p>
              )}
            </>
          )}

          {step === 'pin-entry' && selectedCompany && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setStep('search')}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h3 className="font-medium">Enter Access PIN</h3>
              </div>

              <div className="text-center mb-4">
                <div className="flex items-center gap-2 justify-center mb-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{selectedCompany.name}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Enter the PIN provided by the organization administrator
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin">Access PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  placeholder="Enter 4-8 digit PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  maxLength={8}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="childCompany">Your Company/Division Name</Label>
                <Input
                  id="childCompany"
                  placeholder="e.g., Regional Office, Subsidiary Name"
                  value={childCompanyName}
                  onChange={(e) => setChildCompanyName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  This will be your organization's name within the parent company
                </p>
              </div>

              <Button 
                onClick={handleJoinAsChild}
                disabled={isLoading || !pin.trim() || !childCompanyName.trim() || pin.length < 4}
                className="w-full"
              >
                {isLoading ? 'Joining Organization...' : 'Join Organization'}
              </Button>
            </>
          )}

          {step === 'new-company' && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={resetFlow}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h3 className="font-medium">Create New Organization</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newCompany">Organization Name</Label>
                <Input
                  id="newCompany"
                  placeholder="Enter your organization name"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  You'll be the owner of this organization and can invite others to join
                </p>
              </div>

              <Button 
                onClick={handleCreateNewCompany}
                disabled={isLoading || !newCompanyName.trim()}
                className="w-full"
              >
                {isLoading ? 'Creating Organization...' : 'Create Organization'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
