import { render, screen } from '../../test-utils';
import { EmptyState } from '@/app/_components/common/EmptyStates';
import userEvent from '@testing-library/user-event';
import { FileText, Users, Search } from 'lucide-react';

describe('EmptyState Component', () => {
  const user = userEvent.setup();

  it('renders with title and description', () => {
    render(
      <EmptyState
        title="No contracts found"
        description="Create your first contract to get started"
      />
    );

    expect(screen.getByText('No contracts found')).toBeInTheDocument();
    expect(screen.getByText('Create your first contract to get started')).toBeInTheDocument();
  });

  it('renders with custom icon', () => {
    render(
      <EmptyState
        title="No results"
        description="Try adjusting your search"
        icon={Search}
      />
    );

    expect(screen.getByTestId('empty-state-icon')).toBeInTheDocument();
  });

  it('renders with action button', async () => {
    const handleAction = jest.fn();
    
    render(
      <EmptyState
        title="No vendors"
        description="Add your first vendor"
        action={{
          label: 'Add Vendor',
          onClick: handleAction,
        }}
      />
    );

    const button = screen.getByRole('button', { name: 'Add Vendor' });
    expect(button).toBeInTheDocument();
    
    await user.click(button);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('renders with secondary action', async () => {
    const handlePrimary = jest.fn();
    const handleSecondary = jest.fn();
    
    render(
      <EmptyState
        title="No data"
        description="Import or create data"
        action={{
          label: 'Create New',
          onClick: handlePrimary,
        }}
        secondaryAction={{
          label: 'Import Data',
          onClick: handleSecondary,
        }}
      />
    );

    const primaryButton = screen.getByRole('button', { name: 'Create New' });
    const secondaryButton = screen.getByRole('button', { name: 'Import Data' });
    
    expect(primaryButton).toBeInTheDocument();
    expect(secondaryButton).toBeInTheDocument();
    
    await user.click(secondaryButton);
    expect(handleSecondary).toHaveBeenCalledTimes(1);
  });

  it('renders different variants', () => {
    const { rerender } = render(
      <EmptyState
        title="No results"
        description="Try different filters"
        variant="search"
      />
    );

    expect(screen.getByTestId('empty-state')).toHaveClass('bg-gray-50');

    rerender(
      <EmptyState
        title="Error"
        description="Something went wrong"
        variant="error"
      />
    );

    expect(screen.getByTestId('empty-state')).toHaveClass('bg-red-50');
  });

  it('renders with custom className', () => {
    render(
      <EmptyState
        title="Empty"
        description="Nothing here"
        className="custom-empty-state"
      />
    );

    expect(screen.getByTestId('empty-state')).toHaveClass('custom-empty-state');
  });

  it('renders with image', () => {
    render(
      <EmptyState
        title="No data"
        description="Upload your first file"
        image="/empty-state.svg"
      />
    );

    const image = screen.getByRole('img', { name: 'Empty state' });
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', '/empty-state.svg');
  });

  it('renders compact variant', () => {
    render(
      <EmptyState
        title="No items"
        description="Add items to see them here"
        size="compact"
      />
    );

    const container = screen.getByTestId('empty-state');
    expect(container).toHaveClass('py-6'); // Smaller padding for compact
  });

  it('handles action with icon', () => {
    render(
      <EmptyState
        title="No contracts"
        description="Create your first contract"
        action={{
          label: 'New Contract',
          onClick: jest.fn(),
          icon: FileText,
        }}
      />
    );

    const button = screen.getByRole('button', { name: 'New Contract' });
    const icon = button.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('renders with multiple suggestions', () => {
    render(
      <EmptyState
        title="No results found"
        description="Here are some suggestions:"
        suggestions={[
          'Check your spelling',
          'Try different keywords',
          'Remove some filters',
        ]}
      />
    );

    expect(screen.getByText('Check your spelling')).toBeInTheDocument();
    expect(screen.getByText('Try different keywords')).toBeInTheDocument();
    expect(screen.getByText('Remove some filters')).toBeInTheDocument();
  });

  it('handles disabled action button', () => {
    render(
      <EmptyState
        title="No access"
        description="You don't have permission"
        action={{
          label: 'Request Access',
          onClick: jest.fn(),
          disabled: true,
        }}
      />
    );

    const button = screen.getByRole('button', { name: 'Request Access' });
    expect(button).toBeDisabled();
  });

  it('renders with custom icon color', () => {
    render(
      <EmptyState
        title="No users"
        description="Invite team members"
        icon={Users}
        iconColor="text-blue-500"
      />
    );

    const icon = screen.getByTestId('empty-state-icon');
    expect(icon).toHaveClass('text-blue-500');
  });

  describe('Preset Empty States', () => {
    it('renders no contracts empty state', () => {
      render(<EmptyState preset="no-contracts" />);
      
      expect(screen.getByText('No contracts found')).toBeInTheDocument();
      expect(screen.getByText(/Create your first contract/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create Contract' })).toBeInTheDocument();
    });

    it('renders no search results empty state', () => {
      render(<EmptyState preset="no-search-results" />);
      
      expect(screen.getByText('No results found')).toBeInTheDocument();
      expect(screen.getByText(/Try adjusting your search/)).toBeInTheDocument();
    });

    it('renders error empty state', () => {
      render(<EmptyState preset="error" />);
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
    });
  });
});