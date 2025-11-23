"use client";

import { useState, useEffect } from 'react';

/**
 * Typewriter effect hook that animates text character by character
 * @param text - The text to animate
 * @param speed - Speed in milliseconds per character (default: 30ms)
 * @param startDelay - Delay before starting the animation (default: 0ms)
 * @returns The currently displayed text
 */
export const useTypewriter = (
  text: string,
  speed: number = 30,
  startDelay: number = 0
): string => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    setDisplayedText(''); // Reset on text change
    let i = 0;

    const delayTimer = setTimeout(() => {
      const timer = setInterval(() => {
        if (i < text.length) {
          setDisplayedText((prev) => prev + text.charAt(i));
          i++;
        } else {
          clearInterval(timer);
        }
      }, speed);

      return () => clearInterval(timer);
    }, startDelay);

    return () => clearTimeout(delayTimer);
  }, [text, speed, startDelay]);

  return displayedText;
};

/**
 * Counter animation hook that animates a number from 0 to a target value
 * @param end - The end value as a string (can include suffixes like "K+", "M+", "%")
 * @param duration - Animation duration in milliseconds (default: 2000ms)
 * @returns The currently displayed count value
 */
export const useCounter = (end: string, duration: number = 2000): string => {
  const [count, setCount] = useState('0');

  // Extract number and suffix
  const numberPart = parseFloat(end.replace(/[^0-9.]/g, ''));
  const suffix = end.replace(/[0-9.]/g, '');

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;

      if (progress < duration) {
        const current = Math.min(numberPart * (progress / duration), numberPart);
        const decimals = numberPart % 1 === 0 ? 0 : 1;
        setCount(current.toFixed(decimals) + suffix);
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, numberPart, suffix]);

  return count;
};
