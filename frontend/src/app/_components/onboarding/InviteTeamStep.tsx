// src/app/_components/onboarding/InviteTeamStep.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, Send, UserPlus, SkipForward, Trash2 } from 'lucide-react';

interface InviteTeamStepProps {
  onStepComplete: (nextStep?: OnboardingStep, metadata?: Record<string, unknown>) => void;
  onSkip: (nextStep?: OnboardingStep) => void;
}

interface Invitation {
  email: string;
  role: UserRole;
}

const InviteTeamStep: React.FC<InviteTeamStepProps> = ({ onStepComplete, onSkip }) => {
  const [invitations, setInvitations] = useState<Invitation[]>([{ email: '', role: 'user' }]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  //   const mutation = { execute: async () => ({}), isLoading: false, error: null };
  const placeholder = { execute: async () => ({}), isLoading: false };

  const handleInputChange = (index: number, field: keyof Invitation, value: string) => {
    const newInvitations = [...invitations];
    if (newInvitations[index]) {
      if (field === 'role') {
        newInvitations[index][field] = value as UserRole;
      } else {
        newInvitations[index][field] = value;
      }
    }
    setInvitations(newInvitations);
  };

  const addInvitationField = () => {
    setInvitations([...invitations, { email: '', role: 'user' }]);
  };

  const removeInvitationField = (index: number) => {
    const newInvitations = invitations.filter((_, i) => i !== index);
    setInvitations(newInvitations);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const validInvitations = invitations.filter(inv => inv.email.trim() !== '');
    if (validInvitations.length === 0) {
      setError("Please enter at least one email address to invite.");
      return;
    }

    let allSuccessful = true;
    const sentEmails: string[] = [];

    for (const inv of validInvitations) {
      try {
        await createInvitationMutation.execute({ email: inv.email, role: inv.role });
        sentEmails.push(inv.email);
      } catch (err) {
        setError(`Failed to send invitation to ${inv.email}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        allSuccessful = false;
        // Optionally break or collect all errors
      }
    }

    if (allSuccessful && sentEmails.length > 0) {
      setSuccessMessage(`Successfully sent ${sentEmails.length} invitation(s).`);
      // Clear fields after successful submission
      setInvitations([{ email: '', role: 'user' }]);
      // Wait a bit for the user to see the success message before proceeding
      setTimeout(() => {
        onStepComplete(ONBOARDING_STEPS.COMPLETE); 
      }, 2000);
    } else if (sentEmails.length > 0) {
       setSuccessMessage(`Sent ${sentEmails.length} invitation(s) with some errors.`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-transparent p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <UserPlus className="mx-auto h-12 w-12 text-gold mb-4" />
          <CardTitle className="text-2xl font-sans text-primary">Invite Your Team</CardTitle>
          <CardDescription>Add team members to collaborate in PactWise. You can always do this later.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {successMessage && (
              <Alert variant="default"> {/* Changed to default for success */}
                <AlertCircle className="h-4 w-4" /> {/* Consider CheckCircle for success */}
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}

            {invitations.map((inv, index) => (
              <div key={index} className="space-y-3 p-3 border rounded-md bg-card">
                <div className="flex items-end space-x-2">
                  <div className="flex-grow space-y-1.5">
                    <Label htmlFor={`email-${index}`}>Email Address</Label>
                    <Input
                      id={`email-${index}`}
                      type="email"
                      value={inv.email}
                      onChange={(e) => handleInputChange(index, 'email', e.target.value)}
                      placeholder="teammate@example.com"
                    />
                  </div>
                  <div className="space-y-1.5 w-1/3">
                    <Label htmlFor={`role-${index}`}>Role</Label>
                    <Select
                      value={inv.role}
                      onValueChange={(value) => handleInputChange(index, 'role', value)}
                    >
                      <SelectTrigger id={`role-${index}`}>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {userRoleOptions.map(role => (
                          <SelectItem key={role} value={role}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {invitations.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeInvitationField(index)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            <Button type="button" variant="outline" onClick={addInvitationField} className="w-full">
              <UserPlus className="mr-2 h-4 w-4" /> Add Another Teammate
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row justify-between gap-3 pt-6">
            <Button type="button" variant="ghost" onClick={() => onSkip(ONBOARDING_STEPS.COMPLETE)} className="w-full sm:w-auto">
              <SkipForward className="mr-2 h-4 w-4" /> Skip for Now
            </Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={createInvitationMutation.isLoading}>
              {createInvitationMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Send className="mr-2 h-4 w-4" /> Send Invitations
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default InviteTeamStep;