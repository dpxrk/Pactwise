import { render, screen, waitFor } from '../../test-utils';
import { ContractTable } from '@/app/_components/contracts/ContractTable';
import { mockContract } from '../../test-utils';
import userEvent from '@testing-library/user-event';
import { useConvexQuery } from '@/lib/api-client';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/lib/api-client');

const mockContractsData = [
  {
    _id: 'contract-1',
    _creationTime: Date.now() - 86400000,
    title: 'Software License',
    contractNumber: 'CTR-001',
    vendorId: 'vendor-1',
    vendor: { _id: 'vendor-1', name: 'Tech Corp' },
    status: 'active',
    value: 50000,
    extractedEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    contractType: 'service',
    departmentId: 'dept-1',
    categoryId: 'cat-1',
    ownerId: 'user-1',
    description: 'Software license agreement',
    paymentTerms: 'Net 30',
    autoRenew: false,
  },
  {
    _id: 'contract-2',
    _creationTime: Date.now() - 172800000,
    title: 'Maintenance Agreement',
    contractNumber: 'CTR-002',
    vendorId: 'vendor-2',
    vendor: { _id: 'vendor-2', name: 'Service Pro' },
    status: 'pending',
    value: 25000,
    extractedEndDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days from now
    contractType: 'maintenance',
    departmentId: 'dept-1',
    categoryId: 'cat-2',
    ownerId: 'user-1',
    description: 'Annual maintenance agreement',
    paymentTerms: 'Net 45',
    autoRenew: true,
  },
  {
    _id: 'contract-3',
    _creationTime: Date.now() - 259200000,
    title: 'Consulting Services',
    contractNumber: 'CTR-003',
    vendorId: 'vendor-1',
    vendor: { _id: 'vendor-1', name: 'Tech Corp' },
    status: 'expired',
    value: 75000,
    extractedEndDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
    contractType: 'consulting',
    departmentId: 'dept-2',
    categoryId: 'cat-3',
    ownerId: 'user-2',
    description: 'Consulting services agreement',
    paymentTerms: 'Net 60',
    autoRenew: false,
  },
];

