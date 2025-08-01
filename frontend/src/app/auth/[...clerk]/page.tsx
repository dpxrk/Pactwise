'use client';

import { ClerkLoaded, ClerkLoading } from "@clerk/clerk-react";

export default function ClerkAuthPage() {
  return (
    <div className="relative bg-gradient-to-b from-slate-50 to-transparent min-h-screen flex items-center justify-center">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-gradient-to-br from-gold/10 to-transparent" />
        <div className="absolute bottom-0 left-0 w-1/4 h-1/4 bg-gradient-to-tr from-primary/5 to-transparent" />
      </div>
      
      <div className="relative z-10">
        <ClerkLoading>
          <div className="text-center">
            <div className="mb-4 p-3 bg-primary/5 rounded-sm inline-block">
              <div className="w-10 h-10 border-t-2 border-gold animate-spin rounded-full"></div>
            </div>
            <p className="text-muted-foreground">Loading authentication...</p>
          </div>
        </ClerkLoading>
        
        <ClerkLoaded>
          <div className="text-center">
            <p className="text-muted-foreground">Redirecting...</p>
          </div>
        </ClerkLoaded>
      </div>
    </div>
  );
}