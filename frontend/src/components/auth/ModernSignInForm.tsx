'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type SignInFormData = z.infer<typeof signInSchema>;


export function ModernSignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [isPending, startTransition] = useTransition();

  const redirect = searchParams.get('redirect') || '/dashboard';
  const sessionExpired = searchParams.get('session_expired') === 'true';

  const { register, handleSubmit, formState: { errors } } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    mode: 'onBlur',
  });

  const handleAuthAction = useCallback(async (action: () => Promise<any>) => {
    startTransition(async () => {
      setError(null);
      try {
        const result = await action();
        // Check if result has an error property
        if (result.error) {
          // Handle different error types
          const errorMessage = typeof result.error === 'string'
            ? result.error
            : result.error?.message || 'An unexpected error occurred.';
          setError(errorMessage);
        } else if (result.user || !result.error) {
          // Success - Let middleware handle redirect by reloading the page
          // This prevents race condition between client-side navigation and middleware redirect
          window.location.href = redirect;
        }
      } catch (err) {
        console.error('Auth error:', err);
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
        setError(errorMessage);
      }
    });
  }, [redirect]);

  const onSubmit = (data: SignInFormData) => handleAuthAction(() => signIn(data.email, data.password, stayLoggedIn));

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-purple-900">Welcome back</h1>
          <p className="text-base text-ghost-700">Sign in to your account to continue</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {sessionExpired && (
            <motion.div
              key="session-expired"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <Alert className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">Your session has expired. Please sign in again.</AlertDescription>
              </Alert>
            </motion.div>
          )}
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-purple-900">Email address</label>
            <div className="relative">
              <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" className={`h-12 px-4 bg-white text-gray-900 transition-all border-purple-500 text-purple-900 focus:border-purple-900 focus:ring-2 focus:ring-purple-900/20 ${errors.email ? 'border-red-500' : ''}`} disabled={isPending} {...register('email')} />
            </div>
            {errors.email && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-red-600">{errors.email.message}</motion.p>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-purple-900">Password</label>
              <Link href="/auth/reset-password" className="text-sm transition-colors text-purple-500 hover:text-purple-900">Forgot password?</Link>
            </div>
            <div className="relative">
              <Input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" className={`h-12 px-4 pr-12 bg-white text-gray-900 transition-all border-purple-500 text-purple-900 focus:border-purple-900 focus:ring-2 focus:ring-purple-900/20 ${errors.password ? 'border-red-500' : ''}`} disabled={isPending} {...register('password')} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors text-purple-500 hover:text-purple-900">
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-red-600">{errors.password.message}</motion.p>}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="stay-logged-in" 
              checked={stayLoggedIn} 
              onCheckedChange={(checked) => setStayLoggedIn(checked as boolean)}
              className="border-gray-300 data-[state=checked]:bg-[#291528] data-[state=checked]:border-[#291528]"
            />
            <label 
              htmlFor="stay-logged-in" 
              className="text-sm font-medium text-gray-700 cursor-pointer select-none"
            >
              Stay logged in for 30 days
            </label>
          </div>

          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Button type="submit" className="w-full h-12 text-white font-semibold transition-all bg-purple-900 hover:bg-purple-800" disabled={isPending}>
              {isPending ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Signing in...</> : <span className="flex items-center justify-center">Sign in <ArrowRight className="ml-2 h-5 w-5" /></span>}
            </Button>
          </motion.div>
        </motion.form>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.3 }} className="space-y-4">
          <p className="text-center text-sm text-ghost-700">
            Don&apos;t have an account?{' '}
            <Link href="/auth/sign-up" className="font-medium transition-colors text-purple-900 hover:text-purple-800">Sign up for free</Link>
          </p>
          <p className="text-center text-xs text-purple-500">
            By signing in, you agree to our{' '}
            <Link href="/terms" className="underline underline-offset-2 transition-colors text-purple-500 hover:text-purple-900">Terms</Link>,{' '}
            <Link href="/privacy" className="underline underline-offset-2 transition-colors text-purple-500 hover:text-purple-900">Privacy Policy</Link>, and{' '}
            <Link href="/cookies" className="underline underline-offset-2 transition-colors text-purple-500 hover:text-purple-900">Cookie Policy</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
