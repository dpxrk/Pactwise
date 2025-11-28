"use client";

import Link from "next/link";
import { Github, Twitter, Linkedin } from "lucide-react";
import { useTheme } from "./ThemeContext";

const footerLinks = {
  Product: [
    { label: "Features", href: "#" },
    { label: "Pricing", href: "#" },
    { label: "Security", href: "#" },
    { label: "Integrations", href: "#" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Contact", href: "#" },
  ],
  Resources: [
    { label: "Documentation", href: "#" },
    { label: "API Reference", href: "#" },
    { label: "Status", href: "#" },
    { label: "Changelog", href: "#" },
  ],
  Legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "DPA", href: "#" },
    { label: "Cookies", href: "#" },
  ],
};

export function TerminalFooter() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <footer className={`border-t transition-colors duration-300 ${
      isDark ? "bg-terminal-bg border-terminal-border" : "bg-white border-ghost-200"
    }`}>
      <div className="max-w-[1400px] mx-auto px-6">
        {/* Main Footer */}
        <div className="py-16 grid grid-cols-2 md:grid-cols-6 gap-8">
          {/* Logo & Description */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 bg-success rounded-full" />
              <span className={`font-mono text-sm font-medium transition-colors duration-300 ${
                isDark ? "text-text-primary" : "text-purple-900"
              }`}>
                PACTWISE
              </span>
            </Link>
            <p className={`text-sm max-w-xs mb-6 transition-colors duration-300 ${
              isDark ? "text-text-tertiary" : "text-ghost-500"
            }`}>
              Intelligent contract and vendor management powered by autonomous
              AI agents.
            </p>
            <div className="flex items-center gap-4">
              {[
                { icon: Twitter, href: "#" },
                { icon: Linkedin, href: "#" },
                { icon: Github, href: "#" },
              ].map((social, idx) => (
                <a
                  key={idx}
                  href={social.href}
                  className={`p-2 transition-colors ${
                    isDark
                      ? "text-text-tertiary hover:text-text-primary hover:bg-terminal-hover"
                      : "text-ghost-400 hover:text-purple-900 hover:bg-ghost-100"
                  }`}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className={`font-mono text-[10px] tracking-wider mb-4 transition-colors duration-300 ${
                isDark ? "text-text-muted" : "text-ghost-400"
              }`}>
                {category.toUpperCase()}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className={`text-sm transition-colors ${
                        isDark
                          ? "text-text-tertiary hover:text-text-primary"
                          : "text-ghost-500 hover:text-purple-900"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className={`py-6 border-t flex flex-col md:flex-row items-center justify-between gap-4 transition-colors duration-300 ${
          isDark ? "border-terminal-border" : "border-ghost-200"
        }`}>
          <div className={`font-mono text-[10px] transition-colors duration-300 ${
            isDark ? "text-text-muted" : "text-ghost-400"
          }`}>
            &copy; {new Date().getFullYear()} PACTWISE INC. ALL RIGHTS RESERVED.
          </div>
          <div className={`flex items-center gap-6 font-mono text-[10px] transition-colors duration-300 ${
            isDark ? "text-text-muted" : "text-ghost-400"
          }`}>
            <span>VERSION 2.4.1</span>
            <span className={isDark ? "text-terminal-border" : "text-ghost-300"}>|</span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-success rounded-full" />
              SYSTEMS OPERATIONAL
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
