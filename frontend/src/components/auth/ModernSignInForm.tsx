'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, ArrowRight, Chrome, Eye, EyeOff, Github, Loader2 } from 'lucide-react';
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

const BrandColors = {
  primary: '#291528',
  secondary: '#9e829c',
  accent: '#f0eff4',
  textPrimary: '#291528',
  textSecondary: '#3a3e3b',
};

export function ModernSignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signInWithGoogle } = useAuth();

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
          // Success - either user is returned or no error
          // Use window.location for a full page navigation to ensure session is established
          setTimeout(() => {
            window.location.href = redirect;
          }, 100);
        }
      } catch (err) {
        console.error('Auth error:', err);
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
        setError(errorMessage);
      }
    });
  }, [redirect, router]);

  const onSubmit = (data: SignInFormData) => handleAuthAction(() => signIn(data.email, data.password, stayLoggedIn));
  const handleGoogleSignIn = () => handleAuthAction(signInWithGoogle);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-[${BrandColors.textPrimary}]">Welcome back</h1>
          <p className="text-base text-[${BrandColors.textSecondary}]">Sign in to your account to continue</p>
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="space-y-3">
          <Button type="button" variant="outline" className="w-full h-12 font-medium transition-all border-[${BrandColors.secondary}] text-[${BrandColors.primary}] hover:bg-[${BrandColors.accent}] hover:border-[${BrandColors.primary}]" disabled={isPending} onClick={handleGoogleSignIn}>
            {isPending ? <Loader2 className={`h-5 w-5 animate-spin text-[${BrandColors.secondary}]`} /> : <><Chrome className={`h-5 w-5 mr-3 text-[${BrandColors.primary}]`} /><span>Continue with Google</span></>}
          </Button>
          <Button type="button" variant="outline" className="w-full h-12 font-medium transition-all opacity-50 cursor-not-allowed border-[${BrandColors.secondary}] text-[${BrandColors.secondary}]" disabled={true}>
            <Github className="h-5 w-5 mr-3" />
            <span>Continue with GitHub</span>
          </Button>
        </motion.div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className={`w-full border-t border-[${BrandColors.secondary}] opacity-30`}></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className={`px-4 bg-[${BrandColors.accent}] text-[${BrandColors.secondary}]`}>or</span>
          </div>
        </div>

        <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className={`block text-sm font-medium text-[${BrandColors.primary}]`}>Email address</label>
            <div className="relative">
              <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" className={`h-12 px-4 bg-white text-gray-900 transition-all border-[${BrandColors.secondary}] text-[${BrandColors.primary}] focus:border-[${BrandColors.primary}] focus:ring-2 focus:ring-[${BrandColors.primary}]/20 ${errors.email ? 'border-red-500' : ''}`} disabled={isPending} {...register('email')} />
            </div>
            {errors.email && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-red-600">{errors.email.message}</motion.p>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className={`block text-sm font-medium text-[${BrandColors.primary}]`}>Password</label>
              <Link href="/auth/reset-password" className={`text-sm transition-colors text-[${BrandColors.secondary}] hover:text-[${BrandColors.primary}]`}>Forgot password?</Link>
            </div>
            <div className="relative">
              <Input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" className={`h-12 px-4 pr-12 bg-white text-gray-900 transition-all border-[${BrandColors.secondary}] text-[${BrandColors.primary}] focus:border-[${BrandColors.primary}] focus:ring-2 focus:ring-[${BrandColors.primary}]/20 ${errors.password ? 'border-red-500' : ''}`} disabled={isPending} {...register('password')} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors text-[${BrandColors.secondary}] hover:text-[${BrandColors.primary}]`}>
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
            <Button type="submit" className={`w-full h-12 text-white font-semibold transition-all bg-[${BrandColors.primary}] hover:bg-black`} disabled={isPending}>
              {isPending ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Signing in...</> : <span className="flex items-center justify-center">Sign in <ArrowRight className="ml-2 h-5 w-5" /></span>}
            </Button>
          </motion.div>
        </motion.form>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.3 }} className="space-y-4">
          <p className={`text-center text-sm text-[${BrandColors.textSecondary}]`}>
            Don&apos;t have an account?{' '}
            <Link href="/auth/sign-up" className={`font-medium transition-colors text-[${BrandColors.primary}] hover:text-black`}>Sign up for free</Link>
          </p>
          <p className={`text-center text-xs text-[${BrandColors.secondary}]`}>
            By signing in, you agree to our{' '}
            <Link href="/terms" className={`underline underline-offset-2 transition-colors text-[${BrandColors.secondary}] hover:text-[${BrandColors.primary}]`}>Terms</Link>,{' '}
            <Link href="/privacy" className={`underline underline-offset-2 transition-colors text-[${BrandColors.secondary}] hover:text-[${BrandColors.primary}]`}>Privacy Policy</Link>, and{' '}
            <Link href="/cookies" className={`underline underline-offset-2 transition-colors text-[${BrandColors.secondary}] hover:text-[${BrandColors.primary}]`}>Cookie Policy</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
