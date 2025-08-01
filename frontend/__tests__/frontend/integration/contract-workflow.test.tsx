import { render, screen, waitFor, within } from '../test-utils';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import userEvent from '@testing-library/user-event';
import ContractsPage from '@/app/dashboard/contracts/page';
import NewContractPage from '@/app/dashboard/contracts/new/page';

// Mock the modules
jest.mock('next/navigation');
jest.mock('convex/react');

describe('Contract Creation Workflow Integration Test', () => {
  const user = userEvent.setup();
  const mockPush = jest.fn();
  const mockCreateContract = jest.fn();
  const mockListContracts = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      back: jest.fn(),
      refresh: jest.fn(),
    });

    (useQuery as jest.Mock).mockImplementation((path) => {
      if (path === 'api.contracts.list') {
        return mockListContracts();
      }
      if (path === 'api.vendors.list') {
        return [
          { _id: 'v1', name: 'Vendor One', status: 'active' },
          { _id: 'v2', name: 'Vendor Two', status: 'active' },
        ];
      }
      if (path === 'api.departments.list') {
        return [{ _id: 'd1', name: 'Engineering' }];
      }
      if (path === 'api.categories.list') {
        return [{ _id: 'c1', name: 'Software' }];
      }
      return null;
    });

    (useMutation as jest.Mock).mockImplementation((path) => {
      if (path === 'api.contracts.create') {
        return mockCreateContract;
      }
      return jest.fn();
    });
  });

  describe('Complete Contract Creation Flow', () => {
    it('navigates from empty contract list to create new contract', async () => {
      // Start with empty contract list
      mockListContracts.mockReturnValue([]);
      
      render(<ContractsPage />);
      
      // Should show empty state
      expect(screen.getByText(/no contracts found/i)).toBeInTheDocument();
      
      // Click create contract button
      const createButton = screen.getByRole('button', { name: /create contract/i });
      await user.click(createButton);
      
      // Should navigate to new contract page
      expect(mockPush).toHaveBeenCalledWith('/dashboard/contracts/new');
    });

    it('creates a new contract and returns to list', async () => {
      const newContract = {
        _id: 'new-contract-1',
        name: 'New Software License',
        number: 'CTR-2024-001',
        vendorId: 'v1',
        value: 25000,
        status: 'active',
      };
      
      mockCreateContract.mockResolvedValue(newContract);
      
      // Render new contract page
      render(<NewContractPage />);
      
      // Fill out the contract form
      await user.type(screen.getByLabelText(/contract name/i), 'New Software License');
      await user.type(screen.getByLabelText(/contract number/i), 'CTR-2024-001');
      await user.selectOptions(screen.getByLabelText(/vendor/i), 'v1');
      await user.selectOptions(screen.getByLabelText(/department/i), 'd1');
      await user.selectOptions(screen.getByLabelText(/category/i), 'c1');
      await user.type(screen.getByLabelText(/contract value/i), '25000');
      await user.type(screen.getByLabelText(/start date/i), '2024-01-01');
      await user.type(screen.getByLabelText(/end date/i), '2024-12-31');
      await user.type(screen.getByLabelText(/payment terms/i), 'Net 30');
      
      // Submit the form
      const submitButton = screen.getByRole('button', { name: /create contract/i });
      await user.click(submitButton);
      
      // Verify contract was created with correct data
      await waitFor(() => {
        expect(mockCreateContract).toHaveBeenCalledWith({
          name: 'New Software License',
          number: 'CTR-2024-001',
          vendorId: 'v1',
          departmentId: 'd1',
          categoryId: 'c1',
          value: 25000,
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          paymentTerms: 'Net 30',
          autoRenew: false,
          description: '',
          status: 'draft',
        });
      });
      
      // Should navigate back to contracts list
      expect(mockPush).toHaveBeenCalledWith('/dashboard/contracts');
    });

    it('shows the newly created contract in the list', async () => {
      // Mock contract list with the new contract
      mockListContracts.mockReturnValue([
        {
          _id: 'new-contract-1',
          _creationTime: Date.now(),
          name: 'New Software License',
          number: 'CTR-2024-001',
          vendorId: 'v1',
          value: 25000,
          status: 'active',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        },
      ]);
      
      render(<ContractsPage />);
      
      // Verify the contract appears in the list
      expect(screen.getByText('New Software License')).toBeInTheDocument();
      expect(screen.getByText('CTR-2024-001')).toBeInTheDocument();
      expect(screen.getByText('$25,000')).toBeInTheDocument();
      
      // Should not show empty state anymore
      expect(screen.queryByText(/no contracts found/i)).not.toBeInTheDocument();
    });
  });

  describe('Contract List Interactions', () => {
    beforeEach(() => {
      mockListContracts.mockReturnValue([
        {
          _id: 'contract-1',
          _creationTime: Date.now(),
          name: 'Annual Support Contract',
          number: 'CTR-2024-002',
          vendorId: 'v1',
          value: 50000,
          status: 'active',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        },
        {
          _id: 'contract-2',
          _creationTime: Date.now() - 86400000,
          name: 'Cloud Services Agreement',
          number: 'CTR-2024-003',
          vendorId: 'v2',
          value: 75000,
          status: 'pending',
          startDate: '2024-02-01',
          endDate: '2025-01-31',
        },
      ]);
    });

    it('filters contracts by search term', async () => {
      render(<ContractsPage />);
      
      // All contracts should be visible initially
      expect(screen.getByText('Annual Support Contract')).toBeInTheDocument();
      expect(screen.getByText('Cloud Services Agreement')).toBeInTheDocument();
      
      // Search for specific contract
      const searchInput = screen.getByPlaceholderText(/search contracts/i);
      await user.type(searchInput, 'Cloud');
      
      // Only matching contract should be visible
      await waitFor(() => {
        expect(screen.queryByText('Annual Support Contract')).not.toBeInTheDocument();
        expect(screen.getByText('Cloud Services Agreement')).toBeInTheDocument();
      });
    });

    it('filters contracts by status', async () => {
      render(<ContractsPage />);
      
      // Filter by pending status
      const statusFilter = screen.getByRole('combobox', { name: /status/i });
      await user.selectOptions(statusFilter, 'pending');
      
      // Only pending contracts should be visible
      await waitFor(() => {
        expect(screen.queryByText('Annual Support Contract')).not.toBeInTheDocument();
        expect(screen.getByText('Cloud Services Agreement')).toBeInTheDocument();
      });
    });

    it('sorts contracts by value', async () => {
      render(<ContractsPage />);
      
      // Click on value column header to sort
      const valueHeader = screen.getByRole('button', { name: /value/i });
      await user.click(valueHeader);
      
      // Check that contracts are sorted by value (descending by default)
      const contractRows = screen.getAllByTestId(/contract-row/);
      expect(contractRows[0]).toHaveTextContent('$75,000'); // Cloud Services
      expect(contractRows[1]).toHaveTextContent('$50,000'); // Annual Support
    });

    it('navigates to contract details on row click', async () => {
      render(<ContractsPage />);
      
      // Click on a contract row
      const contractRow = screen.getByText('Annual Support Contract').closest('tr');
      await user.click(contractRow!);
      
      // Should navigate to contract detail page
      expect(mockPush).toHaveBeenCalledWith('/dashboard/contracts/contract-1');
    });
  });

  describe('Error Handling', () => {
    it('shows error message when contract creation fails', async () => {
      mockCreateContract.mockRejectedValue(new Error('Network error'));
      
      render(<NewContractPage />);
      
      // Fill minimum required fields
      await user.type(screen.getByLabelText(/contract name/i), 'Test Contract');
      await user.type(screen.getByLabelText(/contract number/i), 'CTR-001');
      await user.selectOptions(screen.getByLabelText(/vendor/i), 'v1');
      await user.type(screen.getByLabelText(/contract value/i), '10000');
      await user.type(screen.getByLabelText(/start date/i), '2024-01-01');
      await user.type(screen.getByLabelText(/end date/i), '2024-12-31');
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /create contract/i });
      await user.click(submitButton);
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/failed to create contract/i)).toBeInTheDocument();
      });
      
      // Should not navigate away
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('shows error state when loading contracts fails', async () => {
      mockListContracts.mockImplementation(() => {
        throw new Error('Failed to load contracts');
      });
      
      render(<ContractsPage />);
      
      // Should show error message
      expect(screen.getByText(/failed to load contracts/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });

  describe('Performance Optimizations', () => {
    it('uses virtualized list for large datasets', async () => {
      // Create a large dataset
      const largeContractList = Array.from({ length: 100 }, (_, i) => ({
        _id: `contract-${i}`,
        _creationTime: Date.now() - i * 86400000,
        name: `Contract ${i}`,
        number: `CTR-2024-${String(i).padStart(3, '0')}`,
        vendorId: 'v1',
        value: Math.floor(Math.random() * 100000),
        status: i % 3 === 0 ? 'active' : i % 3 === 1 ? 'pending' : 'expired',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      }));
      
      mockListContracts.mockReturnValue(largeContractList);
      
      render(<ContractsPage />);
      
      // Should render virtualized list component
      expect(screen.getByTestId('virtualized-contract-list')).toBeInTheDocument();
      
      // Should only render visible items (not all 100)
      const renderedRows = screen.getAllByTestId(/contract-row/);
      expect(renderedRows.length).toBeLessThan(100);
    });
  });
});