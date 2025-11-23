import React, { useState, useEffect } from 'react';
import { Scroll } from '@react-three/drei';
import { METRICS, AGENTS } from '../constants';
import { Terminal, Shield, Cpu, Activity, ArrowRight, MousePointer2, X, Database, Lock, Zap } from 'lucide-react';
import { useInteraction } from '../InteractionContext';

// --- Micro-interaction Hooks ---

const useTypewriter = (text: string, speed: number = 30, startDelay: number = 0) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    setDisplayedText(''); // Reset on text change
    let i = 0;
    const delayTimer = setTimeout(() => {
        const timer = setInterval(() => {
        if (i < text.length) {
            setDisplayedText(prev => prev + text.charAt(i));
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

const useCounter = (end: string, duration: number = 2000) => {
  const [count, setCount] = useState('0');
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
        setCount(current.toFixed(numberPart % 1 === 0 ? 0 : 1) + suffix);
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

const Section = ({ children, className = "", align = "center", show = true }: any) => {
  if(!show) return null;
  const alignClass = align === "left" ? "items-start text-left" : align === "right" ? "items-end text-right" : "items-center text-center";
  return (
    <section className={`h-screen w-full flex flex-col justify-center p-8 md:p-20 ${alignClass} ${className}`}>
      {children}
    </section>
  );
};

const MetricItem = ({ label, value }: { label: string, value: string }) => {
    const animatedValue = useCounter(value);
    return (
        <div className="flex flex-col items-center px-6 group cursor-default">
            <span className="text-3xl font-mono text-white mb-1 group-hover:text-pact-300 transition-colors">
                {animatedValue}
            </span>
            <span className="text-xs font-mono text-pact-500 tracking-wider group-hover:text-pact-100 transition-colors">
                {label}
            </span>
        </div>
    )
}

// --- Agent Detail Panel (Floating Card) ---
export const AgentDetailPanel = ({ agent, onClose }: { agent: any, onClose: () => void }) => {
    const description = useTypewriter(agent.description, 20, 300); // Add delay to typewriter
    
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center md:justify-end md:pr-24 pointer-events-none">
            {/* Backdrop with smooth fade in */}
            <div 
                className="absolute inset-0 bg-pact-900/60 backdrop-blur-sm pointer-events-auto animate-fade-in"
                onClick={onClose}
            />

            {/* Floating HUD Card with Zoom Entry */}
            