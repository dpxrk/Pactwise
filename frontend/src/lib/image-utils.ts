/**
 * Image optimization utilities
 */

/**
 * Generate a blur data URL for placeholder
 * This creates a tiny base64 encoded image that can be used as a placeholder
 */
export function generateBlurDataURL(width: number = 4, height: number = 3): string {
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!canvas) return '';

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Create a gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#e5e7eb');
  gradient.addColorStop(1, '#f3f4f6');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  return canvas.toDataURL();
}

/**
 * Generate Cloudinary URL with optimizations
 */
export function generateCloudinaryURL(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
    crop?: 'fill' | 'fit' | 'scale' | 'crop';
  } = {}
): string {
  const {
    width,
    height,
    quality = 'auto',
    format = 'auto',
    crop = 'fill',
  } = options;

  const transformations = [];
  
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  transformations.push(`q_${quality}`);
  transformations.push(`f_${format}`);
  transformations.push(`c_${crop}`);
  
  // Add automatic optimizations
  transformations.push('fl_progressive');
  transformations.push('fl_immutable');
  
  const transformation = transformations.join(',');
  
  return `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/${transformation}/${publicId}`;
}

/**
 * Get optimized image dimensions based on container size
 */
export function getOptimizedDimensions(
  originalWidth: number,
  originalHeight: number,
  containerWidth: number,
  containerHeight?: number
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;
  
  if (containerHeight) {
    // Fit within container maintaining aspect ratio
    const containerAspectRatio = containerWidth / containerHeight;
    
    if (aspectRatio > containerAspectRatio) {
      // Image is wider than container
      return {
        width: containerWidth,
        height: Math.round(containerWidth / aspectRatio),
      };
    } else {
      // Image is taller than container
      return {
        width: Math.round(containerHeight * aspectRatio),
        height: containerHeight,
      };
    }
  } else {
    // Only width constraint
    return {
      width: containerWidth,
      height: Math.round(containerWidth / aspectRatio),
    };
  }
}

/**
 * Preload critical images
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Batch preload multiple images
 */
export async function preloadImages(srcs: string[]): Promise<void[]> {
  return Promise.all(srcs.map(src => preloadImage(src)));
}

/**
 * Get srcset for responsive images
 */
export function generateSrcSet(
  src: string,
  widths: number[] = [640, 750, 828, 1080, 1200, 1920, 2048, 3840]
): string {
  return widths
    .map(width => {
      const url = src.includes('cloudinary') 
        ? src.replace(/w_\d+/, `w_${width}`)
        : `${src}?w=${width}`;
      return `${url} ${width}w`;
    })
    .join(', ');
}

/**
 * Get sizes attribute for responsive images
 */
export function generateSizes(
  breakpoints: { maxWidth: number; size: string }[] = [
    { maxWidth: 640, size: '100vw' },
    { maxWidth: 1200, size: '50vw' },
    { maxWidth: Infinity, size: '33vw' },
  ]
): string {
  return breakpoints
    .map(({ maxWidth, size }) => 
      maxWidth === Infinity ? size : `(max-width: ${maxWidth}px) ${size}`
    )
    .join(', ');
}

/**
 * Convert image to WebP format
 */
export async function convertToWebP(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Could not convert to WebP'));
            }
          },
          'image/webp',
          0.8 // Quality
        );
      };
      
      img.onerror = () => reject(new Error('Could not load image'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Lazy load images with Intersection Observer
 */
export class ImageLazyLoader {
  private observer: IntersectionObserver;
  private images: Map<Element, string> = new Map();

  constructor(options: IntersectionObserverInit = {}) {
    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        rootMargin: '50px',
        threshold: 0.01,
        ...options,
      }
    );
  }

  observe(element: Element, src: string) {
    this.images.set(element, src);
    this.observer.observe(element);
  }

  unobserve(element: Element) {
    this.images.delete(element);
    this.observer.unobserve(element);
  }

  disconnect() {
    this.observer.disconnect();
    this.images.clear();
  }

  private handleIntersection(entries: IntersectionObserverEntry[]) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target;
        const src = this.images.get(element);
        
        if (src && element instanceof HTMLImageElement) {
          element.src = src;
          element.classList.add('loaded');
          this.unobserve(element);
        }
      }
    });
  }
}