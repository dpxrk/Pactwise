'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  aspectRatio?: number;
  onLoad?: () => void;
  priority?: boolean;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3Crect width="1" height="1" fill="%23f3f4f6"/%3E%3C/svg%3E',
  aspectRatio,
  onLoad,
  priority = false,
}) => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [imageRef, setImageRef] = useState<HTMLImageElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!priority && 'IntersectionObserver' in window && containerRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsInView(true);
              observer.disconnect();
            }
          });
        },
        {
          rootMargin: '50px',
        }
      );

      observer.observe(containerRef.current);

      return () => {
        observer.disconnect();
      };
    } else {
      setIsInView(true);
    }
  }, [priority]);

  useEffect(() => {
    if (isInView || priority) {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        setImageSrc(src);
        setIsLoaded(true);
        onLoad?.();
      };
      setImageRef(img);
    }
  }, [src, isInView, priority, onLoad]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      <motion.img
        src={imageSrc}
        alt={alt}
        className="w-full h-full object-cover"
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse" />
      )}
    </div>
  );
};

export const OptimizedImage: React.FC<{
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
}> = ({ src, alt, width, height, className = '', priority = false, quality = 75 }) => {
  const [optimizedSrc, setOptimizedSrc] = useState(src);

  useEffect(() => {
    if (src.startsWith('http') && width && height) {
      const params = new URLSearchParams({
        w: width.toString(),
        h: height.toString(),
        q: quality.toString(),
        fm: 'webp',
      });
      setOptimizedSrc(`${src}?${params.toString()}`);
    }
  }, [src, width, height, quality]);

  return (
    <LazyImage
      src={optimizedSrc}
      alt={alt}
      className={className}
      priority={priority}
      aspectRatio={width && height ? width / height : undefined}
    />
  );
};