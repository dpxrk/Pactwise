import { useEffect, useState } from 'react';

export interface Variant {
  id: string;
  weight?: number;
}

export interface Experiment {
  id: string;
  name: string;
  variants: Variant[];
  defaultVariant?: string;
}

class ABTestingService {
  private experiments: Map<string, Experiment> = new Map();
  private assignments: Map<string, string> = new Map();
  private userId: string;

  constructor() {
    this.userId = this.getOrCreateUserId();
    this.loadAssignments();
  }

  private getOrCreateUserId(): string {
    if (typeof window === 'undefined') return 'server';
    
    let userId = localStorage.getItem('ab_user_id');
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('ab_user_id', userId);
    }
    return userId;
  }

  private loadAssignments() {
    if (typeof window === 'undefined') return;
    
    const stored = localStorage.getItem('ab_assignments');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.assignments = new Map(Object.entries(parsed));
      } catch (e) {
        console.error('Failed to load AB test assignments:', e);
      }
    }
  }

  private saveAssignments() {
    if (typeof window === 'undefined') return;
    
    const obj = Object.fromEntries(this.assignments);
    localStorage.setItem('ab_assignments', JSON.stringify(obj));
  }

  public registerExperiment(experiment: Experiment) {
    this.experiments.set(experiment.id, experiment);
  }

  public getVariant(experimentId: string): string {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      console.warn(`Experiment ${experimentId} not found`);
      return 'control';
    }

    let variant = this.assignments.get(experimentId);
    if (!variant) {
      variant = this.assignVariant(experiment);
      this.assignments.set(experimentId, variant);
      this.saveAssignments();
      this.trackAssignment(experimentId, variant);
    }

    return variant;
  }

  private assignVariant(experiment: Experiment): string {
    const variants = experiment.variants;
    const totalWeight = variants.reduce((sum, v) => sum + (v.weight || 1), 0);
    const random = Math.random() * totalWeight;
    
    let cumulative = 0;
    for (const variant of variants) {
      cumulative += variant.weight || 1;
      if (random < cumulative) {
        return variant.id;
      }
    }
    
    return experiment.defaultVariant || variants[0].id;
  }

  private trackAssignment(experimentId: string, variant: string) {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'ab_test_assignment', {
        experiment_id: experimentId,
        variant_id: variant,
        user_id: this.userId,
      });
    }
  }

  public trackConversion(experimentId: string, conversionType: string, value?: number) {
    const variant = this.assignments.get(experimentId);
    if (!variant) return;

    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'ab_test_conversion', {
        experiment_id: experimentId,
        variant_id: variant,
        conversion_type: conversionType,
        value: value,
        user_id: this.userId,
      });
    }
  }

  public reset() {
    this.assignments.clear();
    this.saveAssignments();
  }
}

export const abTesting = new ABTestingService();

export function useABTest(experimentId: string, variants: Variant[], defaultVariant?: string): string {
  const [variant, setVariant] = useState<string>(defaultVariant || 'control');

  useEffect(() => {
    const experiment: Experiment = {
      id: experimentId,
      name: experimentId,
      variants,
      defaultVariant,
    };
    
    abTesting.registerExperiment(experiment);
    const assigned = abTesting.getVariant(experimentId);
    setVariant(assigned);
  }, [experimentId, variants, defaultVariant]);

  return variant;
}

export function useOptimizely(experimentKey: string, defaultVariant = 'control'): string {
  const [variant, setVariant] = useState(defaultVariant);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).optimizely) {
      const optimizely = (window as any).optimizely;
      const variation = optimizely.get('state').getVariationMap()[experimentKey];
      if (variation) {
        setVariant(variation.name || variation.id);
      }
    }
  }, [experimentKey]);

  return variant;
}

export interface CTAVariant {
  text: string;
  className?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
}

export const ctaExperiments = {
  heroButton: {
    id: 'hero_cta_v1',
    variants: [
      { id: 'control', weight: 33 },
      { id: 'variant_a', weight: 33 },
      { id: 'variant_b', weight: 34 },
    ],
    copy: {
      control: { text: 'Start Automating', className: 'bg-gray-900 hover:bg-gray-800 text-white' },
      variant_a: { text: 'Get Started Free', className: 'bg-gray-900 hover:bg-gray-800 text-white' },
      variant_b: { text: 'Try Pactwise Now', className: 'bg-gray-900 hover:bg-gray-800 text-white' },
    },
  },
  pricingCTA: {
    id: 'pricing_cta_v1',
    variants: [
      { id: 'control', weight: 50 },
      { id: 'variant_a', weight: 50 },
    ],
    copy: {
      control: { text: 'Claim Your 90% Discount', className: 'bg-gray-900 hover:bg-gray-800 text-white' },
      variant_a: { text: 'Start Free Trial', className: 'bg-gray-900 hover:bg-gray-800 text-white' },
    },
  },
};

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    optimizely?: any;
  }
}