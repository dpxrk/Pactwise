'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, AlertCircle, ArrowRight, CheckCircle, ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Validation schema
const resetPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address')
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export function ModernResetPasswordForm() {
  const router = useRouter();
  const { resetPassword } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema)
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: resetError } = await resetPassword(data.email);
      
      if (resetError) {
        if (resetError.message.includes('User not found')) {
          setError('No account found with this email address.');
        } else if (resetError.message.includes('Email rate limit exceeded')) {
          setError('Too many reset attempts. Please try again later.');
        } else {
          setError(resetError.message || 'An error occurred sending the reset email');
        }
        return;
      }

      // Successful reset email sent
      setSuccess(true);
    } catch (err) {
      console.error('Password reset error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-800 p-8">
          <div className="flex flex-col items-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-400" />
            <h2 className="text-2xl font-bold text-white text-center">Check your email</h2>
            <p className="text-center text-gray-400">
              We've sent a password reset link to your email address. 
              Please check your inbox and follow the instructions to reset your password.
            </p>
            <div className="text-sm text-gray-500 text-center">
              <p>
                Didn't receive the email? Check your spam folder or{' '}
                <button 
                  onClick={() => setSuccess(false)}
                  className="text-blue-400 hover:text-blue-300 underline cursor-pointer transition-colors"
                >
                  try again
                </button>
              </p>
            </div>
            <Link href="/auth/sign-in" className="w-full">
              <Button 
                variant="outline" 
                className="w-full bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-700/50 hover:text-white transition-all"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign in
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-800 p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Reset Password</h1>
          <p className="text-gray-400">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 bg-red-500/10 border-red-500/50 text-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-300">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="pl-10 bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500"
                disabled={isLoading}
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-red-400">{errors.email.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-2.5 transition-all duration-200"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending reset link...
              </>
            ) : (
              <>
                Send reset link
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        {/* Back to Sign In Link */}
        <div className="mt-8 text-center">
          <p className="text-gray-400">
            Remember your password?{' '}
            <Link
              href="/auth/sign-in"
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}