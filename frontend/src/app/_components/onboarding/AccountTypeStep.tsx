// src/app/_components/onboarding/AccountTypeStep.tsx
'use client';

import React, { useState, useEffect } from 'react';
import type { Id } from '@/types/id.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/app/_components/common/LoadingSpinner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Building, Users, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AccountTypeStepProps {
  userEmail?: string;
  onStepComplete: (nextStep: OnboardingStep, metadata?: Record<string, unknown>) => void;
}

const AccountTypeStep: React.FC<AccountTypeStepProps> = ({ userEmail, onStepComplete }) => {
  const router = useRouter();
  const [selectedInvitation, setSelectedInvitation] = useState<{
    _id: Id<"invitations">;
    email: string;
    role: string;
    status: string;
    enterpriseId: Id<"enterprises">;
    token: string;
    enterpriseName?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // TODO: Replace with Supabase queries
  const domainMatch = null;
  const isLoadingDomainMatch = false;
  
  const pendingInvitations = null;
  const isLoadingInvitations = false;

  //   const mutation = { execute: async () => ({}), isLoading: false, error: null };
  const placeholder = { execute: async () => ({}), isLoading: false };
  //   const mutation = { execute: async () => ({}), isLoading: false, error: null };
  const placeholder = { execute: async () => ({}), isLoading: false };

  const handleAcceptInvitation = async (token: string, enterpriseId: Id<"enterprises">) => {
    setError(null);
    try {
      const acceptanceResult = await acceptInvitationMutation.execute({ token });
      if (!acceptanceResult) { // `acceptInvitation` returns userId or throws
        throw new Error(acceptInvitationMutation.error?.message || "Failed to accept invitation.");
      }
      
      // `acceptInvitation` already creates/updates the user with the enterpriseId and role from invitation.
      // We might call upsertUser again just to ensure Clerk session data is synced if necessary,
      // or if `acceptInvitation` doesn't return the full user object needed for redirection.
      // For now, we assume `acceptInvitation` handles user creation/linking sufficiently.
      
      // 3. Update onboarding state locally (the manager will fetch the new state)
      // The next step after joining is usually profile setup.
      onStepComplete(ONBOARDING_STEPS.PROFILE_SETUP, { joinedEnterpriseId: enterpriseId });
      router.push('/dashboard'); // Or let OnboardingFlowManager handle next step rendering

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
                          disabled={acceptInvitationMutation.isLoading}
                        >
                          {acceptInvitationMutation.isLoading && selectedInvitation?.id === inv.id ? <LoadingSpinner size="sm" /> : "Accept"}
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
