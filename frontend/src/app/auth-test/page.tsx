'use client'

import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AuthTestPage() {
  const { 
    user, 
    userProfile, 
    session, 
    isLoading, 
    isAuthenticated,
    signIn,
    signOut 
  } = useAuth()

  const handleTestLogin = async () => {
    const { error } = await signIn('test@example.com', 'password123')
    if (error) {
      console.error('Login error:', error)
    }
  }

  const handleLogout = async () => {
    const { error } = await signOut()
    if (error) {
      console.error('Logout error:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Auth System Test Page</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
            <CardDescription>Current auth state information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="font-semibold">Authenticated:</span>{' '}
              <span className={isAuthenticated ? 'text-green-600' : 'text-red-600'}>
                {isAuthenticated ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="font-semibold">Session:</span>{' '}
              {session ? 'Active' : 'None'}
            </div>
            <div>
              <span className="font-semibold">Loading:</span>{' '}
              {isLoading ? 'Yes' : 'No'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>Current user details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {user ? (
              <>
                <div>
                  <span className="font-semibold">Email:</span> {user.email}
                </div>
                <div>
                  <span className="font-semibold">ID:</span> {user.id}
                </div>
                <div>
                  <span className="font-semibold">Role:</span>{' '}
                  {userProfile?.role || 'Not set'}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">No user logged in</p>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Test authentication functions</CardDescription>
          </CardHeader>
          <CardContent className="space-x-4">
            {!isAuthenticated ? (
              <Button onClick={handleTestLogin}>
                Test Login
              </Button>
            ) : (
              <Button onClick={handleLogout} variant="destructive">
                Logout
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Raw Session Data</CardTitle>
            <CardDescription>For debugging purposes</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
              {JSON.stringify({ user, userProfile, session }, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}