'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  RefreshCw, 
  Home, 
  Mail, 
  Bug,
  ArrowLeft,
  HelpCircle
} from 'lucide-react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to your error reporting service
    console.error('Application error:', error);
    
    // Report to monitoring service if available - use errorTracker directly to avoid circular dependency
    if (typeof window !== 'undefined') {
      import('@/lib/monitoring').then(({ errorTracker }) => {
        errorTracker.captureError(error, {
          digest: error.digest,
          page: 'error-boundary',
          errorType: 'application-error'
        });
      }).catch(console.error);
    }
  }, [error]);

  const getErrorTitle = () => {
    if (error.message.includes('Network')) return 'Network Error';
    if (error.message.includes('Auth')) return 'Authentication Error';
    if (error.message.includes('Permission')) return 'Permission Error';
    if (error.message.includes('Not Found')) return 'Resource Not Found';
    return 'Something Went Wrong';
  };

  const getErrorDescription = () => {
    if (error.message.includes('Network')) {
      return 'Unable to connect to our servers. Please check your internet connection and try again.';
    }
    if (error.message.includes('Auth')) {
      return 'There was a problem with your authentication. Please sign in again.';
    }
    if (error.message.includes('Permission')) {
      return 'You don\'t have permission to access this resource. Contact your administrator if you believe this is an error.';
    }
    if (error.message.includes('Not Found')) {
      return 'The resource you\'re looking for could not be found. It may have been moved or deleted.';
    }
    return 'An unexpected error occurred. Our team has been notified and is working to fix the issue.';
  };

  const shouldShowTechnicalDetails = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Main Error Display */}
        <Card className="border-red-200">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-800">{getErrorTitle()}</CardTitle>
            <CardDescription className="text-lg">
              {getErrorDescription()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Error Details for Development */}
            {shouldShowTechnicalDetails && (
              <Alert variant="destructive">
                <Bug className="h-4 w-4" />
                <AlertTitle>Technical Details (Development Only)</AlertTitle>
                <AlertDescription className="mt-2">
                  <div className="space-y-2">
                    <div>
                      <strong>Error:</strong> {error.message}
                    </div>
                    {error.digest && (
                      <div>
                        <strong>Error ID:</strong> {error.digest}
                      </div>
                    )}
                    {error.stack && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm font-medium">
                          Stack Trace
                        </summary>
                        <pre className="mt-2 text-xs bg-red-50 p-2 rounded overflow-auto max-h-40">
                          {error.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Error ID for Production */}
            {!shouldShowTechnicalDetails && error.digest && (
              <Alert>
                <HelpCircle className="h-4 w-4" />
                <AlertTitle>Error Reference</AlertTitle>
                <AlertDescription>
                  Error ID: <code className="bg-muted px-1 rounded">{error.digest}</code>
                  <br />
                  <span className="text-sm text-muted-foreground">
                    Please include this ID when contacting support.
                  </span>
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={reset} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard">
                  <Home className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Link>
              </Button>
              <Button variant="outline" onClick={() => window.history.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Help and Support */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Need Additional Help?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-medium mb-2">Contact Support</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Our support team is here to help you resolve this issue.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="mailto:support@pactwise.com">
                    <Mail className="h-4 w-4 mr-2" />
                    Email Support
                  </Link>
                </Button>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-medium mb-2">Check System Status</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  See if there are any ongoing issues with our services.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="https://status.pactwise.com" target="_blank">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    System Status
                  </Link>
                </Button>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Quick Troubleshooting Tips:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Try refreshing the page or clearing your browser cache</li>
                <li>• Check your internet connection</li>
                <li>• Try accessing the page in an incognito/private browser window</li>
                <li>• Disable browser extensions temporarily</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            If this problem persists, please{' '}
            <Link href="mailto:support@pactwise.com" className="text-blue-600 hover:underline">
              contact our support team
            </Link>{' '}
            with the error details above.
          </p>
        </div>
      </div>
    </div>
  );
}