describe('ContractTable', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementation
    (useConvexQuery as jest.Mock).mockReturnValue({
      data: { contracts: mockContractsData },
      isLoading: false,
      error: null,
    });
  });

  it('renders contract data correctly', async () => {
    render(<ContractTable />);

    await waitFor(() => {
      // Check headers
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Vendor')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('End Date')).toBeInTheDocument();

      // Check contract data
      expect(screen.getByText('Software License')).toBeInTheDocument();
      expect(screen.getByText('CTR-001')).toBeInTheDocument();
      expect(screen.getByText('Tech Corp')).toBeInTheDocument();
      expect(screen.getByText('$50,000.00')).toBeInTheDocument();
    });
  });

  it('displays correct status badges', async () => {
    render(<ContractTable />);

    await waitFor(() => {
      const activeBadge = screen.getByText('Active');
      const pendingBadge = screen.getByText('Pending');
      const expiredBadge = screen.getByText('Expired');

      expect(activeBadge).toHaveClass('bg-green-100', 'text-green-800');
      expect(pendingBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
      expect(expiredBadge).toHaveClass('bg-red-100', 'text-red-800');
    });
  });

  it('filters contracts by search term', async () => {
    render(<ContractTable />);

    const searchInput = screen.getByPlaceholderText(/search contracts/i);
    await user.type(searchInput, 'Maintenance');

    await waitFor(() => {
      expect(screen.queryByText('Software License')).not.toBeInTheDocument();
      expect(screen.getByText('Maintenance Agreement')).toBeInTheDocument();
      expect(screen.queryByText('Consulting Services')).not.toBeInTheDocument();
    });
  });

  it('filters contracts by status', async () => {
    render(<ContractTable />);

    const statusFilter = screen.getByRole('combobox');
    await user.click(statusFilter);
    
    const activeOption = screen.getByText('Active', { selector: '[role="option"]' });
    await user.click(activeOption);

    await waitFor(() => {
      expect(screen.getByText('Software License')).toBeInTheDocument();
      expect(screen.queryByText('Maintenance Agreement')).not.toBeInTheDocument();
      expect(screen.queryByText('Consulting Services')).not.toBeInTheDocument();
    });
  });

  it('sorts contracts by clicking column headers', async () => {
    render(<ContractTable />);

    const valueHeader = screen.getByRole('button', { name: /sort by value/i });
    await user.click(valueHeader);

    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      // First row is header, so data starts at index 1
      expect(rows[1]).toHaveTextContent('Consulting Services'); // $75,000
      expect(rows[2]).toHaveTextContent('Software License'); // $50,000
      expect(rows[3]).toHaveTextContent('Maintenance Agreement'); // $25,000
    });
  });

  it('navigates to contract detail on row click', async () => {
    const mockPush = jest.fn();
    jest.mocked(require('next/navigation').useRouter).mockReturnValue({
      push: mockPush,
    });

    render(<ContractTable />);

    await waitFor(() => {
      const contractRow = screen.getByText('Software License').closest('tr');
      expect(contractRow).toBeInTheDocument();
    });

    const contractRow = screen.getByText('Software License').closest('tr');
    await user.click(contractRow!);

    expect(mockPush).toHaveBeenCalledWith('/dashboard/contracts/contract-1');
  });

  it('handles pagination', async () => {
    // Create a large dataset
    const manyContracts = Array.from({ length: 25 }, (_, i) => ({
      _id: `contract-${i}`,
      _creationTime: Date.now() - i * 86400000,
      title: `Contract ${i}`,
      contractNumber: `CTR-${String(i).padStart(3, '0')}`,
      vendorId: 'vendor-1',
      vendor: { _id: 'vendor-1', name: 'Tech Corp' },
      status: 'active',
      value: 10000 + i * 1000,
      extractedEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      contractType: 'service',
    }));

    (useConvexQuery as jest.Mock).mockReturnValue({
      data: { contracts: manyContracts },
      isLoading: false,
      error: null,
    });

    render(<ContractTable pageSize={10} />);

    await waitFor(() => {
      // Should show first 10 contracts
      expect(screen.getByText('Contract 0')).toBeInTheDocument();
      expect(screen.getByText('Contract 9')).toBeInTheDocument();
      expect(screen.queryByText('Contract 10')).not.toBeInTheDocument();

      // Should show pagination info
      expect(screen.getByText(/1-10 of 25/i)).toBeInTheDocument();
    });

    // Click next page
    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.queryByText('Contract 0')).not.toBeInTheDocument();
      expect(screen.getByText('Contract 10')).toBeInTheDocument();
      expect(screen.getByText('Contract 19')).toBeInTheDocument();
    });
  });

  it('shows empty state when no contracts', async () => {
    (useConvexQuery as jest.Mock).mockReturnValue({
      data: { contracts: [] },
      isLoading: false,
      error: null,
    });

    render(<ContractTable />);

    await waitFor(() => {
      expect(screen.getByText(/no contracts found/i)).toBeInTheDocument();
      expect(screen.getByText(/get started by creating your first contract/i)).toBeInTheDocument();
    });
  });

  it('shows loading state', () => {
    (useConvexQuery as jest.Mock).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    render(<ContractTable />);

    expect(screen.getByTestId('table-skeleton')).toBeInTheDocument();
  });

  it('shows error state when loading fails', async () => {
    (useConvexQuery as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to load contracts'),
    });

    render(<ContractTable />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load contracts/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });

  it('highlights contracts expiring soon', async () => {
    const contractsWithExpiry = [
      {
        ...mockContractsData[0],
        extractedEndDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days
      },
    ];

    (useConvexQuery as jest.Mock).mockReturnValue({
      data: { contracts: contractsWithExpiry },
      isLoading: false,
      error: null,
    });

    render(<ContractTable />);

    await waitFor(() => {
      const contractRow = screen.getByText('Software License').closest('tr');
      expect(contractRow).toHaveClass('bg-yellow-50');
      
      // Should show warning icon
      expect(screen.getByTestId('expiry-warning')).toBeInTheDocument();
    });
  });

  it('allows selecting contracts when onContractSelect is provided', async () => {
    const mockOnSelect = jest.fn();
    
    render(<ContractTable onContractSelect={mockOnSelect} />);

    await waitFor(() => {
      const selectButton = screen.getAllByRole('button', { name: /select/i })[0];
      expect(selectButton).toBeInTheDocument();
    });

    const selectButton = screen.getAllByRole('button', { name: /select/i })[0];
    await user.click(selectButton);

    expect(mockOnSelect).toHaveBeenCalledWith('contract-1');
  });

  it('respects status filter prop', async () => {
    render(<ContractTable statusFilter="active" />);

    await waitFor(() => {
      expect(screen.getByText('Software License')).toBeInTheDocument();
      expect(screen.queryByText('Maintenance Agreement')).not.toBeInTheDocument();
      expect(screen.queryByText('Consulting Services')).not.toBeInTheDocument();
    });
  });

  it('handles real-time updates', async () => {
    const { rerender } = render(<ContractTable />);

    await waitFor(() => {
      expect(screen.getByText('Software License')).toBeInTheDocument();
    });

    // Simulate real-time update
    const updatedContracts = [
      ...mockContractsData,
      {
        _id: 'contract-4',
        _creationTime: Date.now(),
        title: 'New Contract',
        contractNumber: 'CTR-004',
        vendorId: 'vendor-1',
        vendor: { _id: 'vendor-1', name: 'Tech Corp' },
        status: 'draft',
        value: 30000,
        extractedEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        contractType: 'service',
      },
    ];

    (useConvexQuery as jest.Mock).mockReturnValue({
      data: { contracts: updatedContracts },
      isLoading: false,
      error: null,
    });

    rerender(<ContractTable />);

    await waitFor(() => {
      expect(screen.getByText('New Contract')).toBeInTheDocument();
    });
  });
});