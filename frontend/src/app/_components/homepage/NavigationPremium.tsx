"use client";

import React, { useEffect, useState } from "react";
import { Menu, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Container } from "@/app/_components/common/Container";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#contact", label: "Contact" },
];

const NavigationPremium = () => {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // For demo purposes, always show as not signed in
  const isSignedIn = false;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    if (href.startsWith("#")) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
        setMobileMenuOpen(false);
      }
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "backdrop-blur-2xl bg-black/80 border-b border-white/10 py-4"
          : "bg-transparent py-6"
      }`}
    >
      <Container>
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div
            className="group cursor-pointer"
            onClick={() => router.push("/")}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-lg blur-lg opacity-75 group-hover:opacity-100 transition-opacity" />
                <div className="relative bg-black rounded-lg p-2 border border-white/20">
                  <Sparkles className="h-6 w-6 text-teal-400" />
                </div>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                Pactwise
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className="text-white/70 hover:text-white transition-colors duration-300 text-sm font-medium tracking-wide"
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {isSignedIn ? (
              <>
                <Button
                  variant="ghost"
                  className="text-white hover:text-white hover:bg-white/10"
                  onClick={() => router.push("/dashboard")}
                >
                  Dashboard
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  className="text-white hover:text-white hover:bg-white/10"
                  onClick={() => router.push('/auth/sign-in')}
                >
                  Sign In
                </Button>
                <Button 
                  className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-glow"
                  onClick={() => router.push('/auth/sign-up')}
                >
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-white hover:bg-white/10"
                >
                  {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </Button>
              </SheetTrigger>
              <SheetContent 
                side="right" 
                className="w-full sm:w-[400px] bg-black/95 backdrop-blur-xl border-l border-white/10"
              >
                <div className="flex flex-col h-full">
                  {/* Mobile Logo */}
                  <div 
                    className="flex items-center gap-3 mb-8 cursor-pointer"
                    onClick={() => {
                      router.push("/");
                      setMobileMenuOpen(false);
                    }}
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-lg blur-lg opacity-75" />
                      <div className="relative bg-black rounded-lg p-2 border border-white/20">
                        <Sparkles className="h-6 w-6 text-teal-400" />
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-white">
                      Pactwise
                    </span>
                  </div>

                  {/* Mobile Navigation Links */}
                  <nav className="flex-1">
                    <div className="space-y-4">
                      {navItems.map((item) => (
                        <a
                          key={item.href}
                          href={item.href}
                          onClick={(e) => handleNavClick(e, item.href)}
                          className="block text-white/70 hover:text-white transition-colors duration-300 text-lg font-medium py-2"
                        >
                          {item.label}
                        </a>
                      ))}
                    </div>
                  </nav>

                  {/* Mobile Auth Buttons */}
                  <div className="mt-auto space-y-4 pb-8">
                    {isSignedIn ? (
                      <Button 
                        onClick={() => {
                          router.push('/dashboard');
                          setMobileMenuOpen(false);
                        }}
                        className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white"
                      >
                        Go to Dashboard
                      </Button>
                    ) : (
                      <>
                        <Button 
                          variant="outline" 
                          className="w-full border-white/20 text-white hover:bg-white/10"
                          onClick={() => {
                            router.push('/auth/sign-in');
                            setMobileMenuOpen(false);
                          }}
                        >
                          Sign In
                        </Button>
                        <Button 
                          className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white"
                          onClick={() => {
                            router.push('/auth/sign-up');
                            setMobileMenuOpen(false);
                          }}
                        >
                          Get Started
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </Container>
    </nav>
  );
};

export default NavigationPremium;