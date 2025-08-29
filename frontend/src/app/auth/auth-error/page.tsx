'use client';

import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuthErrorPage() {
  return (
    <div className="relative bg-gradient-to-b from-slate-50 to-transparent py-16 min-h-screen flex items-center justify-center">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-gradient-to-br from-red-50/50 to-transparent" />
        <div className="absolute bottom-0 left-0 w-1/4 h-1/4 bg-gradient-to-tr from-primary/5 to-transparent" />
      </div>
      
      <div className="max-w-md w-full relative z-10">
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Authentication Error</CardTitle>
            <CardDescription className="text-red-700">
              There was a problem with your authentication request
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>This could be due to:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>The authentication link has expired</li>
                <li>The link has already been used</li>
                <li>There was a network error</li>
                <li>Your session has timed out</li>
              </ul>
            </div>
            
            <div className="flex flex-col gap-2">
              <Link href="/auth/sign-in">
                <Button className="w-full">
                  Try signing in again
                </Button>
              </Link>
              <Link href="/auth/reset-password">
                <Button variant="outline" className="w-full">
                  Reset password
                </Button>
              </Link>
            </div>
            
            <p className="text-center text-sm text-muted-foreground">
              If you continue to experience issues, please{' '}
              <a href="mailto:support@pactwise.com" className="text-primary hover:underline">
                contact support
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}