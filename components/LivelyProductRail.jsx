"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Heart, Sparkles } from "lucide-react";
import { useRef } from "react";

function productImage(product) {
  return Array.isArray(product.images) ? product.images[0] : product.image_url || product.images;
}

function categoryName(product) {
  const value = String(product.catLabel || product.category || product.cat || "").toLowerCase();
  if (value.includes("water") || value.includes("shower")) return "Instant showers & heaters";
  if (value.includes("solar")) return "Solar power systems";
  if (value.includes("pump")) return "Water pumps";
  if (value.includes("elect")) return "Electrical supplies";
  if (value.includes("security")) return "Security systems";
  return product.catLabel || product.category || product.cat || "TruePower solutions";
}

export default function LivelyProductRail({ products = [], title = "Featured TruePower solutions", subtitle = "Popular products for homes, rentals, and projects.", mode = "featured", badgeLabel = "Popular" }) {
  const ranked = [...products].sort((a, b) => {
    const score = (product) => {
      const text = `${product.name || ""} ${product.cat || ""} ${product.category || ""}`.toLowerCase();
      if (mode === "new") return new Date(product.created_at || 0).getTime();
      if (mode === "electrical") return (/(bulb|light|plug|socket|switch|cable|electrical)/.test(text) ? 30 : 0) + (/(solar|inverter|battery)/.test(text) ? 15 : 0);
      if (mode === "water") return (/(shower|heater|anlabeier|pump|water)/.test(text) ? 30 : 0);
      return (/(shower|heater|anlabeier|instant)/.test(text) ? 30 : 0) + (/(pump|solar|bulb|lighting|electrical|plug)/.test(text) ? 15 : 0);
    };
    return score(b) - score(a);
  });
  const matching = mode === "new" ? products : ranked.filter((product) => {
    const text = `${product.name || ""} ${product.cat || ""} ${product.category || ""}`.toLowerCase();
    if (mode === "electrical") return /(bulb|light|plug|socket|switch|cable|electrical|solar|inverter|battery)/.test(text);
    if (mode === "water") return /(shower|heater|anlabeier|pump|water)/.test(text);
    return /(shower|heater|anlabeier|instant|pump|solar|bulb|lighting|electrical|plug)/.test(text);
  });
  const visible = matching
    .filter((product) => productImage(product))
    .sort((a, b) => ranked.indexOf(a) - ranked.indexOf(b))
    .slice(0, 10);
  const railRef = useRef(null);
  if (!visible.length) return null;

  return (
    <section className="bg-white px-4 py-8 sm:px-6 lg:px-10 xl:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-500">TruePower catalogue</p><h2 className="mt-1 font-display text-2xl font-extrabold text-slate-950 sm:text-3xl">{title}</h2><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div><div className="flex items-center gap-2"><button type="button" onClick={() => railRef.current?.scrollBy({ left: -500, behavior: "smooth" })} className="rounded-full border border-slate-200 bg-white p-2 text-[#292566] shadow-sm transition hover:-translate-x-1"><ArrowLeft size={15} /></button><button type="button" onClick={() => railRef.current?.scrollBy({ left: 500, behavior: "smooth" })} className="rounded-full bg-[#292566] p-2 text-white shadow-sm transition hover:translate-x-1"><ArrowRight size={15} /></button><Link href="/shop" className="hidden items-center gap-1 text-sm font-bold text-[#292566] sm:inline-flex">View all <ArrowRight size={15} /></Link></div></div>
        <div ref={railRef} className="flex snap-x gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {visible.map((product, index) => {
            const image = productImage(product);
            return <Link href={`/product/${product.id}`} key={product.id || index} className="group w-[210px] shrink-0 snap-start overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:w-[230px]">
              <div className="relative h-48 overflow-hidden bg-[#f5f8ff]"><img src={image} alt={product.name || "TruePower product"} className="h-full w-full object-contain p-3 transition duration-700 group-hover:scale-110" /><span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#292566] shadow-sm"><Sparkles size={11} className="mr-1 inline text-[#f2bd00]" /> {index < 3 ? badgeLabel : "Available"}</span><span className="absolute right-3 top-3 rounded-full bg-white/90 p-1.5 text-slate-400 shadow-sm"><Heart size={14} /></span></div>
              <div className="p-4"><p className="line-clamp-2 min-h-[2.75rem] text-sm font-bold leading-snug text-slate-900">{product.name || "TruePower solution"}</p><p className="mt-2 text-xs text-slate-500">{categoryName(product)}</p><p className="mt-2 text-base font-extrabold text-[#292566]">KSh {Number(product.price || 0).toLocaleString()}</p></div>
            </Link>;
          })}
        </div>
      </div>
    </section>
  );
}
