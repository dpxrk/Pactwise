import { render, screen, waitFor } from '../../test-utils';
import { VendorList } from '@/app/_components/vendors/VendorList';
import { mockVendor } from '../../test-utils';
import userEvent from '@testing-library/user-event';

const mockVendors = [
  mockVendor({
    _id: 'vendor-1',
    name: 'Tech Solutions Inc',
    category: 'Technology',
    performanceScore: 92,
    totalSpend: 150000,
    activeContracts: 3,
    status: 'active',
  }),
  mockVendor({
    _id: 'vendor-2',
    name: 'Marketing Pro Agency',
    category: 'Marketing',
    performanceScore: 78,
    totalSpend: 85000,
    activeContracts: 2,
    status: 'active',
  }),
  mockVendor({
    _id: 'vendor-3',
    name: 'Inactive Vendor',
    category: 'Other',
    performanceScore: 65,
    totalSpend: 0,
    activeContracts: 0,
    status: 'inactive',
  }),
];

describe('VendorList', () => {
  const user = userEvent.setup();
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnViewDetails = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders vendor cards in grid layout', () => {
    render(
      <VendorList
        vendors={mockVendors}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Tech Solutions Inc')).toBeInTheDocument();
    expect(screen.getByText('Marketing Pro Agency')).toBeInTheDocument();
    expect(screen.getByText('Inactive Vendor')).toBeInTheDocument();
  });

  it('displays vendor metrics correctly', () => {
    render(
      <VendorList
        vendors={mockVendors}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    // Performance scores
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText('78%')).toBeInTheDocument();

    // Total spend
    expect(screen.getByText('$150,000')).toBeInTheDocument();
    expect(screen.getByText('$85,000')).toBeInTheDocument();

    // Active contracts
    expect(screen.getByText('3 Contracts')).toBeInTheDocument();
    expect(screen.getByText('2 Contracts')).toBeInTheDocument();
  });

  it('shows performance score with correct color coding', () => {
    render(
      <VendorList
        vendors={mockVendors}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const highScore = screen.getByTestId('performance-score-vendor-1');
    const mediumScore = screen.getByTestId('performance-score-vendor-2');
    const lowScore = screen.getByTestId('performance-score-vendor-3');

    expect(highScore).toHaveClass('text-green-600');
    expect(mediumScore).toHaveClass('text-yellow-600');
    expect(lowScore).toHaveClass('text-red-600');
  });

  it('filters vendors by search term', async () => {
    render(
      <VendorList
        vendors={mockVendors}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search vendors/i);
    await user.type(searchInput, 'Tech');

    expect(screen.getByText('Tech Solutions Inc')).toBeInTheDocument();
    expect(screen.queryByText('Marketing Pro Agency')).not.toBeInTheDocument();
    expect(screen.queryByText('Inactive Vendor')).not.toBeInTheDocument();
  });

  it('filters vendors by category', async () => {
    render(
      <VendorList
        vendors={mockVendors}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const categoryFilter = screen.getByRole('combobox', { name: /filter by category/i });
    await user.selectOptions(categoryFilter, 'Marketing');

    expect(screen.queryByText('Tech Solutions Inc')).not.toBeInTheDocument();
    expect(screen.getByText('Marketing Pro Agency')).toBeInTheDocument();
    expect(screen.queryByText('Inactive Vendor')).not.toBeInTheDocument();
  });

  it('filters vendors by status', async () => {
    render(
      <VendorList
        vendors={mockVendors}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const statusFilter = screen.getByRole('combobox', { name: /filter by status/i });
    await user.selectOptions(statusFilter, 'inactive');

    expect(screen.queryByText('Tech Solutions Inc')).not.toBeInTheDocument();
    expect(screen.queryByText('Marketing Pro Agency')).not.toBeInTheDocument();
    expect(screen.getByText('Inactive Vendor')).toBeInTheDocument();
  });

  it('sorts vendors by different criteria', async () => {
    render(
      <VendorList
        vendors={mockVendors}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const sortSelect = screen.getByRole('combobox', { name: /sort by/i });
    await user.selectOptions(sortSelect, 'performance');

    const vendorCards = screen.getAllByTestId(/vendor-card/);
    expect(vendorCards[0]).toHaveTextContent('Tech Solutions Inc'); // Highest performance
    expect(vendorCards[1]).toHaveTextContent('Marketing Pro Agency');
    expect(vendorCards[2]).toHaveTextContent('Inactive Vendor'); // Lowest performance
  });

  it('handles vendor card click', async () => {
    render(
      <VendorList
        vendors={mockVendors}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onViewDetails={mockOnViewDetails}
      />
    );

    const vendorCard = screen.getByTestId('vendor-card-vendor-1');
    await user.click(vendorCard);

    expect(mockOnViewDetails).toHaveBeenCalledWith('vendor-1');
  });

  it('handles edit action', async () => {
    render(
      <VendorList
        vendors={mockVendors}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const editButton = screen.getAllByRole('button', { name: /edit/i })[0];
    await user.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledWith('vendor-1');
  });

  it('handles delete action with confirmation', async () => {
    window.confirm = jest.fn(() => true);

    render(
      <VendorList
        vendors={mockVendors}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
    await user.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete this vendor?'
    );
    expect(mockOnDelete).toHaveBeenCalledWith('vendor-1');
  });

  it('shows empty state when no vendors', () => {
    render(
      <VendorList
        vendors={[]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText(/no vendors found/i)).toBeInTheDocument();
    expect(screen.getByText(/add your first vendor/i)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <VendorList
        vendors={mockVendors}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isLoading
      />
    );

    expect(screen.getAllByTestId('vendor-skeleton')).toHaveLength(6); // Default skeleton count
  });

  it('toggles between grid and list view', async () => {
    render(
      <VendorList
        vendors={mockVendors}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const listViewButton = screen.getByRole('button', { name: /list view/i });
    await user.click(listViewButton);

    expect(screen.getByTestId('vendor-list-container')).toHaveClass('space-y-4');

    const gridViewButton = screen.getByRole('button', { name: /grid view/i });
    await user.click(gridViewButton);

    expect(screen.getByTestId('vendor-list-container')).toHaveClass('grid');
  });

  it('displays vendor badges correctly', () => {
    const vendorsWithBadges = [
      mockVendor({
        _id: 'vendor-premium',
        name: 'Premium Vendor',
        isPremium: true,
        isVerified: true,
      }),
    ];

    render(
      <VendorList
        vendors={vendorsWithBadges}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByTestId('premium-badge')).toBeInTheDocument();
    expect(screen.getByTestId('verified-badge')).toBeInTheDocument();
  });

  it('handles bulk selection', async () => {
    render(
      <VendorList
        vendors={mockVendors}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        enableBulkActions
      />
    );

    const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all/i });
    await user.click(selectAllCheckbox);

    expect(screen.getByText(/3 vendors selected/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bulk delete/i })).toBeInTheDocument();
  });

  it('exports vendor data', async () => {
    const mockExport = jest.fn();
    
    render(
      <VendorList
        vendors={mockVendors}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onExport={mockExport}
      />
    );

    const exportButton = screen.getByRole('button', { name: /export/i });
    await user.click(exportButton);

    const csvOption = screen.getByRole('menuitem', { name: /csv/i });
    await user.click(csvOption);

    expect(mockExport).toHaveBeenCalledWith('csv', mockVendors);
  });

  it('shows performance trend indicators', () => {
    const vendorsWithTrends = [
      mockVendor({
        _id: 'vendor-1',
        name: 'Improving Vendor',
        performanceScore: 85,
        performanceTrend: 'up',
      }),
      mockVendor({
        _id: 'vendor-2',
        name: 'Declining Vendor',
        performanceScore: 70,
        performanceTrend: 'down',
      }),
    ];

    render(
      <VendorList
        vendors={vendorsWithTrends}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByTestId('trend-up-vendor-1')).toBeInTheDocument();
    expect(screen.getByTestId('trend-down-vendor-2')).toBeInTheDocument();
  });
});