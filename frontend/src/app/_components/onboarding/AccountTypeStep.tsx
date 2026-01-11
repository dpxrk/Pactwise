// src/app/_components/onboarding/AccountTypeStep.tsx
'use client';

import { AlertCircle, Building, Users, Mail, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';

import { LoadingSpinner } from '@/app/_components/common/LoadingSpinner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';
import type { Id } from '@/types/id.types';

const supabase = createClient();

// Onboarding steps enum
const ONBOARDING_STEPS = {
  PROFILE_SETUP: 'profile_setup',
  CREATE_ENTERPRISE: 'create_enterprise',
} as const;

type OnboardingStep = typeof ONBOARDING_STEPS[keyof typeof ONBOARDING_STEPS];

interface AccountTypeStepProps {
  userEmail?: string;
  onStepComplete: (nextStep: OnboardingStep, metadata?: Record<string, unknown>) => void;
}

const AccountTypeStep: React.FC<AccountTypeStepProps> = ({ userEmail, onStepComplete }) => {
  const router = useRouter();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);

  // Get email domain for matching
  const emailDomain = userEmail?.split('@')[1] || user?.email?.split('@')[1];

  // Query for domain match (enterprise with matching domain)
  const { data: domainMatch, isLoading: isLoadingDomainMatch } = useQuery({
    queryKey: ['domain-match', emailDomain],
    queryFn: async () => {
      if (!emailDomain) return null;

      const { data, error } = await supabase
        .from('enterprises')
        .select('id, name, domain')
        .eq('domain', emailDomain)
        .eq('status', 'active')
        .single();

      if (error || !data) return null;

      return {
        enterpriseId: data.id as Id<"enterprises">,
        enterpriseName: data.name,
        domain: data.domain,
      };
    },
    enabled: !!emailDomain,
  });

  // Query for pending invitations
  const { data: pendingInvitations, isLoading: isLoadingInvitations } = useQuery({
    queryKey: ['pending-invitations', userEmail],
    queryFn: async () => {
      const email = userEmail || user?.email;
      if (!email) return [];

      const { data, error } = await supabase
        .from('invitations')
        .select(`
          id, email, role, status, token,
          enterprise_id,
          enterprises:enterprise_id (id, name),
          inviter:invited_by (id, first_name, last_name)
        `)
        .eq('email', email)
        .eq('status', 'pending');

      if (error || !data) return [];

      return data.map((inv: any) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        token: inv.token,
        enterpriseId: inv.enterprise_id as Id<"enterprises">,
        enterpriseName: inv.enterprises?.name || 'Unknown',
        inviterName: inv.inviter
          ? `${inv.inviter.first_name || ''} ${inv.inviter.last_name || ''}`.trim() || 'Admin'
          : 'Admin',
      }));
    },
    enabled: !!(userEmail || user?.email),
  });

  // Accept invitation mutation
  const acceptInvitationMutation = useMutation({
    mutationFn: async ({ token }: { token: string }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Update invitation status
      const { error: invError } = await (supabase as any)
        .from('invitations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('token', token);

      if (invError) throw invError;

      // Get invitation details to update user
      const { data: invitation } = await supabase
        .from('invitations')
        .select('enterprise_id, role')
        .eq('token', token)
        .single();

      if (invitation) {
        // Update user with enterprise and role
        const { error: userError } = await (supabase as any)
          .from('users')
          .update({
            enterprise_id: invitation.enterprise_id,
            role: invitation.role || 'user',
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (userError) throw userError;
      }

      return { success: true };
    },
  });

  const handleAcceptInvitation = async (token: string, enterpriseId: Id<"enterprises">) => {
    setError(null);
    try {
      await acceptInvitationMutation.mutateAsync({ token });

      // Successfully accepted invitation - proceed to profile setup
      onStepComplete(ONBOARDING_STEPS.PROFILE_SETUP, { joinedEnterpriseId: enterpriseId });
      router.push('/dashboard');

    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process invitation.");
    }
  };

  const isLoading = isLoadingDomainMatch || isLoadingInvitations;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-transparent p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-sans text-primary">Welcome to PactWise!</CardTitle>
          <CardDescription>How would you like to get started?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isLoading && <LoadingSpinner text="Checking your options..." />}

          {!isLoading && (
            <>
              <Button 
                className="w-full py-6 text-lg" 
                onClick={() => onStepComplete(ONBOARDING_STEPS.CREATE_ENTERPRISE)}
              >
                <Building className="mr-2 h-5 w-5" /> Create New Enterprise
              </Button>

              {domainMatch && domainMatch.enterpriseId && (
                <Button 
                  variant="outline" 
                  className="w-full py-6 text-lg" 
                  onClick={() => {
                    // This flow implies `upsertUser` will handle domain-based joining
                    // by passing the matched enterpriseId if user chooses this.
                    // For simplicity, we assume `upsertUser` is smart enough or 
                    // there's a specific "Join by Domain" mutation.
                    // For now, this also moves to profile setup, assuming `upsertUser` does its job.
                    onStepComplete(ONBOARDING_STEPS.PROFILE_SETUP, { joinedEnterpriseId: domainMatch.enterpriseId });
                  }}
                >
                  <Users className="mr-2 h-5 w-5" /> Join {domainMatch.enterpriseName} (via domain)
                </Button>
              )}

              {pendingInvitations && pendingInvitations.length > 0 && (
                <div className="space-y-3 pt-4 border-t">
                  <h3 className="text-md font-semibold text-center text-muted-foreground">Your Invitations:</h3>
                  {pendingInvitations.map(inv => (
                    <Card key={inv.id} className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">Join <span className="text-primary">{inv.enterpriseName}</span></p>
                          <p className="text-xs text-muted-foreground">Invited by: {inv.inviterName} as {inv.role}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAcceptInvitation(inv.token, inv.enterpriseId)}
                          disabled={acceptInvitationMutation.isPending}
                        >
                          {acceptInvitationMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accept"}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
         <CardFooter className="text-center text-xs text-muted-foreground">
           <p>If you don't see an invitation or your company's domain, please contact your administrator or create a new enterprise.</p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AccountTypeStep;
