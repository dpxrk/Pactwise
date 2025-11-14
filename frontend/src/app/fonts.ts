import { Montserrat, JetBrains_Mono, Syne } from 'next/font/google';

/**
 * Optimized font loading with next/font for Pactwise's Bloomberg Terminal × Linear aesthetic
 * - Syne: Geometric display font for headlines and impact moments
 * - Montserrat: Clean, readable body font
 * - JetBrains Mono: Technical monospace for data, metrics, and code
 */

// Display font - Geometric and distinctive for headlines
export const syne = Syne({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-syne',
  weight: ['400', '500', '600', '700', '800'],
  preload: true,
});

// Body font - Clean and readable
export const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-montserrat',
  weight: ['400', '500', '600', '700'],
  preload: true,
});

// Monospace font - Technical authority for data displays
export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
  weight: ['400', '500', '600', '700'],
  preload: true,
});

// Font loading optimization utilities
export const fontVariables = `${syne.variable} ${montserrat.variable} ${jetbrainsMono.variable}`;