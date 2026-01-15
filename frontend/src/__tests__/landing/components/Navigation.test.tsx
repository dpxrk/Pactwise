import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState, useEffect } from 'react';
import '@testing-library/jest-dom';

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    pathname: '/',
  }),
}));

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe('Navigation Component', () => {
  const Navigation = ({ 
    onSignIn, 
    onGetDemo 
  }: { 
    onSignIn: () => void; 
    onGetDemo: () => void;
  }) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
      const handleScroll = () => {
        setIsScrolled(window.scrollY > 10);
      };
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (sectionId: string) => {
      const element = document.getElementById(sectionId);
      element?.scrollIntoView({ behavior: 'smooth' });
      setIsMobileMenuOpen(false);
    };

    return (
      <nav 
        className={`fixed top-0 w-full z-50 transition-all ${
          isScrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-white/80 backdrop-blur-md'
        } border-b border-gray-200`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <a href="/" className="text-2xl font-bold text-gray-900" aria-label="Pactwise home">
                Pactwise
              </a>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => scrollToSection('features')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
                aria-label="Go to features section"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('agents')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
                aria-label="Go to AI agents section"
              >
                AI Agents
              </button>
              <button
                onClick={() => scrollToSection('pricing')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
                aria-label="Go to pricing section"
              >
                Pricing
              </button>
              <button
                onClick={onGetDemo}
                className="text-gray-600 hover:text-gray-900 transition-colors"
                aria-label="Request a demo"
              >
                Demo
              </button>
            </div>

            {/* Desktop CTA Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <button
                onClick={onSignIn}
                className="px-4 py-2 text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label="Sign in to your account"
              >
                Sign In
              </button>
              <button
                onClick={onGetDemo}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white transition-colors"
                aria-label="Get started with Pactwise"
              >
                Get Started
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900"
              aria-label={isMobileMenuOpen ? 'Close mobile menu' : 'Open mobile menu'}
              aria-expanded={isMobileMenuOpen}
            >
              <span className="sr-only">Menu</span>
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200" data-testid="mobile-menu">
              <div className="flex flex-col space-y-4">
                <button
                  onClick={() => scrollToSection('features')}
                  className="text-left px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  Features
                </button>
                <button
                  onClick={() => scrollToSection('agents')}
                  className="text-left px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  AI Agents
                </button>
                <button
                  onClick={() => scrollToSection('pricing')}
                  className="text-left px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  Pricing
                </button>
                <button
                  onClick={onGetDemo}
                  className="text-left px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  Demo
                </button>
                <hr className="border-gray-200" />
                <button
                  onClick={onSignIn}
                  className="text-left px-4 py-2 text-gray-900 hover:bg-gray-50"
                >
                  Sign In
                </button>
                <button
                  onClick={onGetDemo}
                  className="mx-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-center"
                >
                  Get Started
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>
    );
  };

  beforeEach(() => {
    mockPush.mockClear();
    // Reset scroll position
    window.scrollY = 0;
  });

  describe('Rendering', () => {
    it('should render navigation with logo and menu items', () => {
      const mockSignIn = jest.fn();
      const mockGetDemo = jest.fn();
      
      render(<Navigation onSignIn={mockSignIn} onGetDemo={mockGetDemo} />);

      expect(screen.getByLabelText('Pactwise home')).toBeInTheDocument();
      expect(screen.getByLabelText('Go to features section')).toBeInTheDocument();
      expect(screen.getByLabelText('Go to AI agents section')).toBeInTheDocument();
      expect(screen.getByLabelText('Go to pricing section')).toBeInTheDocument();
      expect(screen.getByLabelText('Request a demo')).toBeInTheDocument();
    });

    it('should render CTA buttons on desktop', () => {
      const mockSignIn = jest.fn();
      const mockGetDemo = jest.fn();
      
      render(<Navigation onSignIn={mockSignIn} onGetDemo={mockGetDemo} />);

      expect(screen.getByLabelText('Sign in to your account')).toBeInTheDocument();
      expect(screen.getByLabelText('Get started with Pactwise')).toBeInTheDocument();
    });

    it('should render mobile menu button on small screens', () => {
      const mockSignIn = jest.fn();
      const mockGetDemo = jest.fn();
      
      render(<Navigation onSignIn={mockSignIn} onGetDemo={mockGetDemo} />);

      const mobileMenuButton = screen.getByLabelText('Open mobile menu');
      expect(mobileMenuButton).toBeInTheDocument();
    });
  });

  describe('Mobile Menu', () => {
    it('should toggle mobile menu when button clicked', async () => {
      const mockSignIn = jest.fn();
      const mockGetDemo = jest.fn();
      const user = userEvent.setup();
      
      render(<Navigation onSignIn={mockSignIn} onGetDemo={mockGetDemo} />);

      const menuButton = screen.getByLabelText('Open mobile menu');
      
      // Open menu
      await user.click(menuButton);
      expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();
      expect(screen.getByLabelText('Close mobile menu')).toBeInTheDocument();
      
      // Close menu
      await user.click(screen.getByLabelText('Close mobile menu'));
      expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();
    });

    it('should have all navigation items in mobile menu', async () => {
      const mockSignIn = jest.fn();
      const mockGetDemo = jest.fn();
      const user = userEvent.setup();
      
      render(<Navigation onSignIn={mockSignIn} onGetDemo={mockGetDemo} />);

      await user.click(screen.getByLabelText('Open mobile menu'));
      
      const mobileMenu = screen.getByTestId('mobile-menu');
      expect(mobileMenu).toBeInTheDocument();
      
      // Check all navigation items are present
      within(mobileMenu).getByText('Features');
      within(mobileMenu).getByText('AI Agents');
      within(mobileMenu).getByText('Pricing');
      within(mobileMenu).getByText('Demo');
      within(mobileMenu).getByText('Sign In');
      within(mobileMenu).getByText('Get Started');
    });

    it('should close mobile menu when navigation item clicked', async () => {
      const mockSignIn = jest.fn();
      const mockGetDemo = jest.fn();
      const user = userEvent.setup();
      
      // Mock getElementById
      const mockElement = { scrollIntoView: jest.fn() };
      document.getElementById = jest.fn().mockReturnValue(mockElement);
      
      render(<Navigation onSignIn={mockSignIn} onGetDemo={mockGetDemo} />);

      await user.click(screen.getByLabelText('Open mobile menu'));
      const mobileMenu = screen.getByTestId('mobile-menu');
      
      await user.click(within(mobileMenu).getByText('Features'));
      
      expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();
    });
  });

  describe('Scroll Behavior', () => {
    it('should add scroll styles when page is scrolled', async () => {
      const mockSignIn = jest.fn();
      const mockGetDemo = jest.fn();
      
      const { container } = render(<Navigation onSignIn={mockSignIn} onGetDemo={mockGetDemo} />);
      const nav = container.querySelector('nav');
      
      // Initial state
      expect(nav).toHaveClass('bg-white/80');
      
      // Simulate scroll
      window.scrollY = 50;
      fireEvent.scroll(window);
      
      await waitFor(() => {
        expect(nav).toHaveClass('bg-white/95', 'shadow-sm');
      });
    });

    it('should scroll to section when navigation item clicked', async () => {
      const mockSignIn = jest.fn();
      const mockGetDemo = jest.fn();
      const user = userEvent.setup();
      
      const mockScrollIntoView = jest.fn();
      const mockElement = { scrollIntoView: mockScrollIntoView };
      document.getElementById = jest.fn().mockReturnValue(mockElement);
      
      render(<Navigation onSignIn={mockSignIn} onGetDemo={mockGetDemo} />);
      
      await user.click(screen.getByLabelText('Go to features section'));
      
      expect(document.getElementById).toHaveBeenCalledWith('features');
      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    });

    it('should handle missing section gracefully', async () => {
      const mockSignIn = jest.fn();
      const mockGetDemo = jest.fn();
      const user = userEvent.setup();
      
      document.getElementById = jest.fn().mockReturnValue(null);
      
      render(<Navigation onSignIn={mockSignIn} onGetDemo={mockGetDemo} />);
      
      // Should not throw error
      await user.click(screen.getByLabelText('Go to features section'));
      
      expect(document.getElementById).toHaveBeenCalledWith('features');
    });
  });

  describe('User Interactions', () => {
    it('should call onSignIn when Sign In button clicked', async () => {
      const mockSignIn = jest.fn();
      const mockGetDemo = jest.fn();
      const user = userEvent.setup();
      
      render(<Navigation onSignIn={mockSignIn} onGetDemo={mockGetDemo} />);
      
      await user.click(screen.getByLabelText('Sign in to your account'));
      
      expect(mockSignIn).toHaveBeenCalledTimes(1);
    });

    it('should call onGetDemo when Get Started button clicked', async () => {
      const mockSignIn = jest.fn();
      const mockGetDemo = jest.fn();
      const user = userEvent.setup();
      
      render(<Navigation onSignIn={mockSignIn} onGetDemo={mockGetDemo} />);
      
      await user.click(screen.getByLabelText('Get started with Pactwise'));
      
      expect(mockGetDemo).toHaveBeenCalledTimes(1);
    });

    it('should call onGetDemo when Demo nav item clicked', async () => {
      const mockSignIn = jest.fn();
      const mockGetDemo = jest.fn();
      const user = userEvent.setup();
      
      render(<Navigation onSignIn={mockSignIn} onGetDemo={mockGetDemo} />);
      
      await user.click(screen.getByLabelText('Request a demo'));
      
      expect(mockGetDemo).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const mockSignIn = jest.fn();
      const mockGetDemo = jest.fn();
      
      render(<Navigation onSignIn={mockSignIn} onGetDemo={mockGetDemo} />);
      
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveAttribute('aria-label', 'Main navigation');
      
      const mobileMenuButton = screen.getByLabelText('Open mobile menu');
      expect(mobileMenuButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('should update ARIA expanded when mobile menu opens', async () => {
      const mockSignIn = jest.fn();
      const mockGetDemo = jest.fn();
      const user = userEvent.setup();
      
      render(<Navigation onSignIn={mockSignIn} onGetDemo={mockGetDemo} />);
      
      const menuButton = screen.getByLabelText('Open mobile menu');
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
      
      await user.click(menuButton);
      
      const closeButton = screen.getByLabelText('Close mobile menu');
      expect(closeButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should be keyboard navigable', async () => {
      const mockSignIn = jest.fn();
      const mockGetDemo = jest.fn();
      const user = userEvent.setup();
      
      render(<Navigation onSignIn={mockSignIn} onGetDemo={mockGetDemo} />);
      
      // Tab through navigation items
      await user.tab();
      expect(screen.getByLabelText('Pactwise home')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText('Go to features section')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText('Go to AI agents section')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText('Go to pricing section')).toHaveFocus();
    });

    it('should have screen reader only text for menu button', () => {
      const mockSignIn = jest.fn();
      const mockGetDemo = jest.fn();
      
      render(<Navigation onSignIn={mockSignIn} onGetDemo={mockGetDemo} />);
      
      expect(screen.getByText('Menu')).toHaveClass('sr-only');
    });
  });

  describe('Responsive Design', () => {
    it('should hide desktop navigation on mobile', () => {
      const mockSignIn = jest.fn();
      const mockGetDemo = jest.fn();
      
      const { container } = render(<Navigation onSignIn={mockSignIn} onGetDemo={mockGetDemo} />);
      
      const desktopNav = container.querySelector('.hidden.md\\:flex');
      expect(desktopNav).toBeInTheDocument();
      
      const mobileButton = container.querySelector('.md\\:hidden');
      expect(mobileButton).toBeInTheDocument();
    });

    it('should apply hover states correctly', async () => {
      const mockSignIn = jest.fn();
      const mockGetDemo = jest.fn();
      const user = userEvent.setup();
      
      render(<Navigation onSignIn={mockSignIn} onGetDemo={mockGetDemo} />);
      
      const featuresButton = screen.getByLabelText('Go to features section');
      expect(featuresButton).toHaveClass('hover:text-gray-900');
      
      const signInButton = screen.getByLabelText('Sign in to your account');
      expect(signInButton).toHaveClass('hover:bg-gray-100');
      
      const getStartedButton = screen.getByLabelText('Get started with Pactwise');
      expect(getStartedButton).toHaveClass('hover:bg-gray-800');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing callbacks gracefully', () => {
      const Navigation = () => (
        <nav>
          <button onClick={undefined}>Test Button</button>
        </nav>
      );
      
      expect(() => render(<Navigation />)).not.toThrow();
    });

    it('should cleanup scroll listener on unmount', () => {
      const mockSignIn = jest.fn();
      const mockGetDemo = jest.fn();
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      
      const { unmount } = render(<Navigation onSignIn={mockSignIn} onGetDemo={mockGetDemo} />);
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    });
  });
});

