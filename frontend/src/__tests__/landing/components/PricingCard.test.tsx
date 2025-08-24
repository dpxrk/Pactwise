import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import React, { useState } from 'react';

// Mock router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    pathname: '/',
  }),
}));

describe('PricingCard Component', () => {
  // Simplified PricingCard component for testing
  const PricingCard = () => {
    const [discountCode, setDiscountCode] = useState('');
    const [appliedDiscount, setAppliedDiscount] = useState(0);
    const [isValidating, setIsValidating] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const basePrice = 499;
    const validCodes: Record<string, number> = {
      'EARLY500': 500,
      'PARTNER20': 20,
      'DEMO15': 15,
    };

    const calculateDiscountedPrice = () => {
      const discountAmount = (basePrice * appliedDiscount) / 100;
      return basePrice - discountAmount;
    };

    const handleApplyDiscount = () => {
      setIsValidating(true);
      setError('');
      setSuccessMessage('');

      setTimeout(() => {
        const code = discountCode.toUpperCase().trim();
        if (validCodes[code]) {
          const discountPercentage = validCodes[code] === 500 ? 100 : validCodes[code];
          setAppliedDiscount(discountPercentage);
          setSuccessMessage(`${code} applied! You saved $${(basePrice * discountPercentage / 100).toFixed(0)}`);
        } else if (code) {
          setError('Invalid discount code');
        }
        setIsValidating(false);
      }, 500);
    };

    const handleGetStarted = () => {
      const params = appliedDiscount > 0 ? `?discount=${discountCode.toUpperCase()}` : '?discount=EARLY500';
      mockPush(`/auth/signup${params}`);
    };

    return (
      <div className="bg-white border border-gray-300 p-8" data-testid="pricing-card">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Professional Plan</h3>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-5xl font-bold text-gray-900">
              ${appliedDiscount > 0 ? calculateDiscountedPrice() : basePrice}
            </span>
            <span className="text-gray-600">/month</span>
          </div>
          {appliedDiscount > 0 && (
            <div className="mt-2 text-sm">
              <span className="text-gray-500 line-through">${basePrice}</span>
              <span className="ml-2 text-green-600 font-semibold">
                {appliedDiscount}% OFF
              </span>
            </div>
          )}
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-center">
            <span className="text-green-600 mr-2">✓</span>
            <span>Unlimited contracts</span>
          </div>
          <div className="flex items-center">
            <span className="text-green-600 mr-2">✓</span>
            <span>AI-powered analysis</span>
          </div>
          <div className="flex items-center">
            <span className="text-green-600 mr-2">✓</span>
            <span>Advanced reporting</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter discount code"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300"
              aria-label="Discount code input"
            />
            <button
              onClick={handleApplyDiscount}
              disabled={isValidating || !discountCode.trim()}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
              aria-label="Apply discount code"
            >
              {isValidating ? 'Validating...' : 'Apply'}
            </button>
          </div>

          {error && (
            <div className="text-red-600 text-sm" role="alert">{error}</div>
          )}
          {successMessage && (
            <div className="text-green-600 text-sm" role="status">{successMessage}</div>
          )}

          <button
            onClick={handleGetStarted}
            className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold"
            aria-label="Get started with professional plan"
          >
            Get Started
          </button>

          <p className="text-xs text-gray-500 text-center">
            Special offer: Use code EARLY500 for $0/month (limited time)
          </p>
        </div>
      </div>
    );
  };

  beforeEach(() => {
    mockPush.mockClear();
  });

  describe('Rendering', () => {
    it('should render pricing card with all elements', () => {
      render(<PricingCard />);

      expect(screen.getByText('Professional Plan')).toBeInTheDocument();
      expect(screen.getByText('$499')).toBeInTheDocument();
      expect(screen.getByText('/month')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter discount code')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /apply discount/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
    });

    it('should display all plan features', () => {
      render(<PricingCard />);

      expect(screen.getByText('Unlimited contracts')).toBeInTheDocument();
      expect(screen.getByText('AI-powered analysis')).toBeInTheDocument();
      expect(screen.getByText('Advanced reporting')).toBeInTheDocument();
    });

    it('should show special offer text', () => {
      render(<PricingCard />);

      expect(screen.getByText(/Special offer: Use code EARLY500/)).toBeInTheDocument();
    });
  });

  describe('Discount Code Functionality', () => {
    it('should apply valid discount code EARLY500', async () => {
      const user = userEvent.setup();
      render(<PricingCard />);

      const input = screen.getByLabelText('Discount code input');
      const applyButton = screen.getByLabelText('Apply discount code');

      await user.type(input, 'EARLY500');
      await user.click(applyButton);

      await waitFor(() => {
        expect(screen.getByText(/EARLY500 applied!/)).toBeInTheDocument();
        expect(screen.getByText('$0')).toBeInTheDocument();
        expect(screen.getByText('100% OFF')).toBeInTheDocument();
      });
    });

    it('should apply valid discount code PARTNER20', async () => {
      const user = userEvent.setup();
      render(<PricingCard />);

      const input = screen.getByLabelText('Discount code input');
      const applyButton = screen.getByLabelText('Apply discount code');

      await user.type(input, 'PARTNER20');
      await user.click(applyButton);

      await waitFor(() => {
        expect(screen.getByText(/PARTNER20 applied!/)).toBeInTheDocument();
        expect(screen.getByText(/\$399/)).toBeInTheDocument(); // 499 - 20% = 399.2
        expect(screen.getByText('20% OFF')).toBeInTheDocument();
      });
    });

    it('should handle invalid discount code', async () => {
      const user = userEvent.setup();
      render(<PricingCard />);

      const input = screen.getByLabelText('Discount code input');
      const applyButton = screen.getByLabelText('Apply discount code');

      await user.type(input, 'INVALID');
      await user.click(applyButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Invalid discount code');
      });
    });

    it('should handle case-insensitive discount codes', async () => {
      const user = userEvent.setup();
      render(<PricingCard />);

      const input = screen.getByLabelText('Discount code input');
      const applyButton = screen.getByLabelText('Apply discount code');

      await user.type(input, 'early500');
      await user.click(applyButton);

      await waitFor(() => {
        expect(screen.getByText(/EARLY500 applied!/)).toBeInTheDocument();
      });
    });

    it('should trim whitespace from discount codes', async () => {
      const user = userEvent.setup();
      render(<PricingCard />);

      const input = screen.getByLabelText('Discount code input');
      const applyButton = screen.getByLabelText('Apply discount code');

      await user.type(input, '  DEMO15  ');
      await user.click(applyButton);

      await waitFor(() => {
        expect(screen.getByText(/DEMO15 applied!/)).toBeInTheDocument();
      });
    });

    it('should disable apply button when input is empty', () => {
      render(<PricingCard />);

      const applyButton = screen.getByLabelText('Apply discount code');
      expect(applyButton).toBeDisabled();
    });

    it('should show validating state while checking code', async () => {
      const user = userEvent.setup();
      render(<PricingCard />);

      const input = screen.getByLabelText('Discount code input');
      const applyButton = screen.getByLabelText('Apply discount code');

      await user.type(input, 'EARLY500');
      await user.click(applyButton);

      expect(screen.getByText('Validating...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText('Validating...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Price Display', () => {
    it('should show original price with strikethrough when discount applied', async () => {
      const user = userEvent.setup();
      render(<PricingCard />);

      const input = screen.getByLabelText('Discount code input');
      const applyButton = screen.getByLabelText('Apply discount code');

      await user.type(input, 'PARTNER20');
      await user.click(applyButton);

      await waitFor(() => {
        const strikethroughPrice = screen.getByText('$499');
        expect(strikethroughPrice).toHaveClass('line-through');
      });
    });

    it('should calculate correct discounted prices', async () => {
      const user = userEvent.setup();
      render(<PricingCard />);

      const input = screen.getByLabelText('Discount code input');
      const applyButton = screen.getByLabelText('Apply discount code');

      // Test 15% discount
      await user.clear(input);
      await user.type(input, 'DEMO15');
      await user.click(applyButton);

      await waitFor(() => {
        expect(screen.getByText(/\$424/)).toBeInTheDocument(); // 499 - 15% = 424.15
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to signup with discount code when Get Started clicked', async () => {
      const user = userEvent.setup();
      render(<PricingCard />);

      const input = screen.getByLabelText('Discount code input');
      const applyButton = screen.getByLabelText('Apply discount code');

      await user.type(input, 'PARTNER20');
      await user.click(applyButton);

      await waitFor(() => {
        expect(screen.getByText(/PARTNER20 applied!/)).toBeInTheDocument();
      });

      const getStartedButton = screen.getByLabelText('Get started with professional plan');
      await user.click(getStartedButton);

      expect(mockPush).toHaveBeenCalledWith('/auth/signup?discount=PARTNER20');
    });

    it('should navigate with EARLY500 code by default if no discount applied', async () => {
      const user = userEvent.setup();
      render(<PricingCard />);

      const getStartedButton = screen.getByLabelText('Get started with professional plan');
      await user.click(getStartedButton);

      expect(mockPush).toHaveBeenCalledWith('/auth/signup?discount=EARLY500');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<PricingCard />);

      expect(screen.getByLabelText('Discount code input')).toBeInTheDocument();
      expect(screen.getByLabelText('Apply discount code')).toBeInTheDocument();
      expect(screen.getByLabelText('Get started with professional plan')).toBeInTheDocument();
    });

    it('should announce success messages to screen readers', async () => {
      const user = userEvent.setup();
      render(<PricingCard />);

      const input = screen.getByLabelText('Discount code input');
      const applyButton = screen.getByLabelText('Apply discount code');

      await user.type(input, 'EARLY500');
      await user.click(applyButton);

      await waitFor(() => {
        const successMessage = screen.getByRole('status');
        expect(successMessage).toHaveTextContent(/EARLY500 applied!/);
      });
    });

    it('should announce error messages to screen readers', async () => {
      const user = userEvent.setup();
      render(<PricingCard />);

      const input = screen.getByLabelText('Discount code input');
      const applyButton = screen.getByLabelText('Apply discount code');

      await user.type(input, 'INVALID');
      await user.click(applyButton);

      await waitFor(() => {
        const errorMessage = screen.getByRole('alert');
        expect(errorMessage).toHaveTextContent('Invalid discount code');
      });
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<PricingCard />);

      // Tab through elements
      await user.tab();
      expect(screen.getByLabelText('Discount code input')).toHaveFocus();

      // Skip the Apply button since it's disabled when input is empty
      await user.tab();
      expect(screen.getByLabelText('Get started with professional plan')).toHaveFocus();
    });
  });

  describe('Error States', () => {
    it('should clear error message when typing new code', async () => {
      const user = userEvent.setup();
      render(<PricingCard />);

      const input = screen.getByLabelText('Discount code input');
      const applyButton = screen.getByLabelText('Apply discount code');

      // Generate error
      await user.type(input, 'INVALID');
      await user.click(applyButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Clear and type new code
      await user.clear(input);
      await user.type(input, 'EARLY500');
      await user.click(applyButton);

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(screen.getByRole('status')).toBeInTheDocument();
      });
    });

    it('should handle rapid clicking of apply button', async () => {
      const user = userEvent.setup();
      render(<PricingCard />);

      const input = screen.getByLabelText('Discount code input');
      const applyButton = screen.getByLabelText('Apply discount code');

      await user.type(input, 'EARLY500');
      
      // Rapid clicks
      await user.click(applyButton);
      await user.click(applyButton);
      await user.click(applyButton);

      // Should still work correctly
      await waitFor(() => {
        expect(screen.getByText(/EARLY500 applied!/)).toBeInTheDocument();
      });
    });
  });
});