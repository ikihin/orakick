export default function CTA() {
  return (
    <section id="cta" className="relative py-32 px-6 overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <img
          src="/cta-bg.jpeg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-cream/20" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-3xl p-12 md:p-20 overflow-hidden text-center">

          <div className="relative space-y-8 max-w-2xl mx-auto">
            <h2
              className="text-4xl md:text-6xl font-black text-navy tracking-tight leading-[1.1]"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Every Prediction Is A Shot.
              <br />
              <span className="text-golden">Every Profit Is A Goal.</span>
            </h2>

            <p className="text-navy/50 text-lg max-w-lg mx-auto">
              Join thousands of predictors already winning with verified,
              trustless World Cup predictions on Solana.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="#"
                className="px-10 py-4 bg-forest text-cream font-medium rounded-full hover:bg-forest/90 transition-all hover:shadow-lg hover:shadow-forest/20 hover:-translate-y-0.5 text-lg"
              >
                Start Winning Today
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
