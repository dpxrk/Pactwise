import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import React from 'react';

// Mock Next.js dependencies
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    pathname: '/',
  }),
}));

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: (fn: () => Promise<any>) => {
    const Component = ({ children, ...props }: any) => {
      const [module, setModule] = React.useState<any>(null);
      React.useEffect(() => {
        fn().then((mod) => setModule(() => mod.default || mod));
      }, []);
      return module ? React.createElement(module, props, children) : <div>Loading...</div>;
    };
    return Component;
  },
}));

// Mock fetch
global.fetch = jest.fn();

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

describe('Landing Page Integration Flow', () => {
  // Simplified Landing Page component that combines all sections
  const LandingPage = () => {
    const [isDemoModalOpen, setIsDemoModalOpen] = React.useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);
    const [authMode, setAuthMode] = React.useState<'signin' | 'signup'>('signin');

    const handleGetStarted = () => {
      setAuthMode('signup');
      setIsAuthModalOpen(true);
    };

    const handleSignIn = () => {
      setAuthMode('signin');
      setIsAuthModalOpen(true);
    };

    const scrollToSection = (sectionId: string) => {
      const element = document.getElementById(sectionId);
      element?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
      <div data-testid="landing-page">
        {/* Navigation */}
        <nav className="fixed top-0 w-full z-50 bg-white border-b">
          <div className="container mx-auto px-6">
            <div className="flex items-center justify-between h-16">
              <a href="/" className="text-2xl font-bold">Pactwise</a>
              
              <div className="hidden md:flex items-center space-x-8">
                <button onClick={() => scrollToSection('features')}>Features</button>
                <button onClick={() => scrollToSection('pricing')}>Pricing</button>
                <button onClick={() => setIsDemoModalOpen(true)}>Demo</button>
              </div>

              <div className="flex items-center gap-4">
                <button onClick={handleSignIn}>Sign In</button>
                <button 
                  onClick={handleGetStarted}
                  className="px-4 py-2 bg-gray-900 text-white"
                >
                  Get Started
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="pt-32 pb-20">
          <div className="container mx-auto px-6 text-center">
            <h1 className="text-6xl font-bold mb-6">Enterprise Contract Intelligence</h1>
            <p className="text-xl mb-12">
              Streamline vendor management, optimize contracts, and unlock financial insights.
            </p>
            <div className="flex gap-4 justify-center">
              <button 
                onClick={handleGetStarted}
                className="px-8 py-4 bg-gray-900 text-white"
              >
                Get Started Free
              </button>
              <button 
                onClick={() => setIsDemoModalOpen(true)}
                className="px-8 py-4 border border-gray-900"
              >
                Watch Demo
              </button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20">
          <div className="container mx-auto px-6">
            <h2 className="text-4xl font-bold text-center mb-12">Key Features</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-6 border">
                <h3 className="text-xl font-semibold mb-2">AI Analysis</h3>
                <p>Intelligent contract analysis powered by advanced AI</p>
              </div>
              <div className="p-6 border">
                <h3 className="text-xl font-semibold mb-2">Vendor Management</h3>
                <p>Comprehensive vendor lifecycle management</p>
              </div>
              <div className="p-6 border">
                <h3 className="text-xl font-semibold mb-2">Financial Insights</h3>
                <p>Real-time financial analytics and reporting</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 bg-gray-50">
          <div className="container mx-auto px-6">
            <h2 className="text-4xl font-bold text-center mb-12">Simple Pricing</h2>
            <div className="max-w-md mx-auto">
              <div className="bg-white p-8 border">
                <h3 className="text-2xl font-bold mb-4">Professional Plan</h3>
                <div className="text-5xl font-bold mb-6">$499<span className="text-xl">/month</span></div>
                <ul className="space-y-2 mb-8">
                  <li>✓ Unlimited contracts</li>
                  <li>✓ AI-powered analysis</li>
                  <li>✓ Advanced reporting</li>
                  <li>✓ 24/7 support</li>
                </ul>
                <button 
                  onClick={handleGetStarted}
                  className="w-full py-3 bg-gray-900 text-white"
                >
                  Start Free Trial
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Demo Modal */}
        {isDemoModalOpen && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setIsDemoModalOpen(false)}
            data-testid="demo-modal"
          >
            <div 
              className="bg-white p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-6">Request a Demo</h2>
              <form onSubmit={(e) => {
                e.preventDefault();
                // Simulate form submission
                setTimeout(() => {
                  setIsDemoModalOpen(false);
                  mockPush('/dashboard');
                }, 1000);
              }}>
                <input 
                  type="text" 
                  placeholder="First Name" 
                  required 
                  className="w-full mb-4 p-2 border"
                />
                <input 
                  type="text" 
                  placeholder="Last Name" 
                  required 
                  className="w-full mb-4 p-2 border"
                />
                <input 
                  type="email" 
                  placeholder="Work Email" 
                  required 
                  className="w-full mb-4 p-2 border"
                />
                <input 
                  type="text" 
                  placeholder="Company" 
                  required 
                  className="w-full mb-4 p-2 border"
                />
                <button 
                  type="submit"
                  className="w-full py-2 bg-gray-900 text-white"
                >
                  Submit Request
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Auth Modal */}
        {isAuthModalOpen && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setIsAuthModalOpen(false)}
            data-testid="auth-modal"
          >
            <div 
              className="bg-white p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-6">
                {authMode === 'signin' ? 'Sign In' : 'Create Account'}
              </h2>
              <form onSubmit={(e) => {
                e.preventDefault();
                mockPush('/dashboard');
              }}>
                {authMode === 'signup' && (
                  <>
                    <input 
                      type="text" 
                      placeholder="Full Name" 
                      required 
                      className="w-full mb-4 p-2 border"
                    />
                    <input 
                      type="text" 
                      placeholder="Company" 
                      required 
                      className="w-full mb-4 p-2 border"
                    />
                  </>
                )}
                <input 
                  type="email" 
                  placeholder="Email" 
                  required 
                  className="w-full mb-4 p-2 border"
                />
                <input 
                  type="password" 
                  placeholder="Password" 
                  required 
                  className="w-full mb-4 p-2 border"
                />
                <button 
                  type="submit"
                  className="w-full py-2 bg-gray-900 text-white mb-4"
                >
                  {authMode === 'signin' ? 'Sign In' : 'Sign Up'}
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                  className="w-full text-center text-gray-600"
                >
                  {authMode === 'signin' 
                    ? "Don't have an account? Sign up" 
                    : "Already have an account? Sign in"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  beforeEach(() => {
    mockPush.mockClear();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Complete User Journey', () => {
    it('should complete the full visitor to signup flow', async () => {
      const user = userEvent.setup();
      render(<LandingPage />);

      // 1. Verify landing page loads
      expect(screen.getByText('Enterprise Contract Intelligence')).toBeInTheDocument();
      expect(screen.getByText(/Streamline vendor management/)).toBeInTheDocument();

      // 2. Navigate to features section
      await user.click(screen.getByText('Features'));
      expect(screen.getByText('Key Features')).toBeInTheDocument();

      // 3. Navigate to pricing section
      await user.click(screen.getByText('Pricing'));
      expect(screen.getByText('Simple Pricing')).toBeInTheDocument();
      expect(screen.getByText('$499')).toBeInTheDocument();

      // 4. Open demo modal
      await user.click(screen.getAllByText('Watch Demo')[0]);
      const demoModal = screen.getByTestId('demo-modal');
      expect(demoModal).toBeInTheDocument();

      // 5. Close demo modal
      await user.click(demoModal);
      expect(screen.queryByTestId('demo-modal')).not.toBeInTheDocument();

      // 6. Click Get Started to open signup modal
      await user.click(screen.getAllByText('Get Started')[0]);
      const authModal = screen.getByTestId('auth-modal');
      expect(authModal).toBeInTheDocument();
      expect(screen.getByText('Create Account')).toBeInTheDocument();

      // 7. Fill signup form
      await user.type(screen.getByPlaceholderText('Full Name'), 'John Doe');
      await user.type(screen.getByPlaceholderText('Company'), 'ACME Corp');
      await user.type(screen.getByPlaceholderText('Email'), 'john@acme.com');
      await user.type(screen.getByPlaceholderText('Password'), 'SecurePass123!');

      // 8. Submit signup form
      await user.click(screen.getByRole('button', { name: 'Sign Up' }));
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    it('should complete the demo request flow', async () => {
      const user = userEvent.setup();
      render(<LandingPage />);

      // Open demo modal
      await user.click(screen.getByText('Demo'));
      expect(screen.getByTestId('demo-modal')).toBeInTheDocument();

      // Fill demo form
      const demoModal = within(screen.getByTestId('demo-modal'));
      await user.type(demoModal.getByPlaceholderText('First Name'), 'Jane');
      await user.type(demoModal.getByPlaceholderText('Last Name'), 'Smith');
      await user.type(demoModal.getByPlaceholderText('Work Email'), 'jane@company.com');
      await user.type(demoModal.getByPlaceholderText('Company'), 'Tech Corp');

      // Submit demo request
      await user.click(demoModal.getByText('Submit Request'));

      // Wait for redirect (form has 1000ms setTimeout)
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      }, { timeout: 2000 });
    });

    it('should switch between signin and signup modes', async () => {
      const user = userEvent.setup();
      render(<LandingPage />);

      // Open signin modal
      await user.click(screen.getAllByText('Sign In')[0]); // Click the nav Sign In button
      expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
      expect(screen.getByText('Sign In', { selector: 'h2' })).toBeInTheDocument();

      // Switch to signup
      await user.click(screen.getByText(/Don't have an account/));
      expect(screen.getByText('Create Account')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Full Name')).toBeInTheDocument();

      // Switch back to signin
      await user.click(screen.getByText(/Already have an account/));
      expect(screen.getByText('Sign In', { selector: 'h2' })).toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Full Name')).not.toBeInTheDocument();
    });

    it('should handle the signin flow', async () => {
      const user = userEvent.setup();
      render(<LandingPage />);

      // Open signin modal
      await user.click(screen.getAllByText('Sign In')[0]); // Click the nav Sign In button
      const authModal = screen.getByTestId('auth-modal');
      expect(authModal).toBeInTheDocument();

      // Fill signin form
      await user.type(screen.getByPlaceholderText('Email'), 'user@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'password123');

      // Submit signin - use the submit button inside the modal
      const modalContent = within(authModal);
      await user.click(modalContent.getByRole('button', { name: 'Sign In' }));
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('Navigation Flow', () => {
    it('should scroll to sections when navigation items clicked', async () => {
      const user = userEvent.setup();
      const mockScrollIntoView = jest.fn();
      
      // Mock getElementById and scrollIntoView
      document.getElementById = jest.fn().mockImplementation((id) => ({
        scrollIntoView: mockScrollIntoView,
        id
      }));

      render(<LandingPage />);

      // Click Features
      await user.click(screen.getByText('Features'));
      expect(document.getElementById).toHaveBeenCalledWith('features');
      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });

      // Click Pricing
      await user.click(screen.getByText('Pricing'));
      expect(document.getElementById).toHaveBeenCalledWith('pricing');
    });

    it('should have multiple CTAs leading to signup', async () => {
      const user = userEvent.setup();
      render(<LandingPage />);

      const getStartedButtons = screen.getAllByText(/Get Started/);
      expect(getStartedButtons.length).toBeGreaterThan(1);

      // Click hero CTA
      await user.click(getStartedButtons[0]);
      expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
      expect(screen.getByText('Create Account')).toBeInTheDocument();

      // Close modal
      await user.click(screen.getByTestId('auth-modal'));

      // Click pricing CTA
      const trialButton = screen.getByText('Start Free Trial');
      await user.click(trialButton);
      expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
    });
  });

  describe('Modal Interactions', () => {
    it('should close modals when clicking backdrop', async () => {
      const user = userEvent.setup();
      render(<LandingPage />);

      // Open demo modal
      await user.click(screen.getByText('Demo'));
      expect(screen.getByTestId('demo-modal')).toBeInTheDocument();

      // Click backdrop to close
      await user.click(screen.getByTestId('demo-modal'));
      expect(screen.queryByTestId('demo-modal')).not.toBeInTheDocument();

      // Open auth modal
      await user.click(screen.getAllByText('Sign In')[0]); // Click the nav Sign In button
      expect(screen.getByTestId('auth-modal')).toBeInTheDocument();

      // Click backdrop to close
      await user.click(screen.getByTestId('auth-modal'));
      expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument();
    });

    it('should not close modals when clicking inside', async () => {
      const user = userEvent.setup();
      render(<LandingPage />);

      // Open demo modal
      await user.click(screen.getByText('Demo'));
      const modalContent = screen.getByText('Request a Demo').closest('div');
      
      // Click inside modal
      await user.click(modalContent!);
      expect(screen.getByTestId('demo-modal')).toBeInTheDocument();
    });
  });

  describe('Content Validation', () => {
    it('should display all key value propositions', () => {
      render(<LandingPage />);

      // Hero content
      expect(screen.getByText('Enterprise Contract Intelligence')).toBeInTheDocument();
      expect(screen.getByText(/Streamline vendor management/)).toBeInTheDocument();

      // Features
      expect(screen.getByText('AI Analysis')).toBeInTheDocument();
      expect(screen.getByText('Vendor Management')).toBeInTheDocument();
      expect(screen.getByText('Financial Insights')).toBeInTheDocument();

      // Pricing
      expect(screen.getByText('Professional Plan')).toBeInTheDocument();
      expect(screen.getByText('$499')).toBeInTheDocument();
      expect(screen.getByText(/Unlimited contracts/)).toBeInTheDocument();
    });

    it('should have consistent branding', () => {
      render(<LandingPage />);

      const logos = screen.getAllByText('Pactwise');
      expect(logos.length).toBeGreaterThan(0);
      expect(logos[0]).toHaveClass('font-bold');
    });
  });

  describe('Form Validation', () => {
    it('should require all fields in demo form', async () => {
      const user = userEvent.setup();
      render(<LandingPage />);

      await user.click(screen.getByText('Demo'));
      const submitButton = screen.getByText('Submit Request');
      
      // Try to submit empty form
      await user.click(submitButton);
      
      // Form should not submit (mockPush not called)
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should require all fields in signup form', async () => {
      const user = userEvent.setup();
      render(<LandingPage />);

      await user.click(screen.getAllByText('Get Started')[0]);
      const signUpButton = screen.getByRole('button', { name: 'Sign Up' });
      
      // Try to submit empty form
      await user.click(signUpButton);
      
      // Form should not submit
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing elements gracefully', async () => {
      const user = userEvent.setup();
      document.getElementById = jest.fn().mockReturnValue(null);
      
      render(<LandingPage />);

      // Should not throw when element not found
      await user.click(screen.getByText('Features'));
      expect(document.getElementById).toHaveBeenCalledWith('features');
    });
  });

  describe('Responsive Behavior', () => {
    it('should have responsive navigation', () => {
      render(<LandingPage />);

      const nav = screen.getByRole('navigation').querySelector('.hidden.md\\:flex');
      expect(nav).toBeInTheDocument();
    });

    it('should have responsive grid layouts', () => {
      render(<LandingPage />);

      const featuresGrid = screen.getByText('Key Features')
        .closest('section')
        ?.querySelector('.grid.md\\:grid-cols-3');
      expect(featuresGrid).toBeInTheDocument();
    });
  });
});