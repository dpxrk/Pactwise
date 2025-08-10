// src/app/_components/onboarding/ProfileSetupStep.tsx
'use client';

import React, { useState, useEffect } from 'react';
// import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, User, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileSetupStepProps {
  onStepComplete: () => void;
}

const ProfileSetupStep: React.FC<ProfileSetupStepProps> = ({ onStepComplete }) => {
  const { user, userProfile } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  // TODO: Replace with Supabase mutation
  const completeProfileMutation = {
    execute: async (args: any) => {
      // This will be replaced with actual Supabase implementation
      console.log('Profile setup:', args);
      return { success: true };
    },
    isLoading: false
  };
  
  // Pre-fill from Supabase if available
  useEffect(() => {
    if (userProfile) {
      setFirstName(userProfile.first_name || '');
      setLastName(userProfile.last_name || '');
      // Clerk might not have these other fields readily, or they are custom attributes
    }
  }, [userProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError("First name and last name are required.");
      return;
    }

    try {
      const args: {
        firstName: string;
        lastName: string;
        phoneNumber?: string;
        department?: string;
        title?: string;
      } = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      };
      
      if (phoneNumber.trim()) {
        args.phoneNumber = phoneNumber.trim();
      }
      
      if (department.trim()) {
        args.department = department.trim();
      }
      
      if (title.trim()) {
        args.title = title.trim();
      }
      
      await completeProfileMutation.execute(args);
      onStepComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-transparent p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <User className="mx-auto h-12 w-12 text-gold mb-4" />
          <CardTitle className="text-2xl font-sans text-primary">Complete Your Profile</CardTitle>
          <CardDescription>Tell us a bit more about yourself.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First Name <span className="text-destructive">*</span></Label>
                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last Name <span className="text-destructive">*</span></Label>
                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
              <Input id="phoneNumber" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title">Job Title (Optional)</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Contract Manager" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="department">Department (Optional)</Label>
              <Input id="department" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g., Legal, Sales" />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={completeProfileMutation.isLoading}>
              {completeProfileMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Profile & Continue
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ProfileSetupStep;