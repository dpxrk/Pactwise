import { Montserrat } from 'next/font/google';

/**
 * Optimized font loading with next/font
 * This reduces render-blocking time and improves performance
 */

export const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-montserrat',
  // Only load the weights we actually use to reduce bundle size
  weight: ['400', '500', '600', '700'],
  preload: true,
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
});

// Font loading optimization utilities
export const fontVariables = `${montserrat.variable}`;