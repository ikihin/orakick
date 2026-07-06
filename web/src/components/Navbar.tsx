"use client";

import { useState } from "react";
import Image from "next/image";

const navLinks = [
  { label: "Home", href: "#" },
  { label: "Features", href: "#features" },
  { label: "Markets", href: "#how-it-works" },
  { label: "AI Prediction", href: "#ai-coach" },
  { label: "Stats", href: "#stats" },
  { label: "About", href: "#cta" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="#" className="flex items-center">
          <Image src="/logo.png" alt="Orakick" width={280} height={90} className="h-16 w-auto" />
        </a>

        <div className="hidden md:flex items-center gap-2">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-navy/70 px-4 py-2 rounded-lg hover:bg-forest/20 hover:backdrop-blur-md hover:border hover:border-white/30 hover:text-forest hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] transition-all"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-4">
          <a
            href="#"
            className="text-sm text-navy/70 hover:text-forest transition-colors"
          >
            Sign In
          </a>
          <a
            href="#"
            className="px-5 py-2.5 bg-forest text-cream text-sm font-medium rounded-full hover:bg-forest/90 transition-colors"
          >
            Get Started
          </a>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-navy"
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? (
              <path d="M6 6l12 12M6 18L18 6" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden glass border-t border-sage/20 px-6 py-4 space-y-3">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block text-sm text-navy/70 hover:text-forest"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-3 border-t border-sage/20 flex gap-3">
            <a href="#" className="text-sm text-navy/70">Sign In</a>
            <a href="#" className="px-4 py-2 bg-forest text-cream text-sm rounded-full">
              Get Started
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
