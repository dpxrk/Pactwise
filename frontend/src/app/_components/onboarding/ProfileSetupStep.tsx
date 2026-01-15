// src/app/_components/onboarding/ProfileSetupStep.tsx
'use client';

import { useMutation } from '@tanstack/react-query';
import { AlertCircle, User, Loader2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

interface ProfileSetupStepProps {
  onStepComplete: () => void;
}

const ProfileSetupStep: React.FC<ProfileSetupStepProps> = ({ onStepComplete }) => {
  const { user: _user, userProfile } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Supabase mutation to update user profile
  const completeProfileMutation = useMutation({
    mutationFn: async (args: {
      firstName: string;
      lastName: string;
      phoneNumber?: string;
      department?: string;
      title?: string;
    }) => {
      if (!userProfile?.id) throw new Error('User profile not found');

      const { error } = await (supabase as any)
        .from('users')
        .update({
          first_name: args.firstName,
          last_name: args.lastName,
          phone: args.phoneNumber || null,
          department: args.department || null,
          job_title: args.title || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userProfile.id);

      if (error) throw error;
      return { success: true };
    },
  });
  
  // Pre-fill from Supabase if available
  useEffect(() => {
    if (userProfile) {
      setFirstName(userProfile.first_name || '');
      setLastName(userProfile.last_name || '');
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
      
      await completeProfileMutation.mutateAsync(args);
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
            <Button type="submit" className="w-full" disabled={completeProfileMutation.isPending}>
              {completeProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Profile & Continue
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ProfileSetupStep;