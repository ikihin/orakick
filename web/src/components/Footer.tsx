import Image from "next/image";

const footerLinks = {
  Company: ["About", "Blog", "Careers", "Press"],
  Products: ["Predictions", "AI Coach", "Leaderboard", "API"],
  Markets: ["World Cup 2026", "Champions League", "Premier League", "La Liga"],
  Support: ["Documentation", "Discord", "Telegram", "Contact"],
};

export default function Footer() {
  return (
    <footer className="relative bg-navy text-cream/80">
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <img
          src="/footer-bg.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-navy/70" />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <Image src="/logo.png" alt="Orakick" width={240} height={80} className="h-20 w-auto brightness-200" />
            <p className="text-sm text-cream/40 leading-relaxed max-w-xs">
              AI-powered World Cup predictions with on-chain settlement on Solana.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-cream/60 mb-4">
                {category}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-cream/40 hover:text-cream transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="border-t border-cream/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-cream/30">
            &copy; 2026 Orakick. All rights reserved. Powered by TxLINE &amp; Solana.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-xs text-cream/30 hover:text-cream/60">
              Privacy
            </a>
            <a href="#" className="text-xs text-cream/30 hover:text-cream/60">
              Terms
            </a>
            <a href="#" className="text-xs text-cream/30 hover:text-cream/60">
              Discord
            </a>
            <a href="#" className="text-xs text-cream/30 hover:text-cream/60">
              Twitter
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
