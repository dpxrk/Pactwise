'use client';

import React from 'react';
import Link from 'next/link';
import { FOOTER_LINKS } from './constants';

export const Footer = React.memo(() => {
  return (
    <footer className="py-16 border-t border-gray-300 bg-white">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-3 mb-6 md:mb-0">
            <div
              className="text-lg select-none"
              style={{
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif',
                letterSpacing: '-0.03em',
              }}
            >
              <span style={{ fontWeight: 400 }}>P</span>
              <span style={{ fontWeight: 300 }}>act</span>
              <span style={{ fontWeight: 200 }}>wise</span>
            </div>
          </div>
          <div className="flex items-center gap-8">
            {FOOTER_LINKS.map((link, index) => (
              <Link
                key={`footer-${index}-${link.href}`}
                href={link.href}
                className="text-gray-600 hover:text-gray-900 transition"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="text-center text-sm text-gray-500 mt-12">
          © 2024 PactWise. Enterprise contract intelligence.
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';