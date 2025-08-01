'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { useConvexMutation, useConvexAction } from '@/lib/api-client'; // Assuming useConvexAction is similar to useConvexMutation for actions
// import { api } from '../../../../convex/_generated/api';

const CompleteOnboardingStep: React.FC = () => {
  const router = useRouter();
  const completeOnboardingAction = useConvexAction(api.onboardingActions.completeOnboarding);

  useEffect(() => {
    // Call the action to finalize onboarding on the backend
    completeOnboardingAction.execute({}).catch(console.error);
  }, [completeOnboardingAction]);

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-transparent p-4">
      <Card className="w-full max-w-md shadow-xl text-center">
        <CardHeader>
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <CardTitle className="text-3xl font-sans text-primary">Setup Complete!</CardTitle>
          <CardDescription className="text-lg text-muted-foreground mt-2">
            You're all set to manage your contracts with PactWise.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p>
            Explore your dashboard to get started with contract analysis, vendor management, and more.
          </p>
          <Button size="lg" className="w-full" onClick={handleGoToDashboard}>
            Go to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </CardContent>
         <CardFooter>
          <p className="text-xs text-muted-foreground">
            If you have any questions, check out our help center or contact support.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default CompleteOnboardingStep;
