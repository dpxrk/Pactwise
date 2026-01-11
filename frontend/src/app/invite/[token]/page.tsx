'use client';

import { AlertCircle, CheckCircle, Mail, Building, UserCheck, XCircle, Loader2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';

import { LoadingSpinner } from '@/app/_components/common/LoadingSpinner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

const InvitationHandlerPage = () => {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const token = typeof params?.token === 'string' ? params.token : undefined;

  const [pageError, setPageError] = useState<string | null>(null);
  const [pageSuccess, setPageSuccess] = useState<string | null>(null);

  // Fetch invitation details from Supabase
  const { data: invitationData, isLoading: isLoadingInvitation, error: invitationQueryError } = useQuery({
    queryKey: ['invitation', token],
    queryFn: async () => {
      if (!token) throw new Error('No token provided');

      const { data: invitation, error: invError } = await supabase
        .from('invitations')
        .select(`
          id, email, role, expires_at, status,
          enterprise_id,
          enterprises:enterprise_id (id, name),
          inviter:invited_by (id, first_name, last_name)
        `)
        .eq('token', token)
        .eq('status', 'pending')
        .single();

      if (invError) throw invError;
      if (!invitation) throw new Error('Invitation not found');

      // Check if expired
      if (new Date(invitation.expires_at) < new Date()) {
        throw new Error('This invitation has expired');
      }

      return {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expires_at,
        },
        enterprise: {
          id: (invitation.enterprises as any)?.id,
          name: (invitation.enterprises as any)?.name,
        },
        inviter: {
          name: invitation.inviter
            ? `${(invitation.inviter as any).first_name || ''} ${(invitation.inviter as any).last_name || ''}`.trim()
            : undefined,
        },
      };
    },
    enabled: !!token,
  });

  const invitationDetails = invitationData || null;
  const invitationError = invitationQueryError ? { message: (invitationQueryError as Error).message } : null;

  // Accept invitation mutation
  const acceptInvitationMutation = useMutation({
    mutationFn: async ({ token }: { token: string }) => {
      if (!user?.id) throw new Error('User not authenticated');
      if (!invitationDetails?.enterprise?.id) throw new Error('Enterprise not found');

      // Update invitation status
      const { error: updateError } = await (supabase as any)
        .from('invitations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('token', token);

      if (updateError) throw updateError;

      // Update user with enterprise and role
      const { error: userError } = await (supabase as any)
        .from('users')
        .update({
          enterprise_id: invitationDetails.enterprise.id,
          role: invitationDetails.invitation?.role || 'user',
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (userError) throw userError;

      return { success: true };
    },
  });

  // Upsert user mutation (create user profile if doesn't exist)
  const upsertUserMutation = useMutation({
    mutationFn: async ({ invitationToken }: { invitationToken: string }) => {
      if (!user?.id || !user?.email) throw new Error('User not authenticated');

      // Check if user profile exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!existingUser) {
        // Create user profile
        const { error: createError } = await (supabase as any)
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (createError) throw createError;
      }

      return { success: true };
    },
  });

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
      // Ensure user profile exists
      await upsertUserMutation.mutateAsync({ invitationToken: token });

      // Accept the invitation
      const acceptanceResult = await acceptInvitationMutation.mutateAsync({ token });
      if (!acceptanceResult?.success) {
         throw new Error("Failed to accept invitation.");
      }

      setPageSuccess(`Successfully joined ${invitationDetails?.enterprise?.name || 'the enterprise'}! Redirecting...`);
      
      // Redirect to dashboard or onboarding flow manager
      // The OnboardingFlowManager will pick up the new state.
      setTimeout(() => {
        router.push('/dashboard'); 
      }, 2000);

    } catch (err) {
      setPageError((err as Error).message || "Could not process invitation.");
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
              acceptInvitationMutation.isPending ||
              !isAuthenticated ||
              (isAuthenticated && user?.email?.toLowerCase() !== invitation.email.toLowerCase())
            }
          >
            {acceptInvitationMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Accept Invitation & Join {enterprise?.name || 'Enterprise'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default InvitationHandlerPage;