import Link from "next/link";
import { MapPin, Phone, Mail } from "lucide-react";
import TruePowerLogo from "./TruePowerLogo";
import FooterClient from "./FooterClient";

export default function Footer() {
  return (
    <footer className="bg-ink text-white/70 mt-0">
      <div className="w-full mx-auto container py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-12 h-12 flex items-center justify-center">
                <TruePowerLogo size={48} />
              </div>
              <span className="font-display font-bold text-white text-lg">
                TruePower
              </span>
            </div>

            <p className="text-sm leading-relaxed mb-5">
              Instant showers, pumps, solar and electrical solutions built for
              Kenyan homes, borehole water, and low-pressure plumbing.
            </p>

            <div className="flex flex-col gap-2 text-sm">
              <a
                href="tel:+254701039256"
                className="flex items-center gap-2 hover:text-white transition-colors"
              >
                <Phone size={14} className="text-brand-400" />
                +254 701 039 256
              </a>

              <a
                href="mailto:info@truepower.co.ke"
                className="flex items-center gap-2 hover:text-white transition-colors"
              >
                <Mail size={14} className="text-brand-400" />
                info@truepower.co.ke
              </a>

              <span className="flex items-center gap-2">
                <MapPin size={14} className="text-brand-400 shrink-0" />
                Nyamakima, Nairobi CBD
              </span>
            </div>
          </div>

          {/* Shop */}
          <div>
            <p className="font-display font-bold text-white text-sm mb-4 uppercase tracking-wider">
              Shop
            </p>

            <ul className="flex flex-col gap-2 text-sm">
              {[
                { label: "All Products", slug: "all" },
                { label: "Instant Showers", slug: "water_heaters" },
                { label: "Bulbs & Lighting", slug: "bulbs_lighting" },
                { label: "Switches & Sockets", slug: "switches_sockets" },
                { label: "Solar Solutions", slug: "solar_solutions" },
                { label: "Water Pumps", slug: "water_pumps" },
              ].map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/shop?category=${item.slug}`}
                    className="hover:text-white transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="font-display font-bold text-white text-sm mb-4 uppercase tracking-wider">
              Company
            </p>

            <ul className="flex flex-col gap-2 text-sm">
              {[
                { l: "About", to: "/about" },
                { l: "Portfolio", to: "/portfolio" },
                { l: "Shop", to: "/shop" },
                { l: "Wishlist", to: "/wishlist" },
              ].map((i) => (
                <li key={i.l}>
                  <Link
                    href={i.to}
                    className="hover:text-white transition-colors"
                  >
                    {i.l}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* WhatsApp CTA */}
          <div>
            <p className="font-display font-bold text-white text-sm mb-4 uppercase tracking-wider">
              Order Now
            </p>

            <p className="text-sm mb-4 leading-relaxed">
              We handle orders directly on WhatsApp — fast, personal service.
            </p>

            <a
              href="https://wa.me/254701039256"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1fb85b] text-white font-display font-semibold text-sm px-4 py-2.5 rounded-xl transition-all"
            >
              Chat on WhatsApp
            </a>
          </div>
        </div>

        <FooterClient />
      </div>
    </footer>
  );
}
