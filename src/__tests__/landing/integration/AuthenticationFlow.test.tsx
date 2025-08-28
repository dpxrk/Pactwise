import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import React from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Mock Supabase
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn(),
}));

// Mock Next.js router
const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock fetch
global.fetch = jest.fn();

describe('Authentication Flow Tests', () => {
  let mockSupabase: any;

  beforeEach(() => {
    // Reset mocks
    mockPush.mockClear();
    mockRefresh.mockClear();
    (global.fetch as jest.Mock).mockClear();

    // Setup Supabase mock
    mockSupabase = {
      auth: {
        signUp: jest.fn(),
        signInWithPassword: jest.fn(),
        signOut: jest.fn(),
        resetPasswordForEmail: jest.fn(),
        updateUser: jest.fn(),
        getSession: jest.fn(),
        onAuthStateChange: jest.fn(),
        signInWithOAuth: jest.fn(),
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn(),
        update: jest.fn(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
      })),
    };

    (createClientComponentClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('Sign Up Flow', () => {
    const SignUpForm = () => {
      const [email, setEmail] = React.useState('');
      const [password, setPassword] = React.useState('');
      const [confirmPassword, setConfirmPassword] = React.useState('');
      const [fullName, setFullName] = React.useState('');
      const [company, setCompany] = React.useState('');
      const [error, setError] = React.useState('');
      const [isLoading, setIsLoading] = React.useState(false);

      const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        // Validation
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setIsLoading(false);
          return;
        }

        if (password.length < 8) {
          setError('Password must be at least 8 characters');
          setIsLoading(false);
          return;
        }

        try {
          const supabase = createClientComponentClient();
          
          // Sign up
          const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName,
                company,
              },
            },
          });

          if (signUpError) throw signUpError;

          // Create user profile
          if (data.user) {
            await fetch('/api/auth/create-profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: data.user.id,
                fullName,
                company,
                email,
              }),
            });
          }

          mockPush('/onboarding');
        } catch (err: any) {
          setError(err.message || 'Failed to sign up');
        } finally {
          setIsLoading(false);
        }
      };

      return (
        <form onSubmit={handleSignUp} data-testid="signup-form">
          <input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            aria-label="Full Name"
          />
          <input
            type="text"
            placeholder="Company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
            aria-label="Company"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-label="Email"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-label="Password"
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            aria-label="Confirm Password"
          />
          {error && <div role="alert">{error}</div>}
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>
      );
    };

    it('should successfully sign up a new user', async () => {
      const user = userEvent.setup();
      
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
          session: { access_token: 'token-123' },
        },
        error: null,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<SignUpForm />);

      // Fill form
      await user.type(screen.getByLabelText('Full Name'), 'John Doe');
      await user.type(screen.getByLabelText('Company'), 'ACME Corp');
      await user.type(screen.getByLabelText('Email'), 'john@example.com');
      await user.type(screen.getByLabelText('Password'), 'SecurePass123!');
      await user.type(screen.getByLabelText('Confirm Password'), 'SecurePass123!');

      // Submit
      await user.click(screen.getByRole('button', { name: /sign up/i }));

      await waitFor(() => {
        expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
          email: 'john@example.com',
          password: 'SecurePass123!',
          options: {
            data: {
              full_name: 'John Doe',
              company: 'ACME Corp',
            },
          },
        });
        expect(mockPush).toHaveBeenCalledWith('/onboarding');
      });
    });

    it('should validate password match', async () => {
      const user = userEvent.setup();
      render(<SignUpForm />);

      await user.type(screen.getByLabelText('Password'), 'Password123!');
      await user.type(screen.getByLabelText('Confirm Password'), 'DifferentPass123!');
      await user.click(screen.getByRole('button', { name: /sign up/i }));

      expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match');
      expect(mockSupabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('should validate password length', async () => {
      const user = userEvent.setup();
      render(<SignUpForm />);

      await user.type(screen.getByLabelText('Password'), 'short');
      await user.type(screen.getByLabelText('Confirm Password'), 'short');
      await user.click(screen.getByRole('button', { name: /sign up/i }));

      expect(screen.getByRole('alert')).toHaveTextContent('Password must be at least 8 characters');
    });

    it('should handle email already exists error', async () => {
      const user = userEvent.setup();
      
      mockSupabase.auth.signUp.mockResolvedValue({
        data: null,
        error: { message: 'User already registered' },
      });

      render(<SignUpForm />);

      await user.type(screen.getByLabelText('Full Name'), 'John Doe');
      await user.type(screen.getByLabelText('Company'), 'ACME Corp');
      await user.type(screen.getByLabelText('Email'), 'existing@example.com');
      await user.type(screen.getByLabelText('Password'), 'SecurePass123!');
      await user.type(screen.getByLabelText('Confirm Password'), 'SecurePass123!');

      await user.click(screen.getByRole('button', { name: /sign up/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('User already registered');
      });
    });
  });

  describe('Sign In Flow', () => {
    const SignInForm = () => {
      const [email, setEmail] = React.useState('');
      const [password, setPassword] = React.useState('');
      const [error, setError] = React.useState('');
      const [isLoading, setIsLoading] = React.useState(false);

      const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
          const supabase = createClientComponentClient();
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) throw error;

          if (data.session) {
            mockPush('/dashboard');
          }
        } catch (err: any) {
          setError(err.message || 'Invalid credentials');
        } finally {
          setIsLoading(false);
        }
      };

      return (
        <form onSubmit={handleSignIn} data-testid="signin-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-label="Email"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-label="Password"
          />
          {error && <div role="alert">{error}</div>}
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
          <button type="button" onClick={() => mockPush('/auth/reset-password')}>
            Forgot Password?
          </button>
        </form>
      );
    };

    it('should successfully sign in with valid credentials', async () => {
      const user = userEvent.setup();
      
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
          session: { access_token: 'token-123' },
        },
        error: null,
      });

      render(<SignInForm />);

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'Password123!');
      await user.click(screen.getByRole('button', { name: /sign in$/i }));

      await waitFor(() => {
        expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'Password123!',
        });
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should handle invalid credentials error', async () => {
      const user = userEvent.setup();
      
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      render(<SignInForm />);

      await user.type(screen.getByLabelText('Email'), 'wrong@example.com');
      await user.type(screen.getByLabelText('Password'), 'WrongPass123!');
      await user.click(screen.getByRole('button', { name: /sign in$/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Invalid login credentials');
      });
    });

    it('should navigate to forgot password', async () => {
      const user = userEvent.setup();
      render(<SignInForm />);

      await user.click(screen.getByText('Forgot Password?'));
      expect(mockPush).toHaveBeenCalledWith('/auth/reset-password');
    });
  });

  describe('Password Reset Flow', () => {
    const ResetPasswordForm = () => {
      const [email, setEmail] = React.useState('');
      const [isLoading, setIsLoading] = React.useState(false);
      const [success, setSuccess] = React.useState(false);
      const [error, setError] = React.useState('');

      const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
          const supabase = createClientComponentClient();
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/reset-password/confirm`,
          });

          if (error) throw error;

          setSuccess(true);
        } catch (err: any) {
          setError(err.message || 'Failed to send reset email');
        } finally {
          setIsLoading(false);
        }
      };

      return (
        <div>
          {success ? (
            <div role="status">
              Check your email for a password reset link.
            </div>
          ) : (
            <form onSubmit={handleReset}>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-label="Email"
              />
              {error && <div role="alert">{error}</div>}
              <button type="submit" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send Reset Email'}
              </button>
            </form>
          )}
        </div>
      );
    };

    it('should successfully send password reset email', async () => {
      const user = userEvent.setup();
      
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      render(<ResetPasswordForm />);

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset email/i }));

      await waitFor(() => {
        expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
          'test@example.com',
          expect.objectContaining({
            redirectTo: expect.stringContaining('/auth/reset-password/confirm'),
          })
        );
        expect(screen.getByRole('status')).toHaveTextContent(
          'Check your email for a password reset link.'
        );
      });
    });

    it('should handle email not found error', async () => {
      const user = userEvent.setup();
      
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: null,
        error: { message: 'User not found' },
      });

      render(<ResetPasswordForm />);

      await user.type(screen.getByLabelText('Email'), 'nonexistent@example.com');
      await user.click(screen.getByRole('button', { name: /send reset email/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('User not found');
      });
    });
  });

  describe('OAuth Sign In', () => {
    const OAuthButtons = () => {
      const [error, setError] = React.useState('');
      const [isLoading, setIsLoading] = React.useState<string | null>(null);

      const handleOAuthSignIn = async (provider: 'google' | 'github') => {
        setIsLoading(provider);
        setError('');

        try {
          const supabase = createClientComponentClient();
          const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
              redirectTo: `${window.location.origin}/auth/callback`,
            },
          });

          if (error) throw error;
        } catch (err: any) {
          setError(err.message || `Failed to sign in with ${provider}`);
          setIsLoading(null);
        }
      };

      return (
        <div>
          <button
            onClick={() => handleOAuthSignIn('google')}
            disabled={isLoading === 'google'}
            aria-label="Sign in with Google"
          >
            {isLoading === 'google' ? 'Redirecting...' : 'Sign in with Google'}
          </button>
          <button
            onClick={() => handleOAuthSignIn('github')}
            disabled={isLoading === 'github'}
            aria-label="Sign in with GitHub"
          >
            {isLoading === 'github' ? 'Redirecting...' : 'Sign in with GitHub'}
          </button>
          {error && <div role="alert">{error}</div>}
        </div>
      );
    };

    it('should initiate Google OAuth sign in', async () => {
      const user = userEvent.setup();
      
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({
        data: { provider: 'google', url: 'https://google.com/oauth' },
        error: null,
      });

      render(<OAuthButtons />);

      await user.click(screen.getByLabelText('Sign in with Google'));

      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: expect.stringContaining('/auth/callback'),
        },
      });
    });

    it('should initiate GitHub OAuth sign in', async () => {
      const user = userEvent.setup();
      
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({
        data: { provider: 'github', url: 'https://github.com/oauth' },
        error: null,
      });

      render(<OAuthButtons />);

      await user.click(screen.getByLabelText('Sign in with GitHub'));

      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'github',
        options: {
          redirectTo: expect.stringContaining('/auth/callback'),
        },
      });
    });
  });

  describe('Session Management', () => {
    const SessionManager = () => {
      const [user, setUser] = React.useState<any>(null);
      const [loading, setLoading] = React.useState(true);

      React.useEffect(() => {
        const supabase = createClientComponentClient();
        
        // Check initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
          setUser(session?.user || null);
          setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            setUser(session?.user || null);
            if (event === 'SIGNED_OUT') {
              mockPush('/');
            }
          }
        );

        return () => subscription.unsubscribe();
      }, []);

      const handleSignOut = async () => {
        const supabase = createClientComponentClient();
        await supabase.auth.signOut();
      };

      if (loading) return <div>Loading...</div>;

      return (
        <div>
          {user ? (
            <>
              <div>Welcome, {user.email}</div>
              <button onClick={handleSignOut}>Sign Out</button>
            </>
          ) : (
            <div>Not authenticated</div>
          )}
        </div>
      );
    };

    it('should display user when session exists', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: { email: 'test@example.com', id: 'user-123' },
          },
        },
      });

      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: {
          subscription: { unsubscribe: jest.fn() },
        },
      });

      render(<SessionManager />);

      await waitFor(() => {
        expect(screen.getByText('Welcome, test@example.com')).toBeInTheDocument();
      });
    });

    it('should handle sign out', async () => {
      const user = userEvent.setup();
      
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: { email: 'test@example.com', id: 'user-123' },
          },
        },
      });

      const authCallback = jest.fn();
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authCallback.current = callback;
        return {
          data: {
            subscription: { unsubscribe: jest.fn() },
          },
        };
      });

      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      render(<SessionManager />);

      await waitFor(() => {
        expect(screen.getByText('Welcome, test@example.com')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Sign Out'));

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should show not authenticated when no session', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
      });

      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: {
          subscription: { unsubscribe: jest.fn() },
        },
      });

      render(<SessionManager />);

      await waitFor(() => {
        expect(screen.getByText('Not authenticated')).toBeInTheDocument();
      });
    });
  });

  describe('Protected Route', () => {
    const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
      const [user, setUser] = React.useState<any>(null);
      const [loading, setLoading] = React.useState(true);

      React.useEffect(() => {
        const supabase = createClientComponentClient();
        
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) {
            mockPush('/auth/signin');
          } else {
            setUser(session.user);
          }
          setLoading(false);
        });
      }, []);

      if (loading) return <div>Checking authentication...</div>;
      if (!user) return null;

      return <>{children}</>;
    };

    it('should redirect to sign in when not authenticated', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
      });

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/signin');
      });
    });

    it('should render children when authenticated', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: { email: 'test@example.com', id: 'user-123' },
          },
        },
      });

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });
  });
});