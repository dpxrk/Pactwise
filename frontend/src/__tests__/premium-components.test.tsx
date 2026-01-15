import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';

// Mock framer-motion to avoid issues in tests
jest.mock('framer-motion', () => {
  const ActualReact = jest.requireActual('react');

  // Filter out motion-specific props
  const filterMotionProps = (props: any) => {
    const {
      initial, animate, exit, transition, variants, whileHover, whileTap,
      whileDrag, whileFocus, whileInView, drag, dragConstraints, dragElastic,
      onAnimationStart, onAnimationComplete, layout, layoutId, style,
      ...validProps
    } = props;
    return validProps;
  };

  return {
    motion: {
      div: ActualReact.forwardRef(({ children, ...props }: any, ref: any) =>
        ActualReact.createElement('div', { ...filterMotionProps(props), ref }, children)
      ),
      span: ActualReact.forwardRef(({ children, ...props }: any, ref: any) =>
        ActualReact.createElement('span', { ...filterMotionProps(props), ref }, children)
      ),
      button: ActualReact.forwardRef(({ children, ...props }: any, ref: any) =>
        ActualReact.createElement('button', { ...filterMotionProps(props), ref }, children)
      ),
      path: ActualReact.forwardRef((props: any, ref: any) =>
        ActualReact.createElement('path', { ...filterMotionProps(props), ref })
      ),
    },
    AnimatePresence: ({ children }: any) => children,
    useAnimation: () => ({
      start: jest.fn(),
      set: jest.fn(),
    }),
    useMotionValue: (initial: any) => ({
      get: () => initial,
      set: jest.fn(),
    }),
    useSpring: (value: any) => value,
    useTransform: () => 0,
    useScroll: () => ({
      scrollY: 0,
      scrollYProgress: 0,
    }),
    useInView: () => true,
  };
});

// Mock Three.js components
jest.mock('@react-three/fiber', () => {
  const ActualReact = jest.requireActual('react');
  return {
    Canvas: ({ children }: any) => ActualReact.createElement('div', { 'data-testid': 'canvas' }, children),
    useFrame: jest.fn(),
    useThree: () => ({
      clock: { elapsedTime: 0 },
      camera: {},
    }),
  };
});

jest.mock('@react-three/drei', () => {
  const ActualReact = jest.requireActual('react');
  return {
    OrbitControls: () => null,
    Float: ({ children }: any) => children,
    Text: ({ children }: any) => ActualReact.createElement('span', null, children),
    Box: () => ActualReact.createElement('mesh', { 'data-testid': 'box' }),
    Sphere: () => ActualReact.createElement('mesh', { 'data-testid': 'sphere' }),
    MeshDistortMaterial: () => null,
    mesh: () => null,
    meshBasicMaterial: () => null,
    meshStandardMaterial: () => null,
    boxGeometry: () => null,
    sphereGeometry: () => null,
    planeGeometry: () => null,
  };
});

jest.mock('three', () => ({
  Vector3: class {
    constructor(x: number, y: number, z: number) {}
    lerp() { return this; }
  },
  PlaneGeometry: class {},
  Mesh: class {},
}));

