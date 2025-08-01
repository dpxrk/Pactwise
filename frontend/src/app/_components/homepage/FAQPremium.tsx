"use client";

import React, { useState } from "react";
import { Plus, Minus, HelpCircle } from "lucide-react";
import { useInView } from "react-intersection-observer";

const FAQPremium = () => {
  const [openItems, setOpenItems] = useState<number[]>([0]);
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true
  });

  const faqs = [
    {
      question: "How does Pactwise AI analyze contracts?",
      answer: "Pactwise uses advanced natural language processing and machine learning models trained on millions of contracts. Our multi-agent AI system extracts clauses, identifies risks, and provides actionable insights with 99.9% accuracy. The AI continuously learns from your contracts to provide increasingly personalized recommendations.",
      category: "AI & Technology"
    },
    {
      question: "What types of contracts can Pactwise handle?",
      answer: "Pactwise can process any type of business contract including NDAs, MSAs, SOWs, vendor agreements, employment contracts, real estate agreements, and more. Our AI adapts to your specific industry terminology and contract types. We support PDF, Word, and even scanned documents with our OCR technology.",
      category: "Features"
    },
    {
      question: "How quickly can I get started?",
      answer: "You can be up and running in less than 5 minutes. Simply sign up, upload your contracts, and our AI immediately begins analysis. No training or complex setup required. Most customers see their first insights within minutes of uploading contracts.",
      category: "Getting Started"
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely. We use bank-level encryption (AES-256) for all data at rest and in transit. Our infrastructure is SOC 2 Type II certified and GDPR compliant. We never share your data with third parties, and you maintain complete ownership of all your contracts and data. Optional on-premise deployment is available for enterprise customers.",
      category: "Security"
    },
    {
      question: "Can Pactwise integrate with our existing tools?",
      answer: "Yes! Pactwise offers native integrations with popular tools like Salesforce, DocuSign, Slack, Microsoft Teams, and more. Our REST API and webhooks allow custom integrations with any system. Most integrations can be set up in minutes without technical expertise.",
      category: "Integrations"
    },
    {
      question: "What kind of ROI can I expect?",
      answer: "Our customers typically see 30% cost reduction in contract management, 90% faster contract review times, and 80% fewer compliance violations. The average enterprise saves over $500K annually through better vendor negotiations and risk mitigation. We offer an ROI calculator to estimate your specific savings.",
      category: "ROI & Value"
    },
    {
      question: "Do you offer a free trial?",
      answer: "Yes! We offer a 14-day free trial with full access to all features. No credit card required. You can upload unlimited contracts and experience the full power of our AI. Our team is available to help you get the most value during your trial.",
      category: "Pricing"
    },
    {
      question: "What support options are available?",
      answer: "We offer multiple support tiers: email support for Starter plans, priority support for Professional plans, and dedicated success managers for Enterprise customers. We also provide comprehensive documentation, video tutorials, and a community forum. Our average response time is under 2 hours.",
      category: "Support"
    }
  ];

  const categories = [...new Set(faqs.map(faq => faq.category))];

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    <section className="relative py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-white/10 mb-6">
            <HelpCircle className="w-4 h-4 text-teal-400" />
            <span className="text-sm font-medium text-gray-400">Got Questions?</span>
          </div>
          
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Frequently Asked{" "}
            <span className="text-gradient">Questions</span>
          </h2>
          
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Everything you need to know about Pactwise. Can't find the answer you're looking for? 
            <a href="#contact" className="text-teal-400 hover:text-teal-300 ml-1">
              Contact our team
            </a>
          </p>
        </div>

        {/* FAQ Items */}
        <div ref={ref} className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`
                ${inView ? 'animate-fade-in-up' : 'opacity-0'}
              `}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <button
                onClick={() => toggleItem(index)}
                className={`
                  w-full glass rounded-2xl p-6 border transition-all duration-300
                  ${openItems.includes(index) 
                    ? "border-teal-500/50 bg-teal-500/5" 
                    : "border-white/10 hover:border-white/20"
                  }
                `}
              >
                <div className="flex items-start justify-between gap-4 text-left">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-medium text-teal-400 bg-teal-400/10 px-2 py-1 rounded-full">
                        {faq.category}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-white">
                      {faq.question}
                    </h3>
                  </div>
                  
                  <div className={`
                    flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
                    transition-all duration-300
                    ${openItems.includes(index)
                      ? "bg-gradient-to-br from-teal-600 to-cyan-600 rotate-180"
                      : "bg-white/10"
                    }
                  `}>
                    {openItems.includes(index) ? (
                      <Minus className="w-4 h-4 text-white" />
                    ) : (
                      <Plus className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
                
                <div className={`
                  grid transition-all duration-300
                  ${openItems.includes(index) 
                    ? "grid-rows-[1fr] opacity-100 mt-4" 
                    : "grid-rows-[0fr] opacity-0"
                  }
                `}>
                  <div className="overflow-hidden">
                    <p className="text-gray-400 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-gray-400 mb-6">
            Still have questions? We're here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/docs"
              className="inline-flex items-center justify-center px-6 py-3 glass border border-white/10 hover:border-white/20 text-white font-medium rounded-xl transition-all duration-300"
            >
              Browse Documentation
            </a>
            <a
              href="#contact"
              className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-medium rounded-xl transition-all duration-300 shadow-glow hover:shadow-glow hover:scale-105"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQPremium;