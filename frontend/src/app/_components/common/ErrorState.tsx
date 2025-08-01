"use client";

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  AlertCircle, 
  XCircle, 
  RefreshCcw, 
  Home,
  FileQuestion,
  ServerCrash,
  WifiOff
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ErrorStateProps {
  error?: Error | string | null;
  title?: string;
  description?: string;
  onRetry?: () => void;
  showHomeButton?: boolean;
  variant?: 'inline' | 'full' | 'card';
  icon?: React.ReactNode;
}

export function ErrorState({
  error,
  title = "Something went wrong",
  description,
  onRetry,
  showHomeButton = false,
  variant = 'inline',
  icon,
}: ErrorStateProps) {
  const router = useRouter();
  
  // Determine error message
  const errorMessage = description || (
    error instanceof Error 
      ? error.message 
      : typeof error === 'string' 
        ? error 
        : "An unexpected error occurred. Please try again."
  );

  // Determine icon based on error type
  const getErrorIcon = () => {
    if (icon) return icon;
    
    if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('fetch')) {
      return <WifiOff className="h-5 w-5" />;
    }
    if (errorMessage.toLowerCase().includes('server')) {
      return <ServerCrash className="h-5 w-5" />;
    }
    if (errorMessage.toLowerCase().includes('not found')) {
      return <FileQuestion className="h-5 w-5" />;
    }
    return <XCircle className="h-5 w-5" />;
  };

  const content = (
    <>
      <div className="flex gap-2">
        {getErrorIcon()}
        <div className="flex-1">
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription className="mt-1">
            {errorMessage}
          </AlertDescription>
        </div>
      </div>
      {(onRetry || showHomeButton) && (
        <div className="flex gap-2 mt-4">
          {onRetry && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onRetry}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
          {showHomeButton && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push('/dashboard')}
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          )}
        </div>
      )}
    </>
  );

  if (variant === 'full') {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-8">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            {content}
          </Alert>
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <Alert variant="destructive" className="border-0 shadow-none">
            {content}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Alert variant="destructive">
      {content}
    </Alert>
  );
}

// Specific error state components
export function NetworkErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Connection Error"
      description="Unable to connect to the server. Please check your internet connection and try again."
      icon={<WifiOff className="h-5 w-5" />}
      onRetry={onRetry}
    />
  );
}

export function NotFoundErrorState({ 
  resource = "Resource",
  showHomeButton = true 
}: { 
  resource?: string;
  showHomeButton?: boolean;
}) {
  return (
    <ErrorState
      title={`${resource} Not Found`}
      description={`The ${resource.toLowerCase()} you're looking for doesn't exist or you don't have permission to access it.`}
      icon={<FileQuestion className="h-5 w-5" />}
      showHomeButton={showHomeButton}
    />
  );
}

export function PermissionErrorState() {
  return (
    <ErrorState
      title="Access Denied"
      description="You don't have permission to perform this action. Please contact your administrator if you believe this is an error."
      icon={<AlertCircle className="h-5 w-5" />}
      showHomeButton
    />
  );
}