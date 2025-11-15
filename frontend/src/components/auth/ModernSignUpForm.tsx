'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, ArrowRight, Eye, EyeOff, CheckCircle, Loader2, Check, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';


// Password requirements
const passwordRequirements = [
  { id: 'length', label: '8-124 characters', regex: /^.{8,124}$/ },
  { id: 'uppercase', label: 'One uppercase letter', regex: /[A-Z]/ },
  { id: 'lowercase', label: 'One lowercase letter', regex: /[a-z]/ },
  { id: 'number', label: 'One number', regex: /[0-9]/ },
  { id: 'special', label: 'One special character', regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/ },
];

// Validation schema
const signUpSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(124, 'Password must be no more than 124 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
  agreeToTerms: z.boolean().refine(val => val === true, {
    message: 'You must agree to the terms and conditions'
  })
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

type SignUpFormData = z.infer<typeof signUpSchema>;

// Password validation component
function PasswordRequirement({ met, label }: { met: boolean; label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-2 text-xs"
    >
      {met ? (
        <Check className="h-3 w-3 text-green-600" />
      ) : (
        <X className="h-3 w-3 text-purple-500" />
      )}
      <span className={met ? 'text-green-800' : 'text-ghost-700'}>
        {label}
      </span>
    </motion.div>
  );
}

export function ModernSignUpForm() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [passwordFocused, setPasswordFocused] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      agreeToTerms: false
    },
    mode: 'onBlur',
  });

  const agreeToTerms = watch('agreeToTerms');
  const password = watch('password', '');
  const confirmPassword = watch('confirmPassword', '');

  // Check password requirements
  const passwordValidation = useMemo(() => {
    return passwordRequirements.map(req => ({
      ...req,
      met: req.regex.test(password)
    }));
  }, [password]);

  // Check if passwords match
  const passwordsMatch = useMemo(() => {
    return password && confirmPassword && password === confirmPassword;
  }, [password, confirmPassword]);

  const passwordsDontMatch = useMemo(() => {
    return confirmPassword && password !== confirmPassword;
  }, [password, confirmPassword]);

  const handleAuthAction = useCallback(async (action: () => Promise<any>) => {
    startTransition(async () => {
      setError(null);
      try {
        const result = await action();
        if (result?.error) {
          const errorMessage = typeof result.error === 'string'
            ? result.error
            : result.error?.message || 'An unexpected error occurred.';
          setError(errorMessage);
        } else if (result?.user) {
          setSuccess(true);
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        }
      } catch (err) {
        console.error('Auth error:', err);
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
        setError(errorMessage);
      }
    });
  }, [router]);

  const onSubmit = (data: SignUpFormData) => {
    handleAuthAction(() => signUp(data.email, data.password, { full_name: data.fullName }));
  };

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4"
        >
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-purple-100">
              <CheckCircle className="h-10 w-10 text-purple-900" />
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-purple-900">
            Account Created Successfully!
          </h2>
          <p className="text-base text-ghost-700">
            Welcome to Pactwise! Redirecting you to complete your profile...
          </p>
          <div className="flex justify-center pt-2">
            <Loader2 className="h-5 w-5 animate-spin text-purple-900" />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-2 text-center"
        >
          <h1 className="text-3xl font-semibold tracking-tight text-purple-900">
            Create your account
          </h1>
          <p className="text-base text-ghost-700">
            Start your 14-day free trial
          </p>
        </motion.div>

        {/* Error Alert */}
        <AnimatePresence mode="wait">
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

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5"
        >
          <div className="space-y-2">
            <label htmlFor="fullName" className="block text-sm font-medium text-purple-900">
              Full name
            </label>
            <Input
              id="fullName"
              type="text"
              autoComplete="name"
              placeholder="John Doe"
              className={`h-12 px-4 bg-white transition-all border-purple-500 text-purple-900 focus:border-purple-900 focus:ring-2 focus:ring-purple-900/20 ${
                errors.fullName ? 'border-red-500' : ''
              }`}
              disabled={isPending}
              {...register('fullName')}
            />
            {errors.fullName && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-600"
              >
                {errors.fullName.message}
              </motion.p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-purple-900">
              Email address
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className={`h-12 px-4 bg-white transition-all border-purple-500 text-purple-900 focus:border-purple-900 focus:ring-2 focus:ring-purple-900/20 ${
                errors.email ? 'border-red-500' : ''
              }`}
              disabled={isPending}
              {...register('email')}
            />
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
            <label htmlFor="password" className="block text-sm font-medium text-purple-900">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Create a strong password"
                className={`h-12 px-4 pr-12 bg-white transition-all border-purple-500 text-purple-900 focus:border-purple-900 focus:ring-2 focus:ring-purple-900/20 ${
                  errors.password ? 'border-red-500' : ''
                }`}
                disabled={isPending}
                onFocus={() => setPasswordFocused(true)}
                {...register('password', { onBlur: () => setPasswordFocused(false) })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors text-purple-500 hover:text-purple-900"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {/* Password Requirements */}
            {(passwordFocused || password) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1 pt-2 px-3 pb-2 rounded-lg bg-ghost-100"
              >
                {passwordValidation.map((req) => (
                  <PasswordRequirement
                    key={req.id}
                    met={req.met}
                    label={req.label}
                  />
                ))}
              </motion.div>
            )}

            {errors.password && !passwordFocused && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-600"
              >
                {errors.password.message}
              </motion.p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-purple-900">
              Confirm password
            </label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                className={`h-12 px-4 pr-20 bg-white transition-all ${
                  passwordsMatch ? 'border-green-500' : passwordsDontMatch ? 'border-red-500' : 'border-purple-500'
                } text-purple-900 focus:border-purple-900 focus:ring-2 focus:ring-purple-900/20 ${
                  errors.confirmPassword ? 'border-red-500' : ''
                }`}
                disabled={isPending}
                {...register('confirmPassword')}
              />

              {/* Match Indicator */}
              {confirmPassword && (
                <div className="absolute right-12 top-1/2 -translate-y-1/2">
                  {passwordsMatch ? (
                    <Check className="h-5 w-5 text-green-600" />
                  ) : (
                    <X className="h-5 w-5 text-red-600" />
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors text-purple-500 hover:text-purple-900"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {/* Password Match Status */}
            {confirmPassword && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-sm flex items-center gap-1 ${
                  passwordsMatch ? 'text-green-800' : passwordsDontMatch ? 'text-red-600' : 'text-ghost-700'
                }`}
              >
                {passwordsMatch ? (
                  <>
                    <Check className="h-3 w-3" />
                    Passwords match
                  </>
                ) : passwordsDontMatch ? (
                  <>
                    <X className="h-3 w-3" />
                    Passwords don't match
                  </>
                ) : null}
              </motion.p>
            )}

            {errors.confirmPassword && !confirmPassword && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-600"
              >
                {errors.confirmPassword.message}
              </motion.p>
            )}
          </div>

          {/* Terms and Conditions */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="agreeToTerms"
              checked={agreeToTerms}
              onCheckedChange={(checked) => setValue('agreeToTerms', checked as boolean)}
              className="mt-1 border-purple-500 data-[state=checked]:bg-purple-900 data-[state=checked]:border-purple-900"
            />
            <label
              htmlFor="agreeToTerms"
              className="text-sm cursor-pointer text-ghost-700"
            >
              I agree to the{' '}
              <Link
                href="/terms"
                className="underline underline-offset-2 transition-colors text-purple-500 hover:text-purple-900"
              >
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link
                href="/privacy"
                className="underline underline-offset-2 transition-colors text-purple-500 hover:text-purple-900"
              >
                Privacy Policy
              </Link>
            </label>
          </div>
          {errors.agreeToTerms && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-red-600 ml-7"
            >
              {errors.agreeToTerms.message}
            </motion.p>
          )}

          {/* Submit Button */}
          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Button
              type="submit"
              className="w-full h-12 text-white font-semibold transition-all bg-purple-900 hover:bg-purple-800"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                <span className="flex items-center justify-center">
                  Create account
                  <ArrowRight className="ml-2 h-5 w-5" />
                </span>
              )}
            </Button>
          </motion.div>
        </motion.form>

        {/* Sign In Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-4"
        >
          <p className="text-center text-sm text-ghost-700">
            Already have an account?{' '}
            <Link
              href="/auth/sign-in"
              className="font-medium transition-colors text-purple-900 hover:text-purple-800"
            >
              Sign in instead
            </Link>
          </p>
          <p className="text-center text-xs text-purple-500">
            By creating an account, you agree to our{' '}
            <Link
              href="/terms"
              className="underline underline-offset-2 transition-colors text-purple-500 hover:text-purple-900"
            >
              Terms
            </Link>
            ,{' '}
            <Link
              href="/privacy"
              className="underline underline-offset-2 transition-colors text-purple-500 hover:text-purple-900"
            >
              Privacy Policy
            </Link>
            , and{' '}
            <Link
              href="/cookies"
              className="underline underline-offset-2 transition-colors text-purple-500 hover:text-purple-900"
            >
              Cookie Policy
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}