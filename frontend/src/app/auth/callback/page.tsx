'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the code from the URL
        const code = new URLSearchParams(window.location.search).get('code')
        
        if (code) {
          // Exchange the code for a session
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          
          if (error) {
            console.error('Error exchanging code for session:', error)
            router.push('/auth/sign-in?error=oauth_error')
            return
          }
        }

        // Get the current session
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          // Check if user exists in our database
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('id', session.user.id)
            .single()

          if (!existingUser) {
            // Create user profile if it doesn't exist
            const { error: profileError } = await supabase
              .from('users')
              .insert({
                id: session.user.id,
                email: session.user.email,
                full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
                avatar_url: session.user.user_metadata?.avatar_url,
                role: 'user',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })

            if (profileError && profileError.code !== '23505') { // Ignore duplicate key errors
              console.error('Error creating user profile:', profileError)
            }
          }

          // Redirect to dashboard or intended destination
          const redirectTo = localStorage.getItem('redirectAfterLogin') || '/dashboard'
          localStorage.removeItem('redirectAfterLogin')
          router.push(redirectTo)
        } else {
          // No session, redirect to sign in
          router.push('/auth/sign-in')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        router.push('/auth/sign-in?error=callback_error')
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <h2 className="text-lg font-semibold">Completing sign in...</h2>
        <p className="text-sm text-muted-foreground">Please wait while we redirect you.</p>
      </div>
    </div>
  )
}