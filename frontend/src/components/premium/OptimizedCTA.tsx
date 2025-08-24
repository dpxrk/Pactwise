'use client';

import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useABTest, abTesting, CTAVariant } from '@/lib/ab-testing';
import { ArrowRight, Sparkles, Zap } from 'lucide-react';

interface OptimizedCTAProps {
  experimentId: string;
  variants: Record<string, CTAVariant>;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  analyticsEvent?: string;
}

export const OptimizedCTA: React.FC<OptimizedCTAProps> = ({
  experimentId,
  variants,
  onClick,
  className = '',
  size = 'default',
  analyticsEvent = 'cta_click',
}) => {
  const variantKeys = Object.keys(variants).map(key => ({ id: key }));
  const currentVariant = useABTest(experimentId, variantKeys, 'control');
  const variant = variants[currentVariant] || variants.control;

  const handleClick = useCallback(() => {
    abTesting.trackConversion(experimentId, analyticsEvent);
    
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', analyticsEvent, {
        experiment_id: experimentId,
        variant: currentVariant,
        button_text: variant.text,
      });
    }
    
    onClick?.();
  }, [experimentId, currentVariant, variant.text, analyticsEvent, onClick]);

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    default: 'px-6 py-3',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Button
        className={`${variant.className || ''} ${sizeClasses[size]} ${className}`}
        onClick={handleClick}
        variant={variant.variant}
      >
        {variant.icon}
        {variant.text}
        <ArrowRight className="ml-2 w-4 h-4" />
      </Button>
    </motion.div>
  );
};

export const HeroCTA: React.FC<{
  onClick?: () => void;
  className?: string;
}> = ({ onClick, className }) => {
  const variants = {
    control: {
      text: 'Start Automating',
      className: 'bg-gray-900 hover:bg-gray-800 text-white',
      icon: <Zap className="mr-2 w-4 h-4" />,
    },
    variant_a: {
      text: 'Get Started Free',
      className: 'bg-gray-900 hover:bg-gray-800 text-white',
      icon: <ArrowRight className="mr-2 w-4 h-4" />,
    },
    variant_b: {
      text: 'Try Pactwise Now',
      className: 'bg-gray-900 hover:bg-gray-800 text-white',
      icon: <Sparkles className="mr-2 w-4 h-4" />,
    },
  };

  return (
    <OptimizedCTA
      experimentId="hero_cta_2024"
      variants={variants}
      onClick={onClick}
      className={className}
      size="lg"
      analyticsEvent="hero_cta_click"
    />
  );
};

export const PricingCTA: React.FC<{
  onClick?: () => void;
  className?: string;
  discountCode?: string;
}> = ({ onClick, className, discountCode }) => {
  const variants = {
    control: {
      text: 'Claim Your 90% Discount',
      className: 'bg-gray-900 hover:bg-gray-800 text-white',
    },
    variant_a: {
      text: 'Start Free Trial',
      className: 'bg-gray-900 hover:bg-gray-800 text-white',
    },
    variant_b: {
      text: 'Get Limited Offer',
      className: 'bg-red-600 hover:bg-red-700 text-white animate-pulse',
    },
  };

  const handleClick = useCallback(() => {
    const params = discountCode ? `?discount=${discountCode}` : '?discount=EARLY500';
    window.location.href = `/auth/sign-up${params}`;
    onClick?.();
  }, [discountCode, onClick]);

  return (
    <OptimizedCTA
      experimentId="pricing_cta_2024"
      variants={variants}
      onClick={handleClick}
      className={className}
      size="lg"
      analyticsEvent="pricing_cta_click"
    />
  );
};

export const MultivariateCTA: React.FC<{
  baseText: string;
  onClick?: () => void;
  className?: string;
}> = ({ baseText, onClick, className }) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [clickCount, setClickCount] = React.useState(0);

  const handleClick = useCallback(() => {
    setClickCount(prev => prev + 1);
    
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'multivariate_cta_click', {
        base_text: baseText,
        click_count: clickCount + 1,
        hover_time: isHovered ? 'engaged' : 'quick',
      });
    }
    
    onClick?.();
  }, [baseText, clickCount, isHovered, onClick]);

  return (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      animate={{
        scale: isHovered ? 1.05 : 1,
      }}
      transition={{ duration: 0.2 }}
    >
      <Button
        className={`relative overflow-hidden ${className}`}
        onClick={handleClick}
      >
        <motion.span
          animate={{
            opacity: isHovered ? 0.8 : 1,
          }}
        >
          {baseText}
        </motion.span>
        {isHovered && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 0.5 }}
          />
        )}
      </Button>
    </motion.div>
  );
};