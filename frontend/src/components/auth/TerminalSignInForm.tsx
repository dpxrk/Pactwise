'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Terminal } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, useTransition, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type SignInFormData = z.infer<typeof signInSchema>;

interface TerminalSignInFormProps {
  isDark?: boolean;
}

export function TerminalSignInForm({ isDark = true }: TerminalSignInFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [terminalReady, setTerminalReady] = useState(false);

  const redirect = searchParams.get('redirect') || '/dashboard';
  const sessionExpired = searchParams.get('session_expired') === 'true';

  // Terminal boot animation
  useEffect(() => {
    const timer = setTimeout(() => setTerminalReady(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const { register, handleSubmit, formState: { errors } } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    mode: 'onBlur',
  });

  const handleAuthAction = useCallback(async (action: () => Promise<{ error?: { message?: string } | null; user?: unknown }>) => {
    startTransition(async () => {
      setError(null);
      try {
        const result = await action();
        if (result.error) {
          const errorMessage = result.error?.message || 'An unexpected error occurred.';
          setError(errorMessage);
        } else if (result.user || !result.error) {
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
          pactwise-auth — sign-in
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
                ./authenticate --mode secure
              </span>
            </div>
            <div className={`font-mono text-xs pl-4 ${isDark ? "text-text-tertiary" : "text-ghost-500"}`}>
              Initializing secure connection...
            </div>
            <div className="font-mono text-xs pl-4 text-success">
              ✓ Connection established
            </div>
          </div>

          {/* Form Title */}
          <div className="mb-6">
            <h1 className={`text-xl font-semibold tracking-tight font-mono transition-colors duration-300 ${
              isDark ? "text-text-primary" : "text-purple-900"
            }`}>
              Welcome back
            </h1>
            <p className={`text-sm mt-1 font-mono transition-colors duration-300 ${
              isDark ? "text-text-secondary" : "text-ghost-600"
            }`}>
              Enter credentials to access your dashboard
            </p>
          </div>

          {/* Error/Session messages */}
          {sessionExpired && (
            <div className={`mb-4 p-3 border font-mono text-xs transition-colors duration-300 ${
              isDark
                ? "border-warning-400/30 bg-warning-400/10 text-warning-300"
                : "border-amber-200 bg-amber-50 text-amber-700"
            }`}>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-3 h-3" />
                <span>Session expired. Please sign in again.</span>
              </div>
            </div>
          )}

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
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className={`block font-mono text-xs tracking-wider transition-colors duration-300 ${
                isDark ? "text-text-tertiary" : "text-ghost-500"
              }`}>
                EMAIL_ADDRESS
              </label>
              <div className="relative">
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
              </div>
              {errors.email && (
                <p className="font-mono text-xs text-error-400">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className={`block font-mono text-xs tracking-wider transition-colors duration-300 ${
                  isDark ? "text-text-tertiary" : "text-ghost-500"
                }`}>
                  PASSWORD
                </label>
                <Link
                  href="/auth/reset-password"
                  className="font-mono text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
                >
                  FORGOT?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`h-11 px-4 pr-11 font-mono text-sm transition-all ${
                    isDark
                      ? "bg-terminal-surface border-terminal-border text-text-primary placeholder:text-text-muted focus:border-purple-500 focus:ring-purple-500/20"
                      : "bg-white border-ghost-300 text-purple-900 placeholder:text-ghost-400 focus:border-purple-500 focus:ring-purple-500/20"
                  } ${errors.password ? "border-error-400" : ""}`}
                  disabled={isPending}
                  {...register('password')}
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
              {errors.password && (
                <p className="font-mono text-xs text-error-400">{errors.password.message}</p>
              )}
            </div>

            {/* Stay logged in */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="stay-logged-in"
                checked={stayLoggedIn}
                onCheckedChange={(checked) => setStayLoggedIn(checked as boolean)}
                className={`border transition-colors ${
                  isDark
                    ? "border-terminal-border data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                    : "border-ghost-300 data-[state=checked]:bg-purple-900 data-[state=checked]:border-purple-900"
                }`}
              />
              <label
                htmlFor="stay-logged-in"
                className={`font-mono text-xs cursor-pointer select-none transition-colors ${
                  isDark ? "text-text-secondary" : "text-ghost-600"
                }`}
              >
                Keep session active (30 days)
              </label>
            </div>

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
                  <span>Authenticating...</span>
                </>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>Sign In</span>
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
              New to Pactwise?{' '}
              <Link href="/auth/sign-up" className="text-purple-400 hover:text-purple-300 transition-colors">
                Create an account
              </Link>
            </p>
            <p className={`text-center font-mono text-[10px] mt-3 transition-colors duration-300 ${
              isDark ? "text-text-muted" : "text-ghost-400"
            }`}>
              By signing in, you agree to our{' '}
              <Link href="/terms" className="text-purple-400/80 hover:text-purple-400">Terms</Link>,{' '}
              <Link href="/privacy" className="text-purple-400/80 hover:text-purple-400">Privacy</Link>, &{' '}
              <Link href="/cookies" className="text-purple-400/80 hover:text-purple-400">Cookies</Link>
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
