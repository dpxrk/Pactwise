'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  content: string;
  rating: number;
  metrics?: {
    label: string;
    value: string;
  }[];
  image?: string;
  featured?: boolean;
}

const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    role: 'Chief Legal Officer',
    company: 'TechCorp Global',
    content: 'Pactwise transformed our contract management overnight. What used to take weeks now takes hours. The AI accuracy is phenomenal.',
    rating: 5,
    metrics: [
      { label: 'Time Saved', value: '87%' },
      { label: 'Cost Reduction', value: '$2.3M' },
    ],
    featured: true,
  },
  {
    id: '2',
    name: 'Michael Roberts',
    role: 'VP of Procurement',
    company: 'Enterprise Solutions Inc',
    content: 'The vendor intelligence AI has completely revolutionized how we manage supplier relationships. Predictive analytics caught issues we would have missed.',
    rating: 5,
    metrics: [
      { label: 'Vendor Issues Prevented', value: '142' },
      { label: 'Savings', value: '$4.7M' },
    ],
  },
  {
    id: '3',
    name: 'Emily Watson',
    role: 'Director of Compliance',
    company: 'FinanceHub',
    content: 'Compliance monitoring that actually works. The system caught regulatory changes instantly and updated our contracts automatically. Incredible peace of mind.',
    rating: 5,
    metrics: [
      { label: 'Compliance Rate', value: '100%' },
      { label: 'Audit Time', value: '-95%' },
    ],
  },
  {
    id: '4',
    name: 'David Kim',
    role: 'General Counsel',
    company: 'Innovate Partners',
    content: 'We process thousands of contracts monthly. Pactwise handles them all flawlessly. The ROI was evident within the first month.',
    rating: 5,
    metrics: [
      { label: 'Contracts/Month', value: '5,000+' },
      { label: 'ROI', value: '450%' },
    ],
  },
  {
    id: '5',
    name: 'Lisa Anderson',
    role: 'Head of Operations',
    company: 'Global Logistics Co',
    content: 'The automation capabilities are unmatched. Our legal team now focuses on strategy instead of paperwork. Game-changing platform.',
    rating: 5,
    metrics: [
      { label: 'Automation Rate', value: '92%' },
      { label: 'Team Efficiency', value: '+280%' },
    ],
  },
];

export const TestimonialsCarousel: React.FC<{
  autoPlay?: boolean;
  interval?: number;
  className?: string;
}> = ({ autoPlay = true, interval = 5000, className = '' }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(autoPlay);
  const [direction, setDirection] = useState(0);

  const paginate = useCallback((newDirection: number) => {
    setDirection(newDirection);
    setCurrentIndex((prevIndex) => {
      if (newDirection === 1) {
        return prevIndex === testimonials.length - 1 ? 0 : prevIndex + 1;
      }
      return prevIndex === 0 ? testimonials.length - 1 : prevIndex - 1;
    });
  }, []);

  useEffect(() => {
    if (!isAutoPlaying) return;

    const timer = setInterval(() => {
      paginate(1);
    }, interval);

    return () => clearInterval(timer);
  }, [isAutoPlaying, interval, paginate]);

  const handleMouseEnter = () => setIsAutoPlaying(false);
  const handleMouseLeave = () => setIsAutoPlaying(autoPlay);

  const currentTestimonial = testimonials[currentIndex];

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  return (
    <div className={`relative ${className}`} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div className="relative overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={(e, { offset, velocity }) => {
              const swipe = swipePower(offset.x, velocity.x);

              if (swipe < -swipeConfidenceThreshold) {
                paginate(1);
              } else if (swipe > swipeConfidenceThreshold) {
                paginate(-1);
              }
            }}
          >
            <Card className="bg-white border-2 border-gray-300 p-8 md:p-12">
              {currentTestimonial.featured && (
                <Badge className="absolute top-4 right-4 bg-gray-900 text-white">
                  Featured
                </Badge>
              )}
              
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 border border-gray-300 bg-gray-50">
                  <Quote className="w-6 h-6 text-gray-900" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(currentTestimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-gray-900 text-gray-900" />
                    ))}
                  </div>
                  <p className="text-lg md:text-xl text-gray-700 leading-relaxed mb-6">
                    "{currentTestimonial.content}"
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{currentTestimonial.name}</p>
                      <p className="text-sm text-gray-600">
                        {currentTestimonial.role}, {currentTestimonial.company}
                      </p>
                    </div>
                    {currentTestimonial.metrics && (
                      <div className="flex gap-6">
                        {currentTestimonial.metrics.map((metric, i) => (
                          <div key={i} className="text-right">
                            <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                            <p className="text-xs text-gray-500">{metric.label}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between mt-6">
        <div className="flex gap-2">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setDirection(index > currentIndex ? 1 : -1);
                setCurrentIndex(index);
              }}
              className={`w-2 h-2 transition-all duration-300 ${
                index === currentIndex
                  ? 'w-8 bg-gray-900'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to testimonial ${index + 1}`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => paginate(-1)}
            className="border-gray-300 hover:border-gray-900"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => paginate(1)}
            className="border-gray-300 hover:border-gray-900"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export const TestimonialGrid: React.FC<{
  limit?: number;
  className?: string;
}> = ({ limit = 3, className = '' }) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${className}`}>
      {testimonials.slice(0, limit).map((testimonial, index) => (
        <motion.div
          key={testimonial.id}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="bg-white border border-gray-300 p-6 h-full hover:border-gray-900 transition-colors">
            <div className="flex items-center gap-1 mb-3">
              {[...Array(testimonial.rating)].map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-gray-900 text-gray-900" />
              ))}
            </div>
            <p className="text-gray-700 mb-4 text-sm leading-relaxed">
              "{testimonial.content}"
            </p>
            <div className="mt-auto pt-4 border-t border-gray-200">
              <p className="font-semibold text-gray-900 text-sm">{testimonial.name}</p>
              <p className="text-xs text-gray-600">
                {testimonial.role}, {testimonial.company}
              </p>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};