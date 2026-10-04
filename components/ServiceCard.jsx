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
import Link from "next/link";
import ServiceImageCarousel from "./ServiceImageCarousel";
const IconMap = {
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
};

function DynamicIcon({ name, size = 24, className = "" }) {
  const Icon = IconMap[name] || Zap;
  return <Icon size={size} className={className} />;
}

export default function ServiceCard({ service, index }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const animationDelay = index * 100;

  return (
    <div
      className="group rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-[0_14px_35px_rgba(7,27,82,0.08)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_22px_50px_rgba(7,27,82,0.16)]"
      style={{
        animation: `fadeUp 0.6s ease-out ${animationDelay}ms forwards`,
        opacity: 0,
      }}
    >
      <ServiceImageCarousel
        images={
          service.images?.length
            ? service.images
            : service.image_url
              ? [{ url: service.image_url, caption: "" }]
              : []
        }
        title={service.title}
      />

      <div className="p-3 sm:p-5 lg:p-7">
        <div className="mb-3 flex items-start justify-between gap-2 sm:mb-4">
          <div>
            <h3 className="mb-1 font-display text-base font-bold leading-tight text-ink transition-colors duration-300 group-hover:text-brand-500 sm:mb-2 sm:text-xl lg:text-2xl">
              {service.title}
            </h3>
            <div className="hidden items-center gap-2 text-sm text-sub sm:flex">
              <Clock size={14} />
              <span>Quick response</span>
              <span className="w-1 h-1 rounded-full bg-sub" />
              <Star size={14} className="text-yellow-400" />
              <span>4.9/5 rating</span>
            </div>
            <div className="sm:hidden">
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[10px] font-medium text-sub">
                <Clock size={11} />
                Quick quote
              </span>
            </div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 transition-all duration-300 group-hover:scale-110 group-hover:bg-brand-500 sm:h-12 sm:w-12 sm:rounded-2xl">
            <DynamicIcon
              name={service.icon_name}
              size={16}
              className="text-brand-500 transition-colors group-hover:text-white sm:h-[22px] sm:w-[22px]"
            />
          </div>
        </div>

        <p className="mb-3 line-clamp-3 text-xs leading-relaxed text-sub sm:mb-5 sm:text-sm lg:text-base">
          {service.description}
        </p>

        {service.badge_text && (
          <div className="mb-3 inline-block rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 sm:mb-4 sm:px-3">
            <span className="text-[10px] font-semibold text-brand-600 sm:text-xs">
              {service.badge_text}
            </span>
          </div>
        )}

        {service.features?.length > 0 && (
          <div
            className={`space-y-2 overflow-hidden transition-all duration-500 ${isExpanded ? "max-h-96" : "max-h-24"}`}
          >
            {service.features
              .slice(0, isExpanded ? undefined : 3)
              .map((feature, idx) => (
                <div
                  key={idx}
                  className="hidden items-center gap-2 text-sm text-ink sm:flex"
                >
                  <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
                    <Check size={10} className="text-emerald-600" />
                  </div>
                  <span>{feature}</span>
                </div>
              ))}
          </div>
        )}

        {service.features?.length > 3 && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-3 hidden items-center gap-1 text-sm font-semibold text-brand-500 transition-colors hover:text-brand-600 sm:flex"
          >
            {isExpanded
              ? "Show less"
              : `Show ${service.features.length - 3} more features`}
            <ArrowRight
              size={14}
              className={`transition-transform duration-300 ${isExpanded ? "rotate-90" : ""}`}
            />
          </button>
        )}

        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-3 sm:mt-6 sm:flex-row sm:gap-3 sm:pt-5">
          <a
            href={`https://wa.me/254701039256?text=${encodeURIComponent(`Hi! I'm interested in your ${service.title} service. Can you share more details?`)}`}
            target="_blank"
            rel="noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-3 py-2 text-[11px] font-semibold text-white shadow-md transition-all duration-300 hover:scale-105 hover:from-brand-600 hover:to-brand-700 sm:rounded-xl sm:px-5 sm:py-2.5 sm:text-sm"
          >
            <MessageCircle size={14} className="sm:h-4 sm:w-4" /> Get Quote
          </a>
          <Link
            href="/shop"
            className="hidden flex-1 items-center justify-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-ink transition-all duration-300 hover:border-brand-300 hover:text-brand-600 sm:flex"
          >
            Products <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
