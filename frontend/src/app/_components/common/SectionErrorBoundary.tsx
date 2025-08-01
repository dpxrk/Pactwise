'use client';

import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface SectionErrorBoundaryProps {
  children: React.ReactNode;
  sectionName: string;
  description?: string;
  showHomeButton?: boolean;
  onRetry?: () => void;
}

export const SectionErrorBoundary: React.FC<SectionErrorBoundaryProps> = ({
  children,
  sectionName,
  description,
  showHomeButton = true,
  onRetry,
}) => {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  return (
    <ErrorBoundary
      fallback={
        <Card className="w-full border-destructive">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <CardTitle className="text-destructive">
                  {sectionName} Error
                </CardTitle>
                {description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {description}
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Section Unavailable</AlertTitle>
              <AlertDescription>
                This section encountered an error and couldn't load properly. 
                Other parts of the application should continue to work normally.
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-3">
              <Button onClick={handleRetry} size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              {showHomeButton && (
                <Button variant="outline" onClick={handleGoHome} size="sm">
                  <Home className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      }
      showErrorDetails={process.env.NODE_ENV === 'development'}
      isolate={true}
    >
      {children}
    </ErrorBoundary>
  );
};

// Pre-configured error boundaries for common sections
export const ContractsErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SectionErrorBoundary
    sectionName="Contracts"
    description="There was an issue loading contract data"
  >
    {children}
  </SectionErrorBoundary>
);

export const AnalyticsErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SectionErrorBoundary
    sectionName="Analytics"
    description="There was an issue loading analytics data"
  >
    {children}
  </SectionErrorBoundary>
);

export const VendorsErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SectionErrorBoundary
    sectionName="Vendors"
    description="There was an issue loading vendor data"
  >
    {children}
  </SectionErrorBoundary>
);

export const DashboardErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SectionErrorBoundary
    sectionName="Dashboard"
    description="There was an issue loading dashboard data"
    showHomeButton={false}
  >
    {children}
  </SectionErrorBoundary>
);

export default SectionErrorBoundary;