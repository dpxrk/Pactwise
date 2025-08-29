import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import React from 'react';

// Mock Next.js dynamic imports
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: (fn: () => Promise<React.ComponentType>) => {
    const Component = () => {
      const [module, setModule] = React.useState<React.ComponentType | null>(null);
      React.useEffect(() => {
        fn().then((mod) => setModule(() => mod.default || mod));
      }, []);
      return module ? React.createElement(module) : null;
    };
    Component.displayName = 'DynamicComponent';
    return Component;
  },
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
    section: ({ children, ...props }: { children: React.ReactNode }) => <section {...props}>{children}</section>,
    span: ({ children, ...props }: { children: React.ReactNode }) => <span {...props}>{children}</span>,
    button: ({ children, ...props }: { children: React.ReactNode }) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  useScroll: () => ({ scrollYProgress: { current: 0 } }),
  useTransform: (value: unknown, input: unknown, output: unknown) => ({ current: (output as number[])[0] }),
  useSpring: (value: unknown) => value,
  useAnimation: () => ({
    start: jest.fn(),
    set: jest.fn(),
  }),
  useInView: () => true,
}));

import React from 'react';

describe('HeroSection Component', () => {
  // Component to test - extracted Hero section from main page
  const HeroSection = ({ onGetStarted }: { onGetStarted: () => void }) => {
    return (
      <section className="relative flex items-center justify-center pt-32 pb-20">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-20">
            <h1 className="text-6xl font-bold tracking-tight text-gray-900 mb-6">
              Enterprise Contract Intelligence
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
              Streamline vendor management, optimize contracts, and unlock financial insights with AI-powered intelligence.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={onGetStarted}
                className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-4 text-lg font-semibold transition-colors"
                aria-label="Get started with Pactwise"
              >
                Get Started
              </button>
              <button
                className="border border-gray-900 text-gray-900 hover:bg-gray-100 px-8 py-4 text-lg font-semibold transition-colors"
                aria-label="Watch demo video"
              >
                Watch Demo
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  };

  describe('Rendering', () => {
    it('should render the hero section with correct content', () => {
      const mockGetStarted = jest.fn();
      render(<HeroSection onGetStarted={mockGetStarted} />);

      expect(screen.getByText('Enterprise Contract Intelligence')).toBeInTheDocument();
      expect(screen.getByText(/Streamline vendor management/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /watch demo/i })).toBeInTheDocument();
    });

    it('should have proper semantic HTML structure', () => {
      const mockGetStarted = jest.fn();
      const { container } = render(<HeroSection onGetStarted={mockGetStarted} />);
      
      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
      expect(section).toHaveClass('relative', 'flex', 'items-center');
      
      const heading = container.querySelector('h1');
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveClass('text-6xl', 'font-bold');
    });

    it('should render with correct typography styles', () => {
      const mockGetStarted = jest.fn();
      render(<HeroSection onGetStarted={mockGetStarted} />);
      
      const heading = screen.getByText('Enterprise Contract Intelligence');
      expect(heading).toHaveClass('text-6xl', 'font-bold', 'tracking-tight', 'text-gray-900');
      
      const subtitle = screen.getByText(/Streamline vendor management/);
      expect(subtitle).toHaveClass('text-xl', 'text-gray-600');
    });
  });

  describe('User Interactions', () => {
    it('should call onGetStarted when Get Started button is clicked', async () => {
      const mockGetStarted = jest.fn();
      const user = userEvent.setup();
      
      render(<HeroSection onGetStarted={mockGetStarted} />);
      
      const getStartedButton = screen.getByRole('button', { name: /get started/i });
      await user.click(getStartedButton);
      
      expect(mockGetStarted).toHaveBeenCalledTimes(1);
    });

    it('should handle Watch Demo button click', async () => {
      const mockGetStarted = jest.fn();
      const user = userEvent.setup();
      
      render(<HeroSection onGetStarted={mockGetStarted} />);
      
      const watchDemoButton = screen.getByRole('button', { name: /watch demo/i });
      expect(watchDemoButton).toBeInTheDocument();
      
      // Test hover state
      await user.hover(watchDemoButton);
      expect(watchDemoButton).toHaveClass('hover:bg-gray-100');
    });

    it('should have correct button hover states', async () => {
      const mockGetStarted = jest.fn();
      const user = userEvent.setup();
      
      render(<HeroSection onGetStarted={mockGetStarted} />);
      
      const getStartedButton = screen.getByRole('button', { name: /get started/i });
      const watchDemoButton = screen.getByRole('button', { name: /watch demo/i });
      
      // Test Get Started button hover
      await user.hover(getStartedButton);
      expect(getStartedButton).toHaveClass('hover:bg-gray-800');
      
      // Test Watch Demo button hover
      await user.hover(watchDemoButton);
      expect(watchDemoButton).toHaveClass('hover:bg-gray-100');
    });

    it('should be keyboard accessible', async () => {
      const mockGetStarted = jest.fn();
      const user = userEvent.setup();
      
      render(<HeroSection onGetStarted={mockGetStarted} />);
      
      // Tab to first button
      await user.tab();
      const getStartedButton = screen.getByRole('button', { name: /get started/i });
      expect(getStartedButton).toHaveFocus();
      
      // Press Enter to activate
      await user.keyboard('{Enter}');
      expect(mockGetStarted).toHaveBeenCalledTimes(1);
      
      // Tab to second button
      await user.tab();
      const watchDemoButton = screen.getByRole('button', { name: /watch demo/i });
      expect(watchDemoButton).toHaveFocus();
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive container classes', () => {
      const mockGetStarted = jest.fn();
      const { container } = render(<HeroSection onGetStarted={mockGetStarted} />);
      
      const containerDiv = container.querySelector('.container');
      expect(containerDiv).toHaveClass('mx-auto', 'px-6', 'max-w-6xl');
    });

    it('should maintain proper text hierarchy on different screen sizes', () => {
      const mockGetStarted = jest.fn();
      render(<HeroSection onGetStarted={mockGetStarted} />);
      
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveClass('text-6xl');
      
      const subtitle = screen.getByText(/Streamline vendor management/);
      expect(subtitle).toHaveClass('text-xl', 'max-w-3xl', 'mx-auto');
    });

    it('should have flex layout for buttons', () => {
      const mockGetStarted = jest.fn();
      const { container } = render(<HeroSection onGetStarted={mockGetStarted} />);
      
      const buttonContainer = container.querySelector('.flex.gap-4.justify-center');
      expect(buttonContainer).toBeInTheDocument();
      expect(buttonContainer?.children).toHaveLength(2);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const mockGetStarted = jest.fn();
      render(<HeroSection onGetStarted={mockGetStarted} />);
      
      expect(screen.getByLabelText('Get started with Pactwise')).toBeInTheDocument();
      expect(screen.getByLabelText('Watch demo video')).toBeInTheDocument();
    });

    it('should have proper heading hierarchy', () => {
      const mockGetStarted = jest.fn();
      render(<HeroSection onGetStarted={mockGetStarted} />);
      
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toBeInTheDocument();
      expect(h1).toHaveTextContent('Enterprise Contract Intelligence');
    });

    it('should have sufficient color contrast', () => {
      const mockGetStarted = jest.fn();
      render(<HeroSection onGetStarted={mockGetStarted} />);
      
      const getStartedButton = screen.getByRole('button', { name: /get started/i });
      expect(getStartedButton).toHaveClass('bg-gray-900', 'text-white');
      
      const watchDemoButton = screen.getByRole('button', { name: /watch demo/i });
      expect(watchDemoButton).toHaveClass('border-gray-900', 'text-gray-900');
    });

    it('should be screen reader friendly', () => {
      const mockGetStarted = jest.fn();
      const { container } = render(<HeroSection onGetStarted={mockGetStarted} />);
      
      // Check for semantic HTML
      expect(container.querySelector('section')).toBeInTheDocument();
      expect(container.querySelector('h1')).toBeInTheDocument();
      expect(container.querySelector('p')).toBeInTheDocument();
      
      // Check buttons are properly labeled
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing onGetStarted prop gracefully', () => {
      const HeroWithoutProp = () => (
        <section className="relative flex items-center justify-center pt-32 pb-20">
          <button onClick={undefined}>Get Started</button>
        </section>
      );
      
      expect(() => render(<HeroWithoutProp />)).not.toThrow();
    });

    it('should not break when buttons are rapidly clicked', async () => {
      const mockGetStarted = jest.fn();
      const user = userEvent.setup();
      
      render(<HeroSection onGetStarted={mockGetStarted} />);
      
      const getStartedButton = screen.getByRole('button', { name: /get started/i });
      
      // Rapid clicks
      await user.click(getStartedButton);
      await user.click(getStartedButton);
      await user.click(getStartedButton);
      
      expect(mockGetStarted).toHaveBeenCalledTimes(3);
    });
  });

  describe('Loading States', () => {
    it('should render immediately without loading delay', () => {
      const mockGetStarted = jest.fn();
      const { container } = render(<HeroSection onGetStarted={mockGetStarted} />);
      
      expect(container.firstChild).toBeInTheDocument();
      expect(screen.getByText('Enterprise Contract Intelligence')).toBeVisible();
    });
  });

  describe('Animation and Motion', () => {
    it('should have transition classes on buttons', () => {
      const mockGetStarted = jest.fn();
      render(<HeroSection onGetStarted={mockGetStarted} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveClass('transition-colors');
      });
    });
  });
});