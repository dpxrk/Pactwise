import React, { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  quality?: number;
  className?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: () => void;
  lazy?: boolean;
  fallback?: string;
}

/**
 * Optimized image component with lazy loading and progressive enhancement
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  priority = false,
  quality = 75,
  className,
  objectFit = 'cover',
  placeholder = 'empty',
  blurDataURL,
  onLoad,
  onError,
  lazy = true,
  fallback = '/images/placeholder.svg',
}) => {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [ref, isIntersecting] = useIntersectionObserver<HTMLDivElement>({
    threshold: 0.1,
    rootMargin: '50px',
    freezeOnceVisible: true,
  });

  const shouldLoad = !lazy || priority || isIntersecting;

  const handleLoad = () => {
    setLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
    onError?.();
  };

  if (error) {
    return (
      <div className={cn('relative overflow-hidden bg-gray-100', className)}>
        <Image
          src={fallback}
          alt={alt}
          width={width}
          height={height}
          className="object-contain opacity-50"
        />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn(
        'relative overflow-hidden',
        !loaded && 'bg-gray-100 animate-pulse',
        className
      )}
      style={width && height ? { width, height } : undefined}
    >
      {shouldLoad && (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          quality={quality}
          priority={priority}
          placeholder={placeholder}
          blurDataURL={blurDataURL}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0',
            objectFit && `object-${objectFit}`
          )}
          style={{
            maxWidth: '100%',
            height: 'auto',
          }}
        />
      )}
    </div>
  );
};

/**
 * Avatar image component with optimization
 */
interface AvatarImageProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const AvatarImage: React.FC<AvatarImageProps> = ({
  src,
  name,
  size = 'md',
  className,
}) => {
  const sizeMap = {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
  };

  const dimensions = sizeMap[size];
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (!src) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-primary/10 text-primary font-semibold rounded-full',
          size === 'sm' && 'w-8 h-8 text-xs',
          size === 'md' && 'w-10 h-10 text-sm',
          size === 'lg' && 'w-12 h-12 text-base',
          size === 'xl' && 'w-16 h-16 text-lg',
          className
        )}
      >
        {initials}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={name}
      width={dimensions}
      height={dimensions}
      className={cn('rounded-full', className)}
      priority={size === 'xl'}
    />
  );
};

/**
 * Background image component with optimization
 */
interface BackgroundImageProps {
  src: string;
  alt?: string;
  className?: string;
  children?: React.ReactNode;
  overlay?: boolean;
  overlayOpacity?: number;
}

export const BackgroundImage: React.FC<BackgroundImageProps> = ({
  src,
  alt = '',
  className,
  children,
  overlay = true,
  overlayOpacity = 0.5,
}) => {
  return (
    <div className={cn('relative', className)}>
      <OptimizedImage
        src={src}
        alt={alt}
        priority
        quality={90}
        className="absolute inset-0 w-full h-full"
        objectFit="cover"
      />
      {overlay && (
        <div 
          className="absolute inset-0 bg-black" 
          style={{ opacity: overlayOpacity }}
        />
      )}
      {children && (
        <div className="relative z-10">
          {children}
        </div>
      )}
    </div>
  );
};

/**
 * Responsive image component
 */
interface ResponsiveImageProps extends Omit<OptimizedImageProps, 'width' | 'height'> {
  desktop: { src: string; width: number; height: number };
  tablet?: { src: string; width: number; height: number };
  mobile: { src: string; width: number; height: number };
}

export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  desktop,
  tablet,
  mobile,
  alt,
  ...props
}) => {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  React.useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setCurrentBreakpoint('mobile');
      } else if (width < 1024 && tablet) {
        setCurrentBreakpoint('tablet');
      } else {
        setCurrentBreakpoint('desktop');
      }
    };

    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, [tablet]);

  const current = currentBreakpoint === 'mobile' ? mobile :
                  currentBreakpoint === 'tablet' && tablet ? tablet :
                  desktop;

  return (
    <OptimizedImage
      src={current.src}
      alt={alt}
      width={current.width}
      height={current.height}
      {...props}
    />
  );
};

/**
 * Gallery image component with lightbox support
 */
interface GalleryImageProps extends OptimizedImageProps {
  onClick?: () => void;
  index?: number;
}

export const GalleryImage: React.FC<GalleryImageProps> = ({
  onClick,
  index,
  className,
  ...props
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative group cursor-pointer overflow-hidden rounded-lg',
        className
      )}
      aria-label={`Open image ${index ? index + 1 : ''}`}
    >
      <OptimizedImage
        {...props}
        className="transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
    </button>
  );
};