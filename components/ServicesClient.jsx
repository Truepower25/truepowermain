"use client";

import { useState } from "react";
import {
  ArrowRight,
  Check,
  Zap,
  Sun,
  Droplets,
  ToggleRight,
  Wrench,
  PhoneCall,
  Sparkles,
  Clock,
  Shield,
  ShieldCheck,
  Star,
  Award,
  Truck,
  MessageCircle,
} from "lucide-react";
import ServiceCard from "./ServiceCard";
import Link from "next/link";

export default function ServicesClient({ services }) {
  const [activeFilter, setActiveFilter] = useState("all");

  const filters = [
    { key: "all", label: "All Services", icon: Sparkles },
    { key: "Security", label: "Security", icon: ShieldCheck },
    { key: "Water", label: "Instant Showers", icon: Droplets },
    { key: "Solar", label: "Solar", icon: Sun },
    { key: "Electrical", label: "Electrical", icon: ToggleRight },
    { key: "Pumps", label: "Pumps", icon: Zap },
    { key: "Repairs", label: "Repairs", icon: Wrench },
    { key: "Consultation", label: "Consultation", icon: PhoneCall },
  ];

  const filteredServices =
    activeFilter === "all"
      ? services
      : services.filter((s) => s.category === activeFilter);

  return (
    <>
      <section className="sticky top-[68px] z-30 border-b border-border bg-white/95 py-5 backdrop-blur-md">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="flex flex-wrap justify-center gap-2 pb-1">
            {filters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={`flex shrink-0 items-center gap-2 px-4 py-2.5 rounded-full font-display font-semibold text-sm transition-all duration-300 sm:px-5 ${
                  activeFilter === filter.key
                    ? "bg-[#292566] text-white shadow-lg scale-105"
                    : "bg-white border border-border text-sub hover:border-brand-300 hover:text-brand-500 hover:scale-105"
                }`}
              >
                <filter.icon size={14} />
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </section>
      <section id="services" className="bg-[#f5f8ff] py-16 lg:py-20">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
          {filteredServices.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles size={40} className="text-brand-300" />
              </div>
              <h3 className="font-display font-bold text-2xl text-ink mb-2">
                Coming Soon
              </h3>
              <p className="text-sub">
                New services are being added. Check back soon!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-2 xl:gap-10">
              {filteredServices.map((service, idx) => (
                <ServiceCard key={service.id} service={service} index={idx} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-16 lg:py-20 bg-gradient-to-br from-brand-50 to-white">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="text-center mb-12">
            <div className="badge mb-4">Why Choose TruePower</div>
            <h2 className="font-display font-extrabold text-3xl lg:text-4xl text-ink mb-4">
              Experience That{" "}
              <span className="text-brand-500">Speaks for Itself</span>
            </h2>
            <p className="text-sub max-w-2xl mx-auto">
              We don&apos;t just sell products - we deliver complete solutions backed
              by years of expertise.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: "Warranty on All Work",
                desc: "All installations come with a service warranty. We stand behind our work.",
                color: "from-blue-500 to-blue-600",
              },
              {
                icon: Truck,
                title: "Same-Day Service",
                desc: "Most Nairobi orders are same-day pickup or delivery. Emergency repairs available.",
                color: "from-emerald-500 to-emerald-600",
              },
              {
                icon: Award,
                title: "Certified Technicians",
                desc: "Our team is trained on all major brands and installation types.",
                color: "from-purple-500 to-purple-600",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="group text-center p-8 rounded-2xl bg-white border border-border hover:shadow-2xl transition-all hover:-translate-y-2"
              >
                <div
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                >
                  <item.icon size={28} className="text-white" />
                </div>
                <h3 className="font-display font-bold text-xl text-ink mb-3">
                  {item.title}
                </h3>
                <p className="text-sub text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20 bg-gradient-to-r from-brand-600 to-brand-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-white blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-12 text-center relative z-10">
          <h2 className="font-display font-extrabold text-3xl lg:text-4xl text-white mb-4">
            Ready to get started?
          </h2>
            <p className="text-brand-100 text-lg mb-8">
            WhatsApp us your requirements - we&apos;ll recommend the right solution
            within minutes.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href="https://wa.me/254701039256"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-3 bg-[#25D366] hover:bg-[#1fb85b] text-white font-display font-bold px-8 py-4 rounded-2xl transition-all hover:scale-110 text-lg shadow-xl"
            >
              <MessageCircle size={24} /> Chat on WhatsApp
            </a>
            <Link
              href="/portfolio"
              className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white font-display font-bold px-8 py-4 rounded-2xl transition-all border border-white/30"
            >
              See Our Work <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
