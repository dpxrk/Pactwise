'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowRight, Eye, EyeOff, CheckCircle, Loader2, Check, X, Terminal } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

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

interface TerminalSignUpFormProps {
  isDark?: boolean;
}

// Password validation component
function PasswordRequirement({ met, label, isDark }: { met: boolean; label: string; isDark: boolean }) {
  return (
    <div className="flex items-center gap-2 font-mono text-[11px]">
      {met ? (
        <Check className="h-3 w-3 text-success" />
      ) : (
        <X className={`h-3 w-3 ${isDark ? "text-text-muted" : "text-ghost-400"}`} />
      )}
      <span className={met ? 'text-success' : isDark ? 'text-text-tertiary' : 'text-ghost-500'}>
        {label}
      </span>
    </div>
  );
}

export function TerminalSignUpForm({ isDark = true }: TerminalSignUpFormProps) {
  const router = useRouter();
  const { signUp } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [terminalReady, setTerminalReady] = useState(false);

  // Terminal boot animation
  useEffect(() => {
    const timer = setTimeout(() => setTerminalReady(true), 500);
    return () => clearTimeout(timer);
  }, []);

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

  const handleAuthAction = useCallback(async (action: () => Promise<{ error?: { message?: string } | null; user?: unknown }>) => {
    startTransition(async () => {
      setError(null);
      try {
        const result = await action();
        if (result?.error) {
          const errorMessage = result.error?.message || 'An unexpected error occurred.';
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
      <div className={`w-full max-w-md mx-auto transition-colors duration-300 ${
        isDark ? "terminal-panel" : "bg-white border border-ghost-300"
      }`}>
        {/* Terminal Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b transition-colors duration-300 ${
          isDark
            ? "bg-terminal-surface border-terminal-border"
            : "bg-ghost-100 border-ghost-200"
        }`}>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-error-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-warning-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-success-400" />
          </div>
          <span className={`font-mono text-[10px] tracking-wider transition-colors duration-300 ${
            isDark ? "text-text-tertiary" : "text-ghost-500"
          }`}>
            pactwise-auth — complete
          </span>
          <Terminal className={`w-3 h-3 ${isDark ? "text-text-tertiary" : "text-ghost-400"}`} />
        </div>

        {/* Success Content */}
        <div className={`p-8 text-center transition-colors duration-300 ${
          isDark ? "bg-terminal-bg" : "bg-ghost-50"
        }`}>
          <div className={`w-16 h-16 mx-auto mb-6 flex items-center justify-center border ${
            isDark ? "border-success/30 bg-success/10" : "border-green-200 bg-green-50"
          }`}>
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
          <div className="space-y-2 mb-6">
            <div className="flex items-center justify-center gap-2">
              <span className="text-purple-400 font-mono text-xs">$</span>
              <span className={`font-mono text-xs ${isDark ? "text-text-secondary" : "text-ghost-600"}`}>
                create-account --status
              </span>
            </div>
            <div className="font-mono text-xs text-success">
              ✓ Account created successfully
            </div>
            <div className="font-mono text-xs text-success">
              ✓ Initializing dashboard...
            </div>
          </div>
          <h2 className={`text-xl font-semibold font-mono mb-2 ${isDark ? "text-text-primary" : "text-purple-900"}`}>
            Welcome to Pactwise!
          </h2>
          <p className={`font-mono text-sm mb-4 ${isDark ? "text-text-secondary" : "text-ghost-600"}`}>
            Redirecting to your dashboard...
          </p>
          <Loader2 className="h-5 w-5 animate-spin text-purple-500 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-md mx-auto transition-colors duration-300 ${
      isDark ? "terminal-panel" : "bg-white border border-ghost-300"
    }`}>
      {/* Terminal Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b transition-colors duration-300 ${
        isDark
          ? "bg-terminal-surface border-terminal-border"
          : "bg-ghost-100 border-ghost-200"
      }`}>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-error-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-warning-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-success-400" />
        </div>
        <span className={`font-mono text-[10px] tracking-wider transition-colors duration-300 ${
          isDark ? "text-text-tertiary" : "text-ghost-500"
        }`}>
          pactwise-auth — sign-up
        </span>
        <Terminal className={`w-3 h-3 ${isDark ? "text-text-tertiary" : "text-ghost-400"}`} />
      </div>

      {/* Terminal Body */}
      <div className={`p-6 transition-colors duration-300 ${
        isDark ? "bg-terminal-bg" : "bg-ghost-50"
      }`}>
        {/* Boot sequence animation */}
        <div className={`transition-opacity duration-500 ${terminalReady ? "opacity-100" : "opacity-0"}`}>
          {/* Terminal welcome message */}
          <div className="mb-6 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-purple-400 font-mono text-xs">$</span>
              <span className={`font-mono text-xs ${isDark ? "text-text-secondary" : "text-ghost-600"}`}>
                ./create-account --trial 14d
              </span>
            </div>
            <div className={`font-mono text-xs pl-4 ${isDark ? "text-text-tertiary" : "text-ghost-500"}`}>
              Initializing secure registration...
            </div>
            <div className="font-mono text-xs pl-4 text-success">
              ✓ 14-day trial activated
            </div>
          </div>

          {/* Form Title */}
          <div className="mb-6">
            <h1 className={`text-xl font-semibold tracking-tight font-mono transition-colors duration-300 ${
              isDark ? "text-text-primary" : "text-purple-900"
            }`}>
              Create your account
            </h1>
            <p className={`text-sm mt-1 font-mono transition-colors duration-300 ${
              isDark ? "text-text-secondary" : "text-ghost-600"
            }`}>
              Start your free trial today
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className={`mb-4 p-3 border font-mono text-xs transition-colors duration-300 ${
              isDark
                ? "border-error-400/30 bg-error-400/10 text-error-300"
                : "border-red-200 bg-red-50 text-red-600"
            }`}>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-3 h-3" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Full Name Field */}
            <div className="space-y-2">
              <label htmlFor="fullName" className={`block font-mono text-xs tracking-wider transition-colors duration-300 ${
                isDark ? "text-text-tertiary" : "text-ghost-500"
              }`}>
                FULL_NAME
              </label>
              <Input
                id="fullName"
                type="text"
                autoComplete="name"
                placeholder="John Doe"
                className={`h-11 px-4 font-mono text-sm transition-all ${
                  isDark
                    ? "bg-terminal-surface border-terminal-border text-text-primary placeholder:text-text-muted focus:border-purple-500 focus:ring-purple-500/20"
                    : "bg-white border-ghost-300 text-purple-900 placeholder:text-ghost-400 focus:border-purple-500 focus:ring-purple-500/20"
                } ${errors.fullName ? "border-error-400" : ""}`}
                disabled={isPending}
                {...register('fullName')}
              />
              {errors.fullName && (
                <p className="font-mono text-xs text-error-400">{errors.fullName.message}</p>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className={`block font-mono text-xs tracking-wider transition-colors duration-300 ${
                isDark ? "text-text-tertiary" : "text-ghost-500"
              }`}>
                EMAIL_ADDRESS
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className={`h-11 px-4 font-mono text-sm transition-all ${
                  isDark
                    ? "bg-terminal-surface border-terminal-border text-text-primary placeholder:text-text-muted focus:border-purple-500 focus:ring-purple-500/20"
                    : "bg-white border-ghost-300 text-purple-900 placeholder:text-ghost-400 focus:border-purple-500 focus:ring-purple-500/20"
                } ${errors.email ? "border-error-400" : ""}`}
                disabled={isPending}
                {...register('email')}
              />
              {errors.email && (
                <p className="font-mono text-xs text-error-400">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className={`block font-mono text-xs tracking-wider transition-colors duration-300 ${
                isDark ? "text-text-tertiary" : "text-ghost-500"
              }`}>
                PASSWORD
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Create a strong password"
                  className={`h-11 px-4 pr-11 font-mono text-sm transition-all ${
                    isDark
                      ? "bg-terminal-surface border-terminal-border text-text-primary placeholder:text-text-muted focus:border-purple-500 focus:ring-purple-500/20"
                      : "bg-white border-ghost-300 text-purple-900 placeholder:text-ghost-400 focus:border-purple-500 focus:ring-purple-500/20"
                  } ${errors.password ? "border-error-400" : ""}`}
                  disabled={isPending}
                  onFocus={() => setPasswordFocused(true)}
                  {...register('password', { onBlur: () => setPasswordFocused(false) })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
                    isDark ? "text-text-tertiary hover:text-text-primary" : "text-ghost-400 hover:text-purple-900"
                  }`}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password Requirements */}
              {(passwordFocused || password) && (
                <div className={`space-y-1 pt-2 px-3 pb-2 border transition-colors ${
                  isDark ? "border-terminal-border bg-terminal-surface" : "border-ghost-200 bg-ghost-100"
                }`}>
                  {passwordValidation.map((req) => (
                    <PasswordRequirement
                      key={req.id}
                      met={req.met}
                      label={req.label}
                      isDark={isDark}
                    />
                  ))}
                </div>
              )}

              {errors.password && !passwordFocused && (
                <p className="font-mono text-xs text-error-400">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className={`block font-mono text-xs tracking-wider transition-colors duration-300 ${
                isDark ? "text-text-tertiary" : "text-ghost-500"
              }`}>
                CONFIRM_PASSWORD
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  className={`h-11 px-4 pr-20 font-mono text-sm transition-all ${
                    passwordsMatch ? "border-success" : passwordsDontMatch ? "border-error-400" : ""
                  } ${
                    isDark
                      ? "bg-terminal-surface border-terminal-border text-text-primary placeholder:text-text-muted focus:border-purple-500 focus:ring-purple-500/20"
                      : "bg-white border-ghost-300 text-purple-900 placeholder:text-ghost-400 focus:border-purple-500 focus:ring-purple-500/20"
                  } ${errors.confirmPassword ? "border-error-400" : ""}`}
                  disabled={isPending}
                  {...register('confirmPassword')}
                />

                {/* Match Indicator */}
                {confirmPassword && (
                  <div className="absolute right-12 top-1/2 -translate-y-1/2">
                    {passwordsMatch ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <X className="h-4 w-4 text-error-400" />
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
                    isDark ? "text-text-tertiary hover:text-text-primary" : "text-ghost-400 hover:text-purple-900"
                  }`}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password Match Status */}
              {confirmPassword && (
                <p className={`font-mono text-xs flex items-center gap-1 ${
                  passwordsMatch ? 'text-success' : passwordsDontMatch ? 'text-error-400' : ''
                }`}>
                  {passwordsMatch ? (
                    <>
                      <Check className="h-3 w-3" />
                      Passwords match
                    </>
                  ) : passwordsDontMatch ? (
                    <>
                      <X className="h-3 w-3" />
                      Passwords don&apos;t match
                    </>
                  ) : null}
                </p>
              )}

              {errors.confirmPassword && !confirmPassword && (
                <p className="font-mono text-xs text-error-400">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-start space-x-3">
              <Checkbox
                id="agreeToTerms"
                checked={agreeToTerms}
                onCheckedChange={(checked) => setValue('agreeToTerms', checked as boolean)}
                className={`mt-0.5 border transition-colors ${
                  isDark
                    ? "border-terminal-border data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                    : "border-ghost-300 data-[state=checked]:bg-purple-900 data-[state=checked]:border-purple-900"
                }`}
              />
              <label
                htmlFor="agreeToTerms"
                className={`font-mono text-xs cursor-pointer transition-colors ${
                  isDark ? "text-text-secondary" : "text-ghost-600"
                }`}
              >
                I agree to the{' '}
                <Link href="/terms" className="text-purple-400 hover:text-purple-300">Terms</Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-purple-400 hover:text-purple-300">Privacy Policy</Link>
              </label>
            </div>
            {errors.agreeToTerms && (
              <p className="font-mono text-xs text-error-400 ml-6">{errors.agreeToTerms.message}</p>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className={`w-full h-11 font-mono text-sm transition-all ${
                isDark
                  ? "bg-purple-600 hover:bg-purple-500 text-white"
                  : "bg-purple-900 hover:bg-purple-800 text-white"
              }`}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>Create Account</span>
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t transition-colors duration-300 border-terminal-border">
            <p className={`text-center font-mono text-xs transition-colors duration-300 ${
              isDark ? "text-text-secondary" : "text-ghost-600"
            }`}>
              Already have an account?{' '}
              <Link href="/auth/sign-in" className="text-purple-400 hover:text-purple-300 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Terminal Footer */}
      <div className={`px-4 py-2 border-t font-mono text-[10px] flex items-center justify-between transition-colors duration-300 ${
        isDark
          ? "bg-terminal-surface border-terminal-border text-text-muted"
          : "bg-ghost-100 border-ghost-200 text-ghost-400"
      }`}>
        <span>SECURE CONNECTION • TLS 1.3</span>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
          <span className="text-success">READY</span>
        </div>
      </div>
    </div>
  );
}
