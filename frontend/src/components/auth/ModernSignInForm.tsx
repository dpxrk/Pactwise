'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, ArrowRight, Chrome, Github, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';

// Validation schema
const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type SignInFormData = z.infer<typeof signInSchema>;

export function ModernSignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const redirect = searchParams.get('redirect') || '/dashboard';
  const sessionExpired = searchParams.get('session_expired') === 'true';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn(data.email, data.password);
      if (result.success) {
        router.push(redirect);
      } else {
        setError(result.error || 'Invalid email or password');
      }
    } catch (err) {
      console.error('Sign in error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);

    try {
      const result = await signInWithGoogle();
      if (!result.success) {
        setError(result.error || 'Failed to sign in with Google');
      }
    } catch (err) {
      console.error('Google sign in error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="space-y-8">
        {/* Header */}
        <motion.div 
          initial={isMounted ? { opacity: 0, y: -20 } : false}
          animate={isMounted ? { opacity: 1, y: 0 } : false}
          transition={{ duration: 0.5 }}
          className="space-y-2 text-center"
        >
          <h1 className="text-3xl font-semibold tracking-tight" style={{ color: '#291528' }}>
            Welcome back
          </h1>
          <p className="text-base" style={{ color: '#3a3e3b' }}>
            Sign in to your account to continue
          </p>
        </motion.div>

        {/* Alerts */}
        <AnimatePresence mode="wait">
          {sessionExpired && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <Alert className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  Your session has expired. Please sign in again.
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* OAuth Buttons */}
        <motion.div 
          initial={isMounted ? { opacity: 0, y: 20 } : false}
          animate={isMounted ? { opacity: 1, y: 0 } : false}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-3"
        >
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 font-medium transition-all"
            style={{ 
              backgroundColor: '#ffffff',
              borderColor: '#9e829c',
              color: '#291528'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f0eff4';
              e.currentTarget.style.borderColor = '#291528';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.borderColor = '#9e829c';
            }}
            disabled={isLoading || isGoogleLoading}
            onClick={handleGoogleSignIn}
          >
            {isGoogleLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#9e829c' }} />
            ) : (
              <>
                <Chrome className="h-5 w-5 mr-3" style={{ color: '#291528' }} />
                <span>Continue with Google</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full h-12 font-medium transition-all opacity-50 cursor-not-allowed"
            style={{ 
              backgroundColor: '#ffffff',
              borderColor: '#9e829c',
              color: '#9e829c'
            }}
            disabled={true}
          >
            <Github className="h-5 w-5 mr-3" style={{ color: '#9e829c' }} />
            <span>Continue with GitHub</span>
          </Button>
        </motion.div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" style={{ borderColor: '#9e829c', opacity: 0.3 }}></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4" style={{ backgroundColor: '#f0eff4', color: '#9e829c' }}>or</span>
          </div>
        </div>

        {/* Form */}
        <motion.form 
          initial={isMounted ? { opacity: 0, y: 20 } : false}
          animate={isMounted ? { opacity: 1, y: 0 } : false}
          transition={{ duration: 0.5, delay: 0.2 }}
          onSubmit={handleSubmit(onSubmit)} 
          className="space-y-5"
        >
          <div className="space-y-2">
            <label 
              htmlFor="email" 
              className="block text-sm font-medium"
              style={{ color: '#291528' }}
            >
              Email address
            </label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className={`
                  h-12 px-4 bg-white text-gray-900
                  transition-all
                  ${errors.email ? 'border-red-500' : ''}
                `}
                style={{ 
                  borderColor: errors.email ? undefined : '#9e829c',
                  color: '#291528'
                }}
                onFocus={(e) => {
                  if (!errors.email) {
                    e.currentTarget.style.borderColor = '#291528';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(41, 21, 40, 0.1)';
                  }
                }}
                onBlur={(e) => {
                  if (!errors.email) {
                    e.currentTarget.style.borderColor = '#9e829c';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
                disabled={isLoading}
                {...register('email')}
              />
            </div>
            {errors.email && (
              <motion.p 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-600"
              >
                {errors.email.message}
              </motion.p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label 
                htmlFor="password" 
                className="block text-sm font-medium"
                style={{ color: '#291528' }}
              >
                Password
              </label>
              <Link
                href="/auth/reset-password"
                className="text-sm transition-colors"
                style={{ color: '#9e829c' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#291528'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#9e829c'}
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                className={`
                  h-12 px-4 pr-12 bg-white text-gray-900
                  transition-all
                  ${errors.password ? 'border-red-500' : ''}
                `}
                style={{ 
                  borderColor: errors.password ? undefined : '#9e829c',
                  color: '#291528'
                }}
                onFocus={(e) => {
                  if (!errors.password) {
                    e.currentTarget.style.borderColor = '#291528';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(41, 21, 40, 0.1)';
                  }
                }}
                onBlur={(e) => {
                  if (!errors.password) {
                    e.currentTarget.style.borderColor = '#9e829c';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
                disabled={isLoading}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: '#9e829c' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#291528'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#9e829c'}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <motion.p 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-600"
              >
                {errors.password.message}
              </motion.p>
            )}
          </div>

          <motion.div
            whileHover={isMounted ? { scale: 1.01 } : undefined}
            whileTap={isMounted ? { scale: 0.99 } : undefined}
          >
            <Button
              type="submit"
              className="w-full h-12 text-white font-semibold transition-all"
              style={{ backgroundColor: '#291528' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#000000'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#291528'}
              disabled={isLoading || isGoogleLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  Sign in
                  <ArrowRight className="ml-2 h-5 w-5" />
                </span>
              )}
            </Button>
          </motion.div>
        </motion.form>

        {/* Footer */}
        <motion.div 
          initial={isMounted ? { opacity: 0 } : false}
          animate={isMounted ? { opacity: 1 } : false}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-4"
        >
          <p className="text-center text-sm" style={{ color: '#3a3e3b' }}>
            Don&apos;t have an account?{' '}
            <Link
              href="/auth/sign-up"
              className="font-medium transition-colors"
              style={{ color: '#291528' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#000000'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#291528'}
            >
              Sign up for free
            </Link>
          </p>

          <p className="text-center text-xs" style={{ color: '#9e829c' }}>
            By signing in, you agree to our{' '}
            <Link 
              href="/terms" 
              className="underline underline-offset-2 transition-colors"
              style={{ color: '#9e829c' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#291528'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#9e829c'}
            >
              Terms
            </Link>
            ,{' '}
            <Link 
              href="/privacy" 
              className="underline underline-offset-2 transition-colors"
              style={{ color: '#9e829c' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#291528'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#9e829c'}
            >
              Privacy Policy
            </Link>
            , and{' '}
            <Link 
              href="/cookies" 
              className="underline underline-offset-2 transition-colors"
              style={{ color: '#9e829c' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#291528'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#9e829c'}
            >
              Cookie Policy
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}