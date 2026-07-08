"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import WalletButton from "./WalletButton";
import { useWallet } from "@solana/wallet-adapter-react";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/#features" },
  { label: "Markets", href: "/markets" },
  { label: "AI Prediction", href: "/#ai-coach" },
  { label: "Stats", href: "/#stats" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { connected, publicKey, disconnect } = useWallet();
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [tempUsername, setTempUsername] = useState("");
  const [username, setUsername] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    if (connected && publicKey) {
      const saved = localStorage.getItem(`orakick_user_${publicKey.toBase58()}`);
      if (saved) {
        setUsername(saved);
        setShowUsernameModal(false);
      } else {
        setUsername(null);
        setShowUsernameModal(true);
      }
    } else if (!connected) {
      setUsername(null);
      setShowUsernameModal(false);
      setTempUsername("");
    }
  }, [connected, publicKey]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between">
        <a href="/" className="flex items-center">
          <Image src="/logo.png" alt="Orakick" width={300} height={100} className="h-24 w-auto" />
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
          <div className="flex items-center gap-3 relative">
            {username ? (
              <div className="relative">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 bg-forest/10 border border-forest/20 px-4 py-2 rounded-full hover:bg-forest/20 transition-all group"
                >
                  <div className="w-6 h-6 bg-forest rounded-full flex items-center justify-center text-[10px] text-white font-black">
                    {username[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-bold text-forest uppercase tracking-tight">
                    {username}
                  </span>
                  <svg className={`w-3 h-3 text-forest transition-transform ${showUserMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-navy/5 py-2 z-20 animate-in fade-in slide-in-from-top-2">
                      <a href="/profile" className="block px-4 py-2 text-xs font-bold text-navy hover:bg-navy/5 transition-colors">MY PROFILE</a>
                      <a href="/docs" className="block px-4 py-2 text-xs font-bold text-forest hover:bg-forest/5 transition-colors">TECHNICAL DOCS</a>
                      <button 
                        onClick={() => {
                          disconnect();
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors"
                      >
                        DISCONNECT WALLET
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <WalletButton />
            )}
          </div>
          <a
            href="/markets"
            className="px-6 py-2.5 bg-forest text-cream text-sm font-medium rounded-full hover:bg-forest/90 transition-all hover:shadow-lg hover:shadow-forest/20 hover:-translate-y-0.5"
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
          <div className="pt-3 border-t border-sage/20 flex flex-col gap-3">
            <WalletButton />
            <a href="/markets" className="px-4 py-2 bg-forest text-cream text-sm rounded-full text-center">
              Get Started
            </a>
          </div>
        </div>
      )}

      {/* Global Username Creation Modal */}
      {showUsernameModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" />
          <div className="relative bg-cream rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/20">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-forest/10 rounded-full flex items-center justify-center mx-auto text-4xl">⚽</div>
              <h2 className="text-2xl font-black text-navy" style={{ fontFamily: "var(--font-playfair)" }}>Welcome to Orakick</h2>
              <p className="text-navy/50 text-sm">Create your unique username to start predicting match outcomes.</p>
              
              <div className="pt-4 space-y-4">
                <input 
                  type="text" 
                  placeholder="Enter username..." 
                  value={tempUsername}
                  onChange={(e) => setTempUsername(e.target.value)}
                  className="w-full bg-navy/5 border border-navy/10 rounded-2xl px-6 py-4 text-navy font-bold focus:ring-2 ring-forest/30 outline-none text-center"
                />
                <button 
                  onClick={() => {
                    if (tempUsername.trim() && publicKey) {
                      setUsername(tempUsername);
                      localStorage.setItem(`orakick_user_${publicKey.toBase58()}`, tempUsername);
                      setShowUsernameModal(false);
                      // Trigger a page refresh to update all components using this state if necessary, 
                      // or use a global state manager/context in a real app.
                      window.location.reload(); 
                    }
                  }}
                  disabled={!tempUsername.trim()}
                  className="w-full py-4 bg-forest text-white font-bold rounded-2xl hover:bg-forest/90 transition-all shadow-xl shadow-forest/20 disabled:opacity-30"
                >
                  START PREDICTING
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

