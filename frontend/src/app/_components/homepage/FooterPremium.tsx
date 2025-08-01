"use client";

import React from "react";
import { 
  Sparkles, Mail, Phone, MapPin, 
  Twitter, Linkedin, Github, Youtube,
  ArrowRight
} from "lucide-react";

const FooterPremium = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Integrations", href: "#integrations" },
      { label: "API Docs", href: "/docs" }
    ],
    company: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Careers", href: "/careers", badge: "We're hiring!" },
      { label: "Press Kit", href: "/press" }
    ],
    resources: [
      { label: "Documentation", href: "/docs" },
      { label: "Help Center", href: "/help" },
      { label: "Community", href: "/community" },
      { label: "Status", href: "/status", badge: "All systems operational" }
    ],
    legal: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Cookie Policy", href: "/cookies" },
      { label: "GDPR", href: "/gdpr" }
    ]
  };

  const socialLinks = [
    { icon: Twitter, href: "https://twitter.com/pactwise", label: "Twitter" },
    { icon: Linkedin, href: "https://linkedin.com/company/pactwise", label: "LinkedIn" },
    { icon: Github, href: "https://github.com/pactwise", label: "GitHub" },
    { icon: Youtube, href: "https://youtube.com/pactwise", label: "YouTube" }
  ];

  return (
    <footer className="relative pt-24 pb-12 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Newsletter CTA */}
        <div className="glass rounded-3xl p-8 md:p-12 border border-white/10 mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-3xl font-bold text-white mb-4">
                Stay in the loop
              </h3>
              <p className="text-gray-400">
                Get the latest updates on new features, AI improvements, and contract management tips.
              </p>
            </div>
            
            <div>
              <form className="flex flex-col sm:flex-row gap-4">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
                <button 
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-glow hover:shadow-glow hover:scale-105 whitespace-nowrap flex items-center gap-2"
                >
                  Subscribe
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
              <p className="text-xs text-gray-500 mt-3">
                No spam. Unsubscribe anytime. View our{" "}
                <a href="/privacy" className="text-cyan-400 hover:text-cyan-300">
                  Privacy Policy
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Main footer content */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          {/* Logo and tagline */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-gradient-to-r from-cyan-600 to-teal-600 rounded-lg p-2">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Pactwise</span>
            </div>
            <p className="text-gray-400 mb-6 max-w-xs">
              AI-powered contract intelligence that transforms how enterprises manage agreements.
            </p>
            
            {/* Social links */}
            <div className="flex items-center gap-4">
              {socialLinks.map((social, index) => {
                const Icon = social.icon;
                return (
                  <a
                    key={index}
                    href={social.href}
                    aria-label={social.label}
                    className="w-10 h-10 rounded-lg glass border border-white/10 hover:border-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300 hover:scale-110"
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="text-gray-400 hover:text-white transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link, index) => (
                <li key={index} className="flex items-center gap-2">
                  <a href={link.href} className="text-gray-400 hover:text-white transition-colors">
                    {link.label}
                  </a>
                  {link.badge && (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                      {link.badge}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Resources</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="text-gray-400 hover:text-white transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="text-gray-400 hover:text-white transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Contact info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8 border-t border-white/10 mb-8">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-cyan-400" />
            <a href="mailto:hello@pactwise.ai" className="text-gray-400 hover:text-white transition-colors">
              hello@pactwise.ai
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-cyan-400" />
            <a href="tel:+1234567890" className="text-gray-400 hover:text-white transition-colors">
              +1 (234) 567-890
            </a>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-cyan-400" />
            <span className="text-gray-400">
              San Francisco, CA
            </span>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/10">
          <p className="text-gray-500 text-sm mb-4 md:mb-0">
            © {currentYear} Pactwise AI. All rights reserved.
          </p>
          
          <div className="flex items-center gap-6">
            <a href="/privacy" className="text-gray-500 hover:text-white text-sm transition-colors">
              Privacy
            </a>
            <a href="/terms" className="text-gray-500 hover:text-white text-sm transition-colors">
              Terms
            </a>
            <a href="/cookies" className="text-gray-500 hover:text-white text-sm transition-colors">
              Cookies
            </a>
            
            {/* Status indicator */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-green-400">All systems operational</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterPremium;