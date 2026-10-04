"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, MessageCircle, Sparkles } from "lucide-react";
import Link from "next/link";

const broadCategoryLabels = [
  "Instant Showers",
  "Water Heaters",
  "Solar & Backup Power",
  "Lighting & Bulbs",
  "Sockets & Plugs",
  "CCTV & Security",
];

function getSmartCategoryLabel(category, index) {
  const text = `${category.label || ""} ${category.title || ""} ${category.category || ""}`.toLowerCase();
  const matches = [
    ["solar", "Solar & Backup Power"],
    ["bulb", "Lighting & Bulbs"],
    ["light", "Lighting & Bulbs"],
    ["socket", "Sockets & Plugs"],
    ["plug", "Sockets & Plugs"],
    ["cctv", "CCTV & Security"],
    ["camera", "CCTV & Security"],
    ["fence", "Electric Fence"],
    ["pump", "Water Pumps"],
    ["heater", "Water Heaters"],
    ["shower", "Instant Showers"],
    ["repair", "Repairs & Maintenance"],
  ];
  const match = matches.find(([keyword]) => text.includes(keyword));
  const isGeneric = !text || /^(product|products|showroom|showroom products|truepower project|installation service|shower & water systems)$/i.test(category.label || "");
  return match?.[1] || (isGeneric ? broadCategoryLabels[index % broadCategoryLabels.length] : category.label);
}

export default function LivelyShowcase({ slides = [], categories = [] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return undefined;
    const timer = setInterval(() => setActive((current) => (current + 1) % slides.length), 5200);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (!slides.length) return null;
  const current = slides[active % slides.length];
  const previous = slides[(active - 1 + slides.length) % slides.length];
  const next = slides[(active + 1) % slides.length];

  return (
    <section className="bg-[#f6f8fc] px-4 py-6 sm:px-6 lg:px-10 xl:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-3 lg:grid-cols-[0.72fr_1.6fr_0.72fr]">
          {[previous, current, next].map((slide, index) => {
            const isMain = index === 1;
            return (
              <article key={`${slide.image}-${index}`} className={`${isMain ? "min-h-[300px] sm:min-h-[390px]" : "hidden min-h-[300px] lg:block"} group relative overflow-hidden rounded-3xl bg-slate-900 shadow-[0_18px_40px_rgba(7,27,82,0.14)]`}>
                <img src={slide.image} alt={slide.title} className="absolute inset-0 h-full w-full object-cover transition duration-1000 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
                <div className={`${isMain ? "p-6 sm:p-8" : "p-5"} absolute inset-x-0 bottom-0 text-white`}>
                  <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#ffd92f]"><Sparkles size={13} /> {slide.kicker}</p>
                  <h2 className={`${isMain ? "text-2xl sm:text-4xl" : "text-lg"} max-w-xl font-display font-extrabold leading-tight`}>{slide.title}</h2>
                  {isMain && <p className="mt-2 max-w-lg text-sm leading-6 text-white/80">{slide.description}</p>}
                  {isMain && <Link href={slide.href || "/shop"} className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#292566] transition hover:scale-105">{slide.action || "Explore now"}<ArrowRight size={15} /></Link>}
                </div>
              </article>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-center gap-3">
          <button type="button" onClick={() => setActive((active - 1 + slides.length) % slides.length)} className="rounded-full bg-white p-2 text-[#292566] shadow-sm transition hover:scale-110"><ArrowLeft size={15} /></button>
          <div className="flex items-center gap-1.5">{slides.map((slide, index) => <button key={slide.image || index} type="button" aria-label={`Show slide ${index + 1}`} onClick={() => setActive(index)} className={`h-1.5 rounded-full transition-all ${index === active ? "w-7 bg-[#292566]" : "w-1.5 bg-slate-300"}`} />)}</div>
          <button type="button" onClick={() => setActive((active + 1) % slides.length)} className="rounded-full bg-white p-2 text-[#292566] shadow-sm transition hover:scale-110"><ArrowRight size={15} /></button>
        </div>
        {categories.length > 0 && <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{categories.map((category, index) => <Link key={`${category.label || "category"}-${index}`} href={category.href || "/shop"} className="group rounded-2xl bg-white p-3 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-[#fff6bf]">{category.image ? <img src={category.image} alt={getSmartCategoryLabel(category, index)} className="h-full w-full object-contain transition duration-500 group-hover:scale-110" /> : <MessageCircle className="text-[#292566]" />}</div><p className="mt-2 text-xs font-bold text-slate-700">{getSmartCategoryLabel(category, index)}</p></Link>)}</div>}
      </div>
    </section>
  );
}
