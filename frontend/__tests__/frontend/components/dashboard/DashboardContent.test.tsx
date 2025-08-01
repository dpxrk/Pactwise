import { render, screen, waitFor } from '../../test-utils';
import { DashboardContent } from '@/app/_components/dashboard/DashboardContent';
import { useQuery } from 'convex/react';

// Mock the useQuery hook
jest.mock('convex/react', () => ({
  ...jest.requireActual('convex/react'),
  useQuery: jest.fn(),
}));

const mockDashboardData = {
  stats: {
    totalContracts: 42,
    activeContracts: 35,
    totalValue: 1234567,
    upcomingRenewals: 7,
    totalVendors: 15,
    totalSavings: 98765,
  },
  recentActivity: [
    {
      _id: 'activity-1',
      _creationTime: Date.now() - 3600000,
      type: 'contract_created',
      message: 'New contract created: Test Contract',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      _id: 'activity-2',
      _creationTime: Date.now() - 7200000,
      type: 'contract_renewed',
      message: 'Contract renewed: Another Contract',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
    },
  ],
  alerts: [
    {
      _id: 'alert-1',
      _creationTime: Date.now(),
      type: 'renewal',
      severity: 'warning',
      message: 'Contract expiring in 30 days',
      contractId: 'contract-1',
    },
  ],
};

describe('DashboardContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (useQuery as jest.Mock).mockReturnValue(undefined);
    
    render(<DashboardContent />);
    
    expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
  });

  it('renders dashboard stats when data is loaded', async () => {
    (useQuery as jest.Mock).mockReturnValue(mockDashboardData);
    
    render(<DashboardContent />);
    
    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('Total Contracts')).toBeInTheDocument();
      expect(screen.getByText('35')).toBeInTheDocument();
      expect(screen.getByText('Active Contracts')).toBeInTheDocument();
      expect(screen.getByText('$1,234,567')).toBeInTheDocument();
      expect(screen.getByText('Total Value')).toBeInTheDocument();
    });
  });

  it('renders recent activity section', async () => {
    (useQuery as jest.Mock).mockReturnValue(mockDashboardData);
    
    render(<DashboardContent />);
    
    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      expect(screen.getByText('New contract created: Test Contract')).toBeInTheDocument();
      expect(screen.getByText('Contract renewed: Another Contract')).toBeInTheDocument();
    });
  });

  it('renders alerts section when alerts exist', async () => {
    (useQuery as jest.Mock).mockReturnValue(mockDashboardData);
    
    render(<DashboardContent />);
    
    await waitFor(() => {
      expect(screen.getByText('Alerts')).toBeInTheDocument();
      expect(screen.getByText('Contract expiring in 30 days')).toBeInTheDocument();
    });
  });

  it('handles empty state gracefully', async () => {
    (useQuery as jest.Mock).mockReturnValue({
      stats: {
        totalContracts: 0,
        activeContracts: 0,
        totalValue: 0,
        upcomingRenewals: 0,
        totalVendors: 0,
        totalSavings: 0,
      },
      recentActivity: [],
      alerts: [],
    });
    
    render(<DashboardContent />);
    
    await waitFor(() => {
      expect(screen.getByText('No recent activity')).toBeInTheDocument();
      expect(screen.queryByText('Alerts')).not.toBeInTheDocument();
    });
  });

  it('handles error state', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    (useQuery as jest.Mock).mockImplementation(() => {
      throw new Error('Failed to fetch dashboard data');
    });
    
    render(<DashboardContent />);
    
    await waitFor(() => {
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    });
    
    consoleError.mockRestore();
  });

  it('formats currency values correctly', async () => {
    (useQuery as jest.Mock).mockReturnValue({
      ...mockDashboardData,
      stats: {
        ...mockDashboardData.stats,
        totalValue: 9999999.99,
        totalSavings: 1234.56,
      },
    });
    
    render(<DashboardContent />);
    
    await waitFor(() => {
      expect(screen.getByText('$9,999,999.99')).toBeInTheDocument();
      expect(screen.getByText('$1,234.56')).toBeInTheDocument();
    });
  });

  it('displays correct icons for different activity types', async () => {
    (useQuery as jest.Mock).mockReturnValue({
      ...mockDashboardData,
      recentActivity: [
        {
          _id: 'activity-1',
          _creationTime: Date.now(),
          type: 'contract_created',
          message: 'Contract created',
          timestamp: new Date().toISOString(),
        },
        {
          _id: 'activity-2',
          _creationTime: Date.now(),
          type: 'contract_updated',
          message: 'Contract updated',
          timestamp: new Date().toISOString(),
        },
        {
          _id: 'activity-3',
          _creationTime: Date.now(),
          type: 'vendor_added',
          message: 'Vendor added',
          timestamp: new Date().toISOString(),
        },
      ],
    });
    
    render(<DashboardContent />);
    
    await waitFor(() => {
      expect(screen.getByTestId('icon-contract-created')).toBeInTheDocument();
      expect(screen.getByTestId('icon-contract-updated')).toBeInTheDocument();
      expect(screen.getByTestId('icon-vendor-added')).toBeInTheDocument();
    });
  });
});