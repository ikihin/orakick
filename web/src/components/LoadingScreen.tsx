"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export default function LoadingScreen() {
  const [loaded, setLoaded] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loaded) {
      const hideTimer = setTimeout(() => setHidden(true), 600);
      return () => clearTimeout(hideTimer);
    }
  }, [loaded]);

  if (hidden) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-cream transition-opacity duration-500 ${
        loaded ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Spinning soccer ball */}
      <div className="relative mb-8">
        <div className="text-6xl animate-spin-slow">⚽</div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full border-2 border-sage/30 border-t-forest animate-spin" style={{ animationDuration: "1s" }} />
        </div>
      </div>

      {/* Brand */}
      <div className="mb-4">
        <Image 
          src="/logo.png" 
          alt="Orakick" 
          width={300} 
          height={100} 
          className="h-32 w-auto object-contain" 
          priority
        />
      </div>

      {/* Loading bar */}
      <div className="w-48 h-1 bg-navy/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-forest rounded-full transition-all duration-[1800ms] ease-out"
          style={{ width: loaded ? "100%" : "85%" }}
        />
      </div>

      <p className="text-xs text-navy/40 mt-4 tracking-wider uppercase">
        Preparing the pitch...
      </p>
    </div>
  );
}
