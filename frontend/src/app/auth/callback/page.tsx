'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { supabase } from '@/lib/supabase'


export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search)
        const code = searchParams.get('code')
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')
        
        // Check for OAuth errors
        if (error) {
          console.error('OAuth error:', error, errorDescription)
          const errorMessage = errorDescription || error
          router.push(`/auth/sign-in?error=${encodeURIComponent(errorMessage)}`)
          return
        }
        
        if (code) {
          // Exchange the code for a session
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          
          if (exchangeError) {
            console.error('Error exchanging code for session:', exchangeError)
            router.push('/auth/sign-in?error=oauth_error')
            return
          }
        } else {
          // No code provided
          console.error('No authorization code provided')
          router.push('/auth/sign-in?error=no_code')
          return
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

            if (profileError) {
              // Only log non-duplicate errors
              if (profileError.code !== '23505') {
                console.error('Error creating user profile:', profileError)
              }
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
    <div className="min-h-screen flex items-center justify-center bg-ghost-100">
      <div className="bg-white border border-ghost-300 p-12 max-w-md w-full">
        <div className="text-center space-y-6">
          <div className="inline-block animate-spin h-12 w-12 border-2 border-purple-900 border-t-transparent"></div>
          <div>
            <h2 className="font-mono text-xs uppercase tracking-wider text-ghost-700 mb-2">
              AUTHENTICATION
            </h2>
            <p className="text-lg font-semibold text-purple-900">Completing sign in...</p>
            <p className="text-sm text-ghost-700 mt-2">Setting up your session, please wait.</p>
          </div>
        </div>
      </div>
    </div>
  )
}