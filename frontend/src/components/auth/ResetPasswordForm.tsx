'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, AlertCircle, ArrowRight, CheckCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

// Validation schema
const resetPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address')
})

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

export function ResetPasswordForm() {
  const router = useRouter()
  const { resetPassword } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema)
  })

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const { error: resetError } = await resetPassword(data.email)
      
      if (resetError) {
        if (resetError.message.includes('User not found')) {
          setError('No account found with this email address.')
        } else if (resetError.message.includes('Email rate limit exceeded')) {
          setError('Too many reset attempts. Please try again later.')
        } else {
          setError(resetError.message || 'An error occurred sending the reset email')
        }
        return
      }

      // Successful reset email sent
      setSuccess(true)
    } catch (err) {
      console.error('Password reset error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-md" animated={false}>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
            <h2 className="text-2xl font-bold text-center">Check your email</h2>
            <p className="text-center text-muted-foreground">
              We've sent a password reset link to your email address. 
              Please check your inbox and follow the instructions to reset your password.
            </p>
            <div className="text-sm text-muted-foreground">
              <p className="text-center">
                Didn't receive the email? Check your spam folder or{' '}
                <button 
                  onClick={() => setSuccess(false)}
                  className="text-gray-900 hover:text-gray-700 hover:underline cursor-pointer transition-colors"
                >
                  try again
                </button>
              </p>
            </div>
            <Link href="/auth/sign-in" className="w-full">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign in
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md" animated={false}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Reset password</CardTitle>
        <CardDescription>
          Enter your email address and we'll send you a link to reset your password
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                className="pl-10"
                disabled={isLoading}
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button 
            type="submit" 
            className="w-full" 
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

        </CardFooter>
      </form>
      
      <CardFooter className="pt-0 pb-6">
        <div className="text-center text-sm text-gray-600 w-full">
          Remember your password?{' '}
          <Link 
            href="/auth/sign-in" 
            className="font-medium text-gray-900 hover:text-gray-700 hover:underline transition-colors inline-block"
          >
            Sign in
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}