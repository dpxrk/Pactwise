'use client'

import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { OptimizedContractList } from "@/app/_components/contracts/OptimizedContractList";
import { NewContractButton } from "@/app/_components/contracts/NewContractButton";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import type { Id } from "@/types/id.types";

const OptimizedContractsPage = () => {
  const router = useRouter();
  const { userProfile } = useAuth();
  
  // Get enterprise ID from user profile
  const enterpriseId = userProfile?.enterprise_id as Id<"enterprises">;

  if (!enterpriseId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Loading user context...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 min-h-screen" style={{ backgroundColor: '#f0eff4' }}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            All Contracts
          </h2>
          <p className="text-muted-foreground mt-1">Manage and track your contract portfolio</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/contracts/templates')}
          >
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <NewContractButton />
        </div>
      </div>

      {/* Optimized Contract List with built-in virtualization */}
      <OptimizedContractList enterpriseId={enterpriseId} />
    </div>
  );
};

export default OptimizedContractsPage;