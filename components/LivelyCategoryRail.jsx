import Link from "next/link";
import { ArrowRight, Camera, Droplets, MessageCircle, ShieldCheck, Sparkles, Sun, Wrench, Zap } from "lucide-react";

const iconMap = { Camera, Droplets, MessageCircle, ShieldCheck, Sparkles, Sun, Wrench, Zap };

export default function LivelyCategoryRail({ items = [] }) {
  return (
    <section className="bg-white px-4 py-5 sm:px-6 lg:px-10 xl:px-12">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-center sm:gap-3">
        {items.map((item, index) => {
          const Icon = iconMap[item.icon] || Sparkles;
          return (
            <Link key={item.label} href={item.href || "#"} className="group animate-fade-up flex min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#ffd92f] hover:shadow-lg" style={{ animation: `fadeUp 0.5s ease-out ${index * 70}ms forwards` }}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fff6bf] text-[#292566] transition duration-300 group-hover:rotate-6 group-hover:bg-[#292566] group-hover:text-[#ffd92f]"><Icon size={17} /></span>
              <span className="min-w-0 flex-1 text-xs font-bold text-slate-700 sm:flex-none sm:text-sm">{item.label}</span>
              <ArrowRight size={14} className="shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#292566]" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
