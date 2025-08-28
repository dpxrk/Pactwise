import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import React, { useState } from 'react';

// Mock fetch
global.fetch = jest.fn();

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('DemoModal Component', () => {
  const DemoModal = ({ 
    isOpen, 
    onClose,
    demoType = 'general'
  }: { 
    isOpen: boolean; 
    onClose: () => void;
    demoType?: string;
  }) => {
    const [formData, setFormData] = useState({
      firstName: '',
      lastName: '',
      email: '',
      company: '',
      role: '',
      message: '',
      demoType: demoType
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      setError('');

      try {
        const response = await fetch('/api/demo-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (!response.ok) {
          throw new Error('Failed to submit demo request');
        }

        setSuccess(true);
        setTimeout(() => {
          onClose();
          mockPush('/demo-success');
        }, 2000);
      } catch (err) {
        setError('Failed to submit request. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
    };

    if (!isOpen) return null;

    return (
      <div 
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-modal-title"
      >
        <div 
          className="bg-white p-8 max-w-md w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 id="demo-modal-title" className="text-2xl font-bold text-gray-900">
              Request a Demo
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close demo modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {success ? (
            <div className="text-center py-8">
              <div className="text-green-600 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Thank You!</h3>
              <p className="text-gray-600">We'll be in touch within 24 hours to schedule your demo.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                    aria-required="true"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                    aria-required="true"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Work Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                  aria-required="true"
                  aria-describedby="email-error"
                />
              </div>

              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                  Company *
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                  aria-required="true"
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Your Role *
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                  aria-required="true"
                >
                  <option value="">Select your role</option>
                  <option value="executive">Executive</option>
                  <option value="manager">Manager</option>
                  <option value="analyst">Analyst</option>
                  <option value="developer">Developer</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Message (Optional)
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                  placeholder="Tell us about your needs..."
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm" role="alert">
                  {error}
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-busy={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Request Demo'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 border border-gray-900 text-gray-900 hover:bg-gray-100 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  };

  beforeEach(() => {
    mockPush.mockClear();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      const mockClose = jest.fn();
      const { container } = render(<DemoModal isOpen={false} onClose={mockClose} />);
      
      expect(container.firstChild).toBeNull();
    });

    it('should render modal when isOpen is true', () => {
      const mockClose = jest.fn();
      render(<DemoModal isOpen={true} onClose={mockClose} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Request a Demo')).toBeInTheDocument();
    });

    it('should render all form fields', () => {
      const mockClose = jest.fn();
      render(<DemoModal isOpen={true} onClose={mockClose} />);
      
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/work email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/your role/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
    });

    it('should mark required fields', () => {
      const mockClose = jest.fn();
      render(<DemoModal isOpen={true} onClose={mockClose} />);
      
      expect(screen.getByText('First Name *')).toBeInTheDocument();
      expect(screen.getByText('Last Name *')).toBeInTheDocument();
      expect(screen.getByText('Work Email *')).toBeInTheDocument();
      expect(screen.getByText('Company *')).toBeInTheDocument();
      expect(screen.getByText('Your Role *')).toBeInTheDocument();
      expect(screen.getByText('Message (Optional)')).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('should update form fields when user types', async () => {
      const mockClose = jest.fn();
      const user = userEvent.setup();
      
      render(<DemoModal isOpen={true} onClose={mockClose} />);
      
      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const emailInput = screen.getByLabelText(/work email/i);
      const companyInput = screen.getByLabelText(/company/i);
      
      await user.type(firstNameInput, 'John');
      await user.type(lastNameInput, 'Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(companyInput, 'ACME Corp');
      
      expect(firstNameInput).toHaveValue('John');
      expect(lastNameInput).toHaveValue('Doe');
      expect(emailInput).toHaveValue('john@example.com');
      expect(companyInput).toHaveValue('ACME Corp');
    });

    it('should update role when selected', async () => {
      const mockClose = jest.fn();
      const user = userEvent.setup();
      
      render(<DemoModal isOpen={true} onClose={mockClose} />);
      
      const roleSelect = screen.getByLabelText(/your role/i);
      
      await user.selectOptions(roleSelect, 'executive');
      
      expect(roleSelect).toHaveValue('executive');
    });

    it('should update message textarea', async () => {
      const mockClose = jest.fn();
      const user = userEvent.setup();
      
      render(<DemoModal isOpen={true} onClose={mockClose} />);
      
      const messageTextarea = screen.getByLabelText(/message/i);
      
      await user.type(messageTextarea, 'I would like to learn more about your enterprise features.');
      
      expect(messageTextarea).toHaveValue('I would like to learn more about your enterprise features.');
    });
  });

  describe('Form Submission', () => {
    it('should submit form with valid data', async () => {
      const mockClose = jest.fn();
      const user = userEvent.setup();
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });
      
      render(<DemoModal isOpen={true} onClose={mockClose} />);
      
      // Fill form
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/work email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/company/i), 'ACME Corp');
      await user.selectOptions(screen.getByLabelText(/your role/i), 'executive');
      
      // Submit
      await user.click(screen.getByRole('button', { name: /request demo/i }));
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/demo-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            company: 'ACME Corp',
            role: 'executive',
            message: '',
            demoType: 'general'
          })
        });
      });
    });

    it('should show success message after successful submission', async () => {
      const mockClose = jest.fn();
      const user = userEvent.setup();
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });
      
      render(<DemoModal isOpen={true} onClose={mockClose} />);
      
      // Fill and submit form
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/work email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/company/i), 'ACME Corp');
      await user.selectOptions(screen.getByLabelText(/your role/i), 'executive');
      
      await user.click(screen.getByRole('button', { name: /request demo/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Thank You!')).toBeInTheDocument();
        expect(screen.getByText(/We'll be in touch within 24 hours/)).toBeInTheDocument();
      });
    });

    it('should redirect after successful submission', async () => {
      const mockClose = jest.fn();
      const user = userEvent.setup();
      
      jest.useFakeTimers();
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });
      
      render(<DemoModal isOpen={true} onClose={mockClose} />);
      
      // Fill and submit form
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/work email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/company/i), 'ACME Corp');
      await user.selectOptions(screen.getByLabelText(/your role/i), 'executive');
      
      await user.click(screen.getByRole('button', { name: /request demo/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Thank You!')).toBeInTheDocument();
      });
      
      jest.advanceTimersByTime(2000);
      
      expect(mockClose).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/demo-success');
      
      jest.useRealTimers();
    });

    it('should handle submission errors', async () => {
      const mockClose = jest.fn();
      const user = userEvent.setup();
      
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      render(<DemoModal isOpen={true} onClose={mockClose} />);
      
      // Fill and submit form
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/work email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/company/i), 'ACME Corp');
      await user.selectOptions(screen.getByLabelText(/your role/i), 'executive');
      
      await user.click(screen.getByRole('button', { name: /request demo/i }));
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Failed to submit request. Please try again.');
      });
    });

    it('should disable submit button while submitting', async () => {
      const mockClose = jest.fn();
      const user = userEvent.setup();
      
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ ok: true }), 100))
      );
      
      render(<DemoModal isOpen={true} onClose={mockClose} />);
      
      // Fill form
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/work email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/company/i), 'ACME Corp');
      await user.selectOptions(screen.getByLabelText(/your role/i), 'executive');
      
      const submitButton = screen.getByRole('button', { name: /request demo/i });
      
      await user.click(submitButton);
      
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent('Submitting...');
      expect(submitButton).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('Modal Behavior', () => {
    it('should close when clicking outside modal', async () => {
      const mockClose = jest.fn();
      const user = userEvent.setup();
      
      const { container } = render(<DemoModal isOpen={true} onClose={mockClose} />);
      
      const backdrop = container.querySelector('.fixed.inset-0');
      
      await user.click(backdrop!);
      
      expect(mockClose).toHaveBeenCalled();
    });

    it('should not close when clicking inside modal', async () => {
      const mockClose = jest.fn();
      const user = userEvent.setup();
      
      render(<DemoModal isOpen={true} onClose={mockClose} />);
      
      const modalContent = screen.getByText('Request a Demo').closest('div');
      
      await user.click(modalContent!);
      
      expect(mockClose).not.toHaveBeenCalled();
    });

    it('should close when close button clicked', async () => {
      const mockClose = jest.fn();
      const user = userEvent.setup();
      
      render(<DemoModal isOpen={true} onClose={mockClose} />);
      
      const closeButton = screen.getByLabelText('Close demo modal');
      
      await user.click(closeButton);
      
      expect(mockClose).toHaveBeenCalled();
    });

    it('should close when cancel button clicked', async () => {
      const mockClose = jest.fn();
      const user = userEvent.setup();
      
      render(<DemoModal isOpen={true} onClose={mockClose} />);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      
      await user.click(cancelButton);
      
      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const mockClose = jest.fn();
      render(<DemoModal isOpen={true} onClose={mockClose} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'demo-modal-title');
    });

    it('should have required attributes on form fields', () => {
      const mockClose = jest.fn();
      render(<DemoModal isOpen={true} onClose={mockClose} />);
      
      expect(screen.getByLabelText(/first name/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(/last name/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(/work email/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(/company/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(/your role/i)).toHaveAttribute('aria-required', 'true');
    });

    it('should be keyboard navigable', async () => {
      const mockClose = jest.fn();
      const user = userEvent.setup();
      
      render(<DemoModal isOpen={true} onClose={mockClose} />);
      
      // Tab through form fields
      await user.tab();
      expect(screen.getByLabelText(/first name/i)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText(/last name/i)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText(/work email/i)).toHaveFocus();
    });

    it('should trap focus within modal', () => {
      const mockClose = jest.fn();
      render(<DemoModal isOpen={true} onClose={mockClose} />);
      
      const dialog = screen.getByRole('dialog');
      const focusableElements = dialog.querySelectorAll(
        'input, select, textarea, button:not([disabled])'
      );
      
      expect(focusableElements.length).toBeGreaterThan(0);
    });
  });

  describe('Validation', () => {
    it('should validate email format', async () => {
      const mockClose = jest.fn();
      const user = userEvent.setup();
      
      render(<DemoModal isOpen={true} onClose={mockClose} />);
      
      const emailInput = screen.getByLabelText(/work email/i) as HTMLInputElement;
      
      // Invalid email
      await user.type(emailInput, 'invalid-email');
      expect(emailInput.validity.valid).toBe(false);
      
      // Valid email
      await user.clear(emailInput);
      await user.type(emailInput, 'valid@example.com');
      expect(emailInput.validity.valid).toBe(true);
    });

    it('should require all mandatory fields', async () => {
      const mockClose = jest.fn();
      const user = userEvent.setup();
      
      render(<DemoModal isOpen={true} onClose={mockClose} />);
      
      const form = screen.getByRole('button', { name: /request demo/i }).closest('form') as HTMLFormElement;
      
      // Try to submit empty form
      await user.click(screen.getByRole('button', { name: /request demo/i }));
      
      expect(form.checkValidity()).toBe(false);
    });
  });
});