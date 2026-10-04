"use client";

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

import { useEffect, useState } from "react";

export default function ServiceImageCarousel({ images, title }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const imgCount = images?.length || 0;

  useEffect(() => {
    if (imgCount <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % imgCount);
    }, 4000);
    return () => clearInterval(timer);
  }, [imgCount]);

  if (!imgCount) {
    return (
      <div className="relative w-full h-36 sm:h-56 lg:h-80 xl:h-[26rem] rounded-xl sm:rounded-2xl overflow-hidden bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center">
        <Sparkles size={36} className="text-brand-300 sm:h-12 sm:w-12" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
          <p className="text-center text-xs font-medium text-white sm:text-sm">
            Images coming soon
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl bg-[#f5f8ff] shadow-xl sm:rounded-2xl overflow-hidden">
      <div className="relative h-52 w-full sm:h-56 lg:h-80 xl:h-[26rem]">
        {images.map((img, idx) => (
          <div
            key={idx}
            className="absolute inset-0 w-full h-full"
            style={{
              opacity: idx === currentIndex ? 1 : 0,
              transition: "opacity 1s ease-in-out",
              zIndex: idx === currentIndex ? 1 : 0,
            }}
          >
            <img
              src={img.url}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-55"
            />
            <img
              src={img.url}
              alt={img.caption || title}
              className="relative z-10 h-full w-full object-contain p-2 transition-transform duration-700 group-hover:scale-105 sm:p-4 lg:p-5"
              onError={(e) => {
                e.target.src = "https://placehold.co/800x800?text=TruePower";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-black/10 z-10" />
            {img.caption && (
              <p className="absolute bottom-3 left-3 right-3 text-[11px] font-medium text-white drop-shadow z-20 sm:bottom-6 sm:left-4 sm:right-4 sm:text-sm">
                {img.caption}
              </p>
            )}
          </div>
        ))}
      </div>

      {imgCount > 1 && (
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1 z-20 sm:bottom-4 sm:gap-1.5">
          {images.map((_, idx) => (
            <div
              key={idx}
              className="rounded-full transition-all duration-500"
              style={{
                width: idx === currentIndex ? 16 : 5,
                height: 5,
                background:
                  idx === currentIndex ? "white" : "rgba(255,255,255,0.4)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
