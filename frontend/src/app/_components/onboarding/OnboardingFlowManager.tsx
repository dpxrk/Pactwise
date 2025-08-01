'use client';

import React, { useEffect } from 'react';
// import { useConvexQuery, useConvexMutation } from '@/lib/api-client';
// import { api } from "../../../../convex/_generated/api"
// import { ONBOARDING_STEPS, type OnboardingStep } from '@/../convex/onboardingConstants';

// Mock types - replace with actual types
type OnboardingStep = 'account_type' | 'create_enterprise' | 'profile_setup' | 'enterprise_config' | 'invite_team' | 'first_contract' | 'complete';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

import AccountTypeStep from './AccountTypeStep';
import CreateEnterpriseStep from './CreateEnterpriseStep';
import ProfileSetupStep from './ProfileSetupStep';
import EnterpriseConfigStep from './EnterpriseConfigStep';
import InviteTeamStep from './InviteTeamStep'; 
import FirstContractStep from './FirstContractStep'; 
import CompleteOnboardingStep from './CompleteOnboardingStep'; 

import { LoadingSpinner } from '@/app/_components/common/LoadingSpinner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';

const OnboardingFlowManager = () => {
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const router = useRouter();

  // Mock upsert user - replace with Supabase implementation
  const upsertUserMutation = {
    execute: async (params: any) => {
      // TODO: Replace with Supabase implementation
      console.log('Upserting user:', params);
      return { success: true };
    }
  };

  useEffect(() => {
    if (isClerkLoaded && clerkUser) {
      // Call upsertUser to ensure user record exists or is updated.
      upsertUserMutation.execute({}).catch(console.error);
    }
  }, [isClerkLoaded, clerkUser]);

  // Mock onboarding status - replace with Supabase implementation
  const onboardingStatus = {
    currentStep: 'account_type',
    isCompleted: false,
    metadata: {}
  };
  const isLoadingOnboarding = false;
  const onboardingError = null;

  // Mock update step mutation - replace with Supabase implementation
  const updateStepMutation = {
    execute: async (params: any) => {
      // TODO: Replace with Supabase implementation
      console.log('Updating onboarding step:', params);
      return { success: true };
    }
  };

  const handleStepCompletion = async (nextStep?: OnboardingStep, metadata?: Record<string, unknown>) => {
    if (onboardingStatus?.currentStep) {
      await updateStepMutation.execute({
        step: onboardingStatus.currentStep,
        completed: true,
        metadata: metadata || {},
      });
      if (nextStep) {
        // This might cause a re-fetch of onboardingStatus, which will update currentStep
      }
    }
  };

  const advanceToStep = async (step: OnboardingStep, metadata?: Record<string, unknown>) => {
    await updateStepMutation.execute({
      step: step,
      completed: false, // Mark the new step as current, not necessarily completed yet
      metadata: metadata || {},
    });
    // The UI should re-render based on the new onboardingStatus.currentStep
  };


  if (!isClerkLoaded || isLoadingOnboarding) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <LoadingSpinner text="Loading onboarding status..." size="lg" />
      </div>
    );
  }

  if (!clerkUser) {
    // This case should ideally be handled by Clerk's <SignedIn> or redirects.
    // If reached, means Clerk is loaded but user is not signed in.
    router.push('/auth/sign-in'); // Or your main sign-in page
    return <LoadingSpinner text="Redirecting to sign in..." />;
  }
  
  if (onboardingError) {
    return (
       <div className="container mx-auto py-10 px-4">
         <Alert variant="destructive">
           <AlertCircle className="h-4 w-4" />
           <AlertTitle>Error Loading Onboarding</AlertTitle>
           <AlertDescription>{onboardingError.message}</AlertDescription>
         </Alert>
       </div>
    );
  }

  if (!onboardingStatus) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <LoadingSpinner text="Initializing onboarding..." size="lg" />
      </div>
    );
  }

  if (onboardingStatus.isOnboarded) {
    // User is fully onboarded, redirect to dashboard if not already there.
    // This component might not even be rendered if they are correctly redirected.
    if (typeof window !== 'undefined' && window.location.pathname !== '/dashboard') {
        router.push('/dashboard');
        return <LoadingSpinner text="Redirecting to dashboard..." />;
    }
    return null; // Or a "Welcome Back" message if on a dedicated onboarding page
  }

  // Render the current step
  switch (onboardingStatus.currentStep) {
    case ONBOARDING_STEPS.ACCOUNT_TYPE:
      return <AccountTypeStep {...(clerkUser.primaryEmailAddress?.emailAddress && { userEmail: clerkUser.primaryEmailAddress.emailAddress })} onStepComplete={advanceToStep} />;
    case ONBOARDING_STEPS.CREATE_ENTERPRISE:
      return <CreateEnterpriseStep onStepComplete={() => advanceToStep(ONBOARDING_STEPS.PROFILE_SETUP)} />;
    // JOIN_ENTERPRISE is often handled by invitation link or within AccountTypeStep logic
    case ONBOARDING_STEPS.PROFILE_SETUP:
      return <ProfileSetupStep onStepComplete={() => {
        const nextStep = (clerkUser.publicMetadata?.role === 'owner' || clerkUser.publicMetadata?.role === 'admin')
                         ? ONBOARDING_STEPS.ENTERPRISE_CONFIG
                         : ONBOARDING_STEPS.INVITE_TEAM; // Or COMPLETE if invite is optional
        advanceToStep(nextStep);
      }} />;
    case ONBOARDING_STEPS.ENTERPRISE_CONFIG:
      return <EnterpriseConfigStep onStepComplete={() => advanceToStep(ONBOARDING_STEPS.INVITE_TEAM)} />; // Next could be INVITE_TEAM or FIRST_CONTRACT or COMPLETE
    case ONBOARDING_STEPS.INVITE_TEAM:
       return <InviteTeamStep onStepComplete={() => advanceToStep(ONBOARDING_STEPS.COMPLETE)} onSkip={() => advanceToStep(ONBOARDING_STEPS.COMPLETE)} />;
    case ONBOARDING_STEPS.FIRST_CONTRACT:
       return <FirstContractStep onStepComplete={() => advanceToStep(ONBOARDING_STEPS.COMPLETE)} onSkip={() => advanceToStep(ONBOARDING_STEPS.COMPLETE)} />;
    case ONBOARDING_STEPS.COMPLETE:
      // This step might show a summary or trigger final actions
      return <CompleteOnboardingStep />;
    default:
      return (
        <div className="container mx-auto py-10 px-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unknown Onboarding Step</AlertTitle>
            <AlertDescription>
              Current step: {onboardingStatus.currentStep}. Please contact support.
            </AlertDescription>
          </Alert>
        </div>
      );
  }
};

export default OnboardingFlowManager;