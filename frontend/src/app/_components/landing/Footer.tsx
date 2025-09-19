'use client';

import Link from 'next/link';
import React from 'react';

import { FOOTER_LINKS } from './constants';

export const Footer = React.memo(() => {
  return (
    <footer className="py-16 border-t border-[#9e829c]/30 bg-[#f0eff4]">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-3 mb-6 md:mb-0">
            <div
              className="text-lg select-none text-[#291528]"
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
                key={index}
                href={link.href}
                className="text-[#3a3e3b] hover:text-[#291528] transition"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="text-center text-sm text-[#9e829c] mt-12">
          © 2024 PactWise. Enterprise contract intelligence.
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';