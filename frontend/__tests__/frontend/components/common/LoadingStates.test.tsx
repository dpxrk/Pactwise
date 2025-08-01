import { render, screen } from '../../test-utils';
import { 
  LoadingSpinner, 
  LoadingCard, 
  LoadingSkeleton,
  FullPageLoader 
} from '@/app/_components/common/LoadingStates';

describe('LoadingStates Components', () => {
  describe('LoadingSpinner', () => {
    it('renders with default size', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('.relative');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('w-10', 'h-10'); // md size
    });

    it('renders with custom size', () => {
      const { container } = render(<LoadingSpinner size="lg" />);
      const spinner = container.querySelector('.relative');
      expect(spinner).toHaveClass('w-16', 'h-16');
    });

    it('renders with custom className', () => {
      const { container } = render(<LoadingSpinner className="text-blue-500" />);
      const spinner = container.querySelector('.relative');
      expect(spinner).toHaveClass('text-blue-500');
    });

    it('has spinning animation elements', () => {
      const { container } = render(<LoadingSpinner />);
      const spinElements = container.querySelectorAll('.animate-spin');
      expect(spinElements).toHaveLength(2);
    });
  });

  describe('LoadingCard', () => {
    it('renders with default message', () => {
      render(<LoadingCard />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders with custom message', () => {
      render(<LoadingCard message="Fetching data..." />);
      expect(screen.getByText('Fetching data...')).toBeInTheDocument();
    });

    it('includes a spinner', () => {
      render(<LoadingCard />);
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('applies proper styling', () => {
      render(<LoadingCard />);
      const card = screen.getByTestId('loading-card');
      expect(card).toHaveClass('rounded-lg', 'border', 'p-8');
    });
  });

  describe('LoadingSkeleton', () => {
    it('renders skeleton lines', () => {
      render(<LoadingSkeleton lines={3} />);
      const skeletons = screen.getAllByTestId('skeleton-line');
      expect(skeletons).toHaveLength(3);
    });

    it('applies animation to skeleton lines', () => {
      render(<LoadingSkeleton lines={1} />);
      const skeleton = screen.getByTestId('skeleton-line');
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('varies skeleton line widths', () => {
      render(<LoadingSkeleton lines={4} />);
      const skeletons = screen.getAllByTestId('skeleton-line');
      
      // Check that different lines have different widths
      const widths = skeletons.map(el => el.className);
      const uniqueWidths = new Set(widths);
      expect(uniqueWidths.size).toBeGreaterThan(1);
    });

    it('renders with custom className', () => {
      render(<LoadingSkeleton lines={1} className="custom-class" />);
      const container = screen.getByTestId('loading-skeleton');
      expect(container).toHaveClass('custom-class');
    });

    it('renders table skeleton variant', () => {
      render(<LoadingSkeleton variant="table" rows={5} columns={4} />);
      const rows = screen.getAllByTestId('skeleton-row');
      expect(rows).toHaveLength(5);
      
      const firstRowCells = rows[0].querySelectorAll('[data-testid="skeleton-cell"]');
      expect(firstRowCells).toHaveLength(4);
    });

    it('renders card skeleton variant', () => {
      render(<LoadingSkeleton variant="card" />);
      const card = screen.getByTestId('skeleton-card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('rounded-lg', 'border');
    });
  });

  describe('FullPageLoader', () => {
    it('renders full page overlay', () => {
      render(<FullPageLoader />);
      const overlay = screen.getByTestId('full-page-loader');
      expect(overlay).toHaveClass('fixed', 'inset-0', 'z-50');
    });

    it('renders with default message', () => {
      render(<FullPageLoader />);
      expect(screen.getByText('Loading application...')).toBeInTheDocument();
    });

    it('renders with custom message', () => {
      render(<FullPageLoader message="Please wait..." />);
      expect(screen.getByText('Please wait...')).toBeInTheDocument();
    });

    it('includes loading spinner', () => {
      render(<FullPageLoader />);
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('has backdrop blur effect', () => {
      render(<FullPageLoader />);
      const overlay = screen.getByTestId('full-page-loader');
      expect(overlay).toHaveClass('backdrop-blur-sm');
    });

    it('centers content', () => {
      render(<FullPageLoader />);
      const content = screen.getByTestId('loader-content');
      expect(content).toHaveClass('flex', 'items-center', 'justify-center');
    });
  });

  describe('Integration', () => {
    it('can compose multiple loading states', () => {
      const { container } = render(
        <div>
          <LoadingSpinner />
          <LoadingCard message="Loading content..." />
          <LoadingSkeleton lines={3} />
        </div>
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText('Loading content...')).toBeInTheDocument();
      expect(screen.getAllByTestId('skeleton-line')).toHaveLength(3);
    });
  });
});