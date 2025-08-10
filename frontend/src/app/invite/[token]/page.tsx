'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
// import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/app/_components/common/LoadingSpinner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Mail, Building, UserCheck, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext'; // To check if user is already signed in

const InvitationHandlerPage = () => {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth(); // Supabase user
  const token = typeof params.token === 'string' ? params.token : undefined;

  const [pageError, setPageError] = useState<string | null>(null);
  const [pageSuccess, setPageSuccess] = useState<string | null>(null);

  // TODO: Replace with Supabase query
  const invitationDetails = null;
  const isLoadingInvitation = false;
  const invitationError = null;

  // TODO: Replace with Supabase mutations
  const acceptInvitationMutation = { 
    execute: async (args: any) => {
      console.log('Accept invitation:', args);
      return { success: true };
    },
    isLoading: false,
    error: null
  };
  const upsertUserMutation = { 
    execute: async (args: any) => {
      console.log('Upsert user:', args);
      return { success: true };
    },
    isLoading: false 
  };

  useEffect(() => {
    if (invitationError) {
      setPageError(invitationError.message || "Failed to load invitation details.");
    }
    if (invitationDetails?.error) {
      setPageError(invitationDetails.error);
    }
  }, [invitationError, invitationDetails]);

  const handleAccept = async () => {
    if (!token) {
      setPageError("Invalid invitation link.");
      return;
    }
    if (!isAuthenticated || !user) {
      // If not signed in, redirect to sign-up, passing the token for post-auth processing
      // Clerk's sign-up can redirect back with query params or use session state.
      // For simplicity, we'll prompt them to sign in/up first.
      // A more robust solution would pass the token through Clerk's redirect URLs.
      router.push(`/auth/sign-up?invitationToken=${token}`);
      return;
    }
    
    // Check if the invited email matches the currently signed-in user's email
    const primaryEmail = user.email;
    if (invitationDetails?.invitation?.email && primaryEmail && 
        invitationDetails.invitation.email.toLowerCase() !== primaryEmail.toLowerCase()) {
      setPageError(`This invitation is for ${invitationDetails.invitation.email}. You are signed in as ${primaryEmail}. Please sign in with the correct account.`);
      return;
    }


    setPageError(null);
    setPageSuccess(null);

    try {
      const acceptanceResult = await acceptInvitationMutation.execute({ token });
      if (!acceptanceResult) { // `acceptInvitation` returns userId or throws
         throw new Error(acceptInvitationMutation.error?.message || "Failed to accept invitation.");
      }
      
      // Ensure the user record is fully up-to-date, especially if they were new to Convex.
      // `acceptInvitation` should handle linking the user to the enterprise.
      // `upsertUser` here ensures any Clerk profile updates are synced.
      await upsertUserMutation.execute({ invitationToken: token }); // Pass token to ensure correct enterprise linkage

      setPageSuccess(`Successfully joined ${invitationDetails?.enterprise?.name || 'the enterprise'}! Redirecting...`);
      
      // Redirect to dashboard or onboarding flow manager
      // The OnboardingFlowManager will pick up the new state.
      setTimeout(() => {
        router.push('/dashboard'); 
      }, 2000);

    } catch (err) {
      setPageError(err.message || "Could not process invitation.");
    }
  };

  if (isLoadingInvitation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <LoadingSpinner text="Loading invitation..." size="lg" />
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <XCircle className="mx-auto h-12 w-12 text-destructive mb-3" />
            <CardTitle className="text-xl">Invitation Problem</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{pageError}</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => router.push('/')}>Go to Homepage</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  if (pageSuccess) {
     return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-3" />
            <CardTitle className="text-xl">Invitation Accepted!</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{pageSuccess}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }


  if (!invitationDetails || !invitationDetails.invitation) {
    // This case should be caught by pageError from the effect hook if token is invalid.
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <CardTitle>Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This invitation link is no longer valid or has expired.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { invitation, enterprise, inviter } = invitationDetails;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-100 to-background p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <Mail className="mx-auto h-12 w-12 text-gold mb-4" />
          <CardTitle className="text-2xl font-sans text-primary">You're Invited!</CardTitle>
          {inviter && enterprise && (
            <CardDescription>
              {inviter.name || 'Someone'} has invited you to join{' '}
              <span className="font-semibold text-primary">{enterprise.name}</span> on PactWise.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-md bg-muted/50">
            <p className="text-sm">
              <strong className="text-foreground">Invited Email:</strong> {invitation.email}
            </p>
            <p className="text-sm">
              <strong className="text-foreground">Role:</strong> {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
            </p>
            <p className="text-sm">
              <strong className="text-foreground">Expires:</strong> {new Date(invitation.expiresAt).toLocaleDateString()}
            </p>
          </div>

          {!isAuthenticated && (
            <Alert variant="default" className="border-primary/20 bg-primary/5">
              <UserCheck className="h-4 w-4 text-primary" />
              <AlertTitle className="text-primary">Sign In or Sign Up to Accept</AlertTitle>
              <AlertDescription>
                To accept this invitation, please sign in with your <strong className="text-primary">{invitation.email}</strong> account.
                If you don't have an account, you can sign up.
              </AlertDescription>
              <div className="mt-3 flex gap-2">
                 <Button size="sm" onClick={() => router.push(`/auth/sign-in?invitationToken=${token}`)}>Sign In</Button>
                 <Button size="sm" variant="outline" onClick={() => router.push(`/auth/sign-up?invitationToken=${token}`)}>Sign Up</Button>
              </div>
            </Alert>
          )}
          
           {isAuthenticated && user?.email?.toLowerCase() !== invitation.email.toLowerCase() && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Email Mismatch</AlertTitle>
              <AlertDescription>
                This invitation is for <strong className="break-all">{invitation.email}</strong>. You are currently signed in as <strong className="break-all">{user?.email}</strong>. 
                Please sign out and sign back in with the correct email address to accept this invitation.
              </AlertDescription>
            </Alert>
          )}

        </CardContent>
        <CardFooter>
          <Button 
            className="w-full" 
            onClick={handleAccept} 
            disabled={
              acceptInvitationMutation.isLoading || 
              !isAuthenticated || 
              (isAuthenticated && user?.email?.toLowerCase() !== invitation.email.toLowerCase())
            }
          >
            {acceptInvitationMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Accept Invitation & Join {enterprise?.name || 'Enterprise'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default InvitationHandlerPage;