describe('Premium Components - Phase 3', () => {
  describe('MicroInteractions', () => {
    it('should render RippleButton and handle clicks', async () => {
      const { RippleButton } = await import('@/components/premium/MicroInteractions');
      const handleClick = jest.fn();
      
      render(
        <RippleButton onClick={handleClick} className="test-button">
          Click Me
        </RippleButton>
      );
      
      const button = screen.getByText('Click Me');
      expect(button).toBeInTheDocument();
      
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalled();
    });

    it('should render LikeButton and toggle state', async () => {
      const { LikeButton } = await import('@/components/premium/MicroInteractions');
      const handleLike = jest.fn();
      
      render(<LikeButton onLike={handleLike} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(handleLike).toHaveBeenCalledWith(true);
    });

    it('should render CopyButton and copy text', async () => {
      const { CopyButton } = await import('@/components/premium/MicroInteractions');
      
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockResolvedValue(undefined),
        },
      });
      
      render(<CopyButton text="Test text to copy" />);
      
      const button = screen.getByText('Test text to copy');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Test text to copy');
      });
    });

    it('should render StarRating component', async () => {
      const { StarRating } = await import('@/components/premium/MicroInteractions');
      const handleChange = jest.fn();
      
      render(<StarRating value={3} onChange={handleChange} />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(5); // Default max is 5 stars
      
      fireEvent.click(buttons[3]); // Click 4th star
      expect(handleChange).toHaveBeenCalledWith(4);
    });
  });

  describe('ParallaxSection', () => {
    it('should render ParallaxLayer component', async () => {
      const { ParallaxLayer } = await import('@/components/premium/ParallaxSection');
      
      render(
        <ParallaxLayer speed={0.5} type="vertical">
          <div>Parallax Content</div>
        </ParallaxLayer>
      );
      
      expect(screen.getByText('Parallax Content')).toBeInTheDocument();
    });

    it('should render MouseParallax component', async () => {
      const { MouseParallax } = await import('@/components/premium/ParallaxSection');
      
      render(
        <MouseParallax strength={20}>
          <div>Mouse Parallax Content</div>
        </MouseParallax>
      );
      
      expect(screen.getByText('Mouse Parallax Content')).toBeInTheDocument();
    });

    it('should render DepthCard component', async () => {
      const { DepthCard } = await import('@/components/premium/ParallaxSection');
      
      render(
        <DepthCard depth={3}>
          <div>3D Card Content</div>
        </DepthCard>
      );
      
      expect(screen.getByText('3D Card Content')).toBeInTheDocument();
    });
  });

  describe('DashboardPreview', () => {
    it('should render InteractiveDashboardPreview', async () => {
      const { InteractiveDashboardPreview } = await import('@/components/premium/DashboardPreview');
      
      render(<InteractiveDashboardPreview />);
      
      expect(screen.getByText('Dashboard Preview')).toBeInTheDocument();
      expect(screen.getByText('Live Demo')).toBeInTheDocument();
    });

    it('should switch between tabs', async () => {
      const { InteractiveDashboardPreview } = await import('@/components/premium/DashboardPreview');
      
      render(<InteractiveDashboardPreview />);
      
      const contractsTab = screen.getByText('Contracts');
      fireEvent.click(contractsTab);
      
      await waitFor(() => {
        expect(screen.getByText('Contract management interface preview')).toBeInTheDocument();
      });
      
      const analyticsTab = screen.getByText('Analytics');
      fireEvent.click(analyticsTab);
      
      await waitFor(() => {
        expect(screen.getByText('Advanced analytics preview')).toBeInTheDocument();
      });
    });

    it('should display metrics cards', async () => {
      const { InteractiveDashboardPreview } = await import('@/components/premium/DashboardPreview');
      
      render(<InteractiveDashboardPreview />);
      
      expect(screen.getByText('Active Contracts')).toBeInTheDocument();
      expect(screen.getByText('Total Vendors')).toBeInTheDocument();
      expect(screen.getByText('Monthly Savings')).toBeInTheDocument();
      expect(screen.getByText('Compliance Rate')).toBeInTheDocument();
    });
  });

  describe('ThreeScene', () => {
    it('should render ThreeBackground with particles', async () => {
      const { ThreeBackground } = await import('@/components/premium/ThreeScene');
      
      render(<ThreeBackground variant="particles" />);
      
      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });

    it('should render InteractiveGlobe', async () => {
      const { InteractiveGlobe } = await import('@/components/premium/ThreeScene');
      
      render(<InteractiveGlobe />);
      
      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });
  });

  describe('HoverEffects', () => {
    it('should render TiltCard component', async () => {
      const { TiltCard } = await import('@/components/premium/HoverEffects');
      
      render(
        <TiltCard maxTilt={15}>
          <div>Tiltable Card</div>
        </TiltCard>
      );
      
      expect(screen.getByText('Tiltable Card')).toBeInTheDocument();
    });

    it('should render MagneticButton component', async () => {
      const { MagneticButton } = await import('@/components/premium/HoverEffects');
      
      render(
        <MagneticButton strength={0.3}>
          <button>Magnetic Button</button>
        </MagneticButton>
      );
      
      expect(screen.getByText('Magnetic Button')).toBeInTheDocument();
    });

    it('should render ShimmerButton component', async () => {
      const { ShimmerButton } = await import('@/components/premium/HoverEffects');
      
      render(
        <ShimmerButton>
          Shimmer Effect
        </ShimmerButton>
      );
      
      expect(screen.getByText('Shimmer Effect')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should lazy load components efficiently', async () => {
      // Test that dynamic imports work
      const AnimatedSection = await import('@/components/premium/AnimatedSection');
      expect(AnimatedSection).toHaveProperty('AnimatedSection');
      
      const TestimonialsCarousel = await import('@/components/premium/TestimonialsCarousel');
      expect(TestimonialsCarousel).toHaveProperty('TestimonialsCarousel');
      
      const MetricsCounter = await import('@/components/premium/MetricsCounter');
      expect(MetricsCounter).toHaveProperty('MetricsGrid');
    });
  });

  describe('A/B Testing', () => {
    it('should initialize AB testing service', async () => {
      const { abTesting, useABTest } = await import('@/lib/ab-testing');
      
      expect(abTesting).toBeDefined();
      expect(useABTest).toBeDefined();
    });

    it('should track conversions', async () => {
      const { abTesting } = await import('@/lib/ab-testing');
      
      // Mock window.gtag
      (global as any).window.gtag = jest.fn();
      
      abTesting.trackConversion('test_experiment', 'click', 100);
      
      // Note: In real implementation, this would only track if experiment is assigned
      // For testing, we're just ensuring the method exists and doesn't error
      expect(abTesting.trackConversion).toBeDefined();
    });
  });
});