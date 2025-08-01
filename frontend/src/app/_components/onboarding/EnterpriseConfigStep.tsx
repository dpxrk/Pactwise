// src/app/_components/onboarding/EnterpriseConfigStep.tsx
'use client';

import React, { useState } from 'react';
import { useConvexMutation } from '@/lib/api-client';
// import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Briefcase, Users, BarChart, Loader2 } from 'lucide-react';

interface EnterpriseConfigStepProps {
  onStepComplete: () => void;
}

const companySizes = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"] as const;
const contractVolumes = ["low", "medium", "high", "enterprise"] as const;

const EnterpriseConfigStep: React.FC<EnterpriseConfigStepProps> = ({ onStepComplete }) => {
  const [industry, setIndustry] = useState('');
  const [size, setSize] = useState<typeof companySizes[number] | ''>('');
  const [contractVolume, setContractVolume] = useState<typeof contractVolumes[number] | ''>('');
  // primaryUseCase can be a multi-select or comma-separated input; simplified here
  const [primaryUseCase, setPrimaryUseCase] = useState(''); 
  const [error, setError] = useState<string | null>(null);

  const completeConfigMutation = useConvexMutation(api.onboarding.completeEnterpriseConfig);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!industry.trim() || !size) {
      setError("Industry and company size are required.");
      return;
    }

    try {
      const args: {
        industry: string;
        size: typeof companySizes[number];
        contractVolume?: typeof contractVolumes[number];
        primaryUseCase?: string[];
      } = {
        industry: industry.trim(),
        size: size as typeof companySizes[number], // Ensure type safety
      };
      
      if (contractVolume) {
        args.contractVolume = contractVolume;
      }
      
      const useCases = primaryUseCase.split(',').map(s => s.trim()).filter(s => s);
      if (useCases.length > 0) {
        args.primaryUseCase = useCases;
      }
      
      await completeConfigMutation.execute(args);
      onStepComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save enterprise configuration.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-transparent p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <Briefcase className="mx-auto h-12 w-12 text-gold mb-4" />
          <CardTitle className="text-2xl font-sans text-primary">Configure Your Enterprise</CardTitle>
          <CardDescription>Help us tailor PactWise to your company's needs.</CardDescription>
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
            <div className="space-y-1.5">
              <Label htmlFor="industry">Industry <span className="text-destructive">*</span></Label>
              <Input id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g., Technology, Healthcare, Finance" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="size">Company Size <span className="text-destructive">*</span></Label>
              <Select value={size} onValueChange={(value) => setSize(value as typeof companySizes[number])} required>
                <SelectTrigger id="size"><SelectValue placeholder="Select company size..." /></SelectTrigger>
                <SelectContent>
                  {companySizes.map(s => <SelectItem key={s} value={s}>{s} employees</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
             <div className="space-y-1.5">
              <Label htmlFor="contractVolume">Typical Contract Volume (Optional)</Label>
              <Select value={contractVolume} onValueChange={(value) => setContractVolume(value as typeof contractVolumes[number])}>
                <SelectTrigger id="contractVolume"><SelectValue placeholder="Select contract volume..." /></SelectTrigger>
                <SelectContent>
                  {contractVolumes.map(v => <SelectItem key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
             <div className="space-y-1.5">
              <Label htmlFor="primaryUseCase">Primary Use Cases (Optional, comma-separated)</Label>
              <Input id="primaryUseCase" value={primaryUseCase} onChange={(e) => setPrimaryUseCase(e.target.value)} placeholder="e.g., Vendor Management, Sales Contracts" />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={completeConfigMutation.isLoading}>
              {completeConfigMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Configuration & Continue
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default EnterpriseConfigStep;