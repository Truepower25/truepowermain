"use client";

export default function FooterClient() {
  const year = new Date().getFullYear();

  return (
    <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
      <p className="text-xs text-white/30">
        © {year ?? ""} TruePower Kenya. All rights reserved.
      </p>
      <p className="text-xs text-white/30">Built for Kenyan homes 🇰🇪</p>
    </div>
  );
}
