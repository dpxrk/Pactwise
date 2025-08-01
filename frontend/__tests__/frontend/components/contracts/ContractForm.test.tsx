import { render, screen, waitFor } from '../../test-utils';
import { ContractForm } from '@/app/_components/contracts/ContractForm';
import { useConvexQuery, useConvexMutation } from '@/lib/api-client';
import userEvent from '@testing-library/user-event';

jest.mock('@/lib/api-client');

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

const mockVendors = [
  { _id: 'vendor-1', name: 'Vendor One', status: 'active' },
  { _id: 'vendor-2', name: 'Vendor Two', status: 'active' },
];

const mockDepartments = [
  { _id: 'dept-1', name: 'IT Department' },
  { _id: 'dept-2', name: 'HR Department' },
];

const mockCategories = [
  { _id: 'cat-1', name: 'Software' },
  { _id: 'cat-2', name: 'Services' },
];

describe('ContractForm', () => {
  const mockCreateContract = jest.fn();
  const mockUpdateContract = jest.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    (useQuery as jest.Mock).mockImplementation((path) => {
      if (path === 'api.vendors.list') return mockVendors;
      if (path === 'api.departments.list') return mockDepartments;
      if (path === 'api.categories.list') return mockCategories;
      return null;
    });
    (useMutation as jest.Mock).mockImplementation((path) => {
      if (path === 'api.contracts.create') return mockCreateContract;
      if (path === 'api.contracts.update') return mockUpdateContract;
      return jest.fn();
    });
  });

  describe('Create Mode', () => {
    it('renders all form fields', () => {
      render(<ContractForm mode="create" />);
      
      expect(screen.getByLabelText(/contract name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/contract number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/vendor/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/department/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/contract value/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/payment terms/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/auto-renewal/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    it('validates required fields', async () => {
      render(<ContractForm mode="create" />);
      
      const submitButton = screen.getByRole('button', { name: /create contract/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/contract name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/contract number is required/i)).toBeInTheDocument();
        expect(screen.getByText(/vendor is required/i)).toBeInTheDocument();
        expect(screen.getByText(/contract value is required/i)).toBeInTheDocument();
      });
    });

    it('validates contract value is positive', async () => {
      render(<ContractForm mode="create" />);
      
      const valueInput = screen.getByLabelText(/contract value/i);
      await user.type(valueInput, '-100');
      
      const submitButton = screen.getByRole('button', { name: /create contract/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/value must be greater than 0/i)).toBeInTheDocument();
      });
    });

    it('validates end date is after start date', async () => {
      render(<ContractForm mode="create" />);
      
      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);
      
      await user.type(startDateInput, '2024-12-31');
      await user.type(endDateInput, '2024-01-01');
      
      const submitButton = screen.getByRole('button', { name: /create contract/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/end date must be after start date/i)).toBeInTheDocument();
      });
    });

    it('submits form with valid data', async () => {
      mockCreateContract.mockResolvedValue({ success: true });
      const router = require('next/navigation').useRouter();
      
      render(<ContractForm mode="create" />);
      
      // Fill in form fields
      await user.type(screen.getByLabelText(/contract name/i), 'Test Contract');
      await user.type(screen.getByLabelText(/contract number/i), 'CTR-001');
      await user.selectOptions(screen.getByLabelText(/vendor/i), 'vendor-1');
      await user.selectOptions(screen.getByLabelText(/department/i), 'dept-1');
      await user.selectOptions(screen.getByLabelText(/category/i), 'cat-1');
      await user.type(screen.getByLabelText(/contract value/i), '10000');
      await user.type(screen.getByLabelText(/start date/i), '2024-01-01');
      await user.type(screen.getByLabelText(/end date/i), '2024-12-31');
      await user.type(screen.getByLabelText(/payment terms/i), 'Net 30');
      await user.click(screen.getByLabelText(/auto-renewal/i));
      await user.type(screen.getByLabelText(/description/i), 'Test description');
      
      const submitButton = screen.getByRole('button', { name: /create contract/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockCreateContract).toHaveBeenCalledWith({
          name: 'Test Contract',
          number: 'CTR-001',
          vendorId: 'vendor-1',
          departmentId: 'dept-1',
          categoryId: 'cat-1',
          value: 10000,
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          paymentTerms: 'Net 30',
          autoRenew: true,
          description: 'Test description',
          status: 'draft',
        });
        expect(router.push).toHaveBeenCalledWith('/dashboard/contracts');
      });
    });
  });

  describe('Edit Mode', () => {
    const existingContract = {
      _id: 'contract-123',
      name: 'Existing Contract',
      number: 'CTR-123',
      vendorId: 'vendor-1',
      departmentId: 'dept-1',
      categoryId: 'cat-1',
      value: 50000,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      paymentTerms: 'Net 60',
      autoRenew: true,
      description: 'Existing description',
      status: 'active',
    };

    it('populates form with existing contract data', () => {
      render(<ContractForm mode="edit" contract={existingContract} />);
      
      expect(screen.getByDisplayValue('Existing Contract')).toBeInTheDocument();
      expect(screen.getByDisplayValue('CTR-123')).toBeInTheDocument();
      expect(screen.getByDisplayValue('50000')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Net 60')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Existing description')).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /auto-renewal/i })).toBeChecked();
    });

    it('updates contract with changed data', async () => {
      mockUpdateContract.mockResolvedValue({ success: true });
      const router = require('next/navigation').useRouter();
      
      render(<ContractForm mode="edit" contract={existingContract} />);
      
      // Update some fields
      const nameInput = screen.getByLabelText(/contract name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Contract');
      
      const valueInput = screen.getByLabelText(/contract value/i);
      await user.clear(valueInput);
      await user.type(valueInput, '75000');
      
      const submitButton = screen.getByRole('button', { name: /update contract/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockUpdateContract).toHaveBeenCalledWith({
          id: 'contract-123',
          updates: expect.objectContaining({
            name: 'Updated Contract',
            value: 75000,
          }),
        });
        expect(router.push).toHaveBeenCalledWith('/dashboard/contracts/contract-123');
      });
    });
  });

  it('handles submission errors gracefully', async () => {
    mockCreateContract.mockRejectedValue(new Error('Failed to create contract'));
    
    render(<ContractForm mode="create" />);
    
    // Fill minimum required fields
    await user.type(screen.getByLabelText(/contract name/i), 'Test Contract');
    await user.type(screen.getByLabelText(/contract number/i), 'CTR-001');
    await user.selectOptions(screen.getByLabelText(/vendor/i), 'vendor-1');
    await user.type(screen.getByLabelText(/contract value/i), '10000');
    await user.type(screen.getByLabelText(/start date/i), '2024-01-01');
    await user.type(screen.getByLabelText(/end date/i), '2024-12-31');
    
    const submitButton = screen.getByRole('button', { name: /create contract/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/failed to create contract/i)).toBeInTheDocument();
    });
  });

  it('disables form during submission', async () => {
    mockCreateContract.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(<ContractForm mode="create" />);
    
    // Fill minimum required fields
    await user.type(screen.getByLabelText(/contract name/i), 'Test Contract');
    await user.type(screen.getByLabelText(/contract number/i), 'CTR-001');
    await user.selectOptions(screen.getByLabelText(/vendor/i), 'vendor-1');
    await user.type(screen.getByLabelText(/contract value/i), '10000');
    await user.type(screen.getByLabelText(/start date/i), '2024-01-01');
    await user.type(screen.getByLabelText(/end date/i), '2024-12-31');
    
    const submitButton = screen.getByRole('button', { name: /create contract/i });
    await user.click(submitButton);
    
    expect(submitButton).toBeDisabled();
    expect(screen.getByText(/creating.../i)).toBeInTheDocument();
  });
});