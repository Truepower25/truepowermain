import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import ServicesClient from "../../components/ServicesClient";
import Link from "next/link";

import { createSeo } from "@/components/Seo";
import ProjectGallery from "@/components/ProjectGallery";
import LivelyTrustStrip from "@/components/LivelyTrustStrip";
import LivelyCategoryRail from "@/components/LivelyCategoryRail";
import LivelyShowcase from "@/components/LivelyShowcase";
import LivelyProductRail from "@/components/LivelyProductRail";
import { getProducts } from "@/lib/products";
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

// ✅ SEO
export const metadata = createSeo({
  title: "Services",
  description:
    "Expert installation and repair services for instant showers, solar systems, inverters, CCTV, electric fences, and more across Nairobi.",
  path: "/services",
});

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  let services = [];
  if (hasSupabaseConfig()) {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("order_index", { ascending: true });

    if (error) {
      console.error(error);
    }
    services = data || [];
  }
  const productData = await getProducts({ pageSize: 30, limit: 30, sort: "newest" });
  const stats = [
    { value: "500+", label: "Projects Completed", icon: Award },
    { value: "98%", label: "Customer Satisfaction", icon: Star },
    { value: "24/7", label: "WhatsApp Support", icon: MessageCircle },
    { value: "2hr", label: "Response Time", icon: Clock },
  ];
  const serviceSlides = services.flatMap((service) => (service.images?.length ? service.images.slice(0, 1).map((image) => ({ image: image.url || image, kicker: service.category || "TruePower service", title: service.title, description: service.description || "Professional support from quote to completion.", href: "#services", action: "Explore service" })) : service.image_url ? [{ image: service.image_url, kicker: service.category || "TruePower service", title: service.title, description: service.description || "Professional support from quote to completion.", href: "#services", action: "Explore service" }] : []));
  const serviceVisuals = serviceSlides.filter((slide) => slide.image).slice(0, 3);
  return (
    <main className="min-h-screen bg-white overflow-x-hidden">
      <LivelyShowcase slides={serviceSlides} categories={services.slice(0, 6).map((service) => ({ image: service.images?.[0]?.url || service.image_url, label: service.title || "Installation service", href: "#services" })).filter((item) => item.image)} />
      <LivelyProductRail products={productData?.data || []} title="Products we install and support" subtitle="Choose the right shower, heater, pump, solar or electrical solution." />
      <LivelyProductRail products={productData?.data || []} mode="electrical" badgeLabel="Service essential" title="Power & electrical essentials" subtitle="Reliable bulbs, plugs, switches, solar and backup-power equipment." />
      <section className="relative flex min-h-[60vh] items-center overflow-hidden border-b border-orange-100 bg-[linear-gradient(135deg,#fffaf4_0%,#fff_52%,#eef5ff_100%)]">
        <div className="absolute inset-0">
          <div className="absolute -left-20 top-20 h-96 w-96 animate-drift rounded-full bg-[#ffd92f]/25 blur-3xl" />
          <div className="absolute -right-20 bottom-20 h-96 w-96 animate-float rounded-full bg-[#ff8a65]/15 blur-3xl" />
        </div>

        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:px-10 xl:px-12">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-4 py-1.5 shadow-sm backdrop-blur">
              <Sparkles size={16} className="text-brand-500" />
              <span className="text-slate-700 text-sm font-medium">
                Expert Services in Nairobi
              </span>
            </div>
            <h1 className="animate-fade-up font-display font-extrabold text-4xl sm:text-6xl lg:text-7xl text-slate-950 mb-6 leading-tight" style={{ animation: "fadeUp 0.7s ease-out forwards" }}>
              Professional <br />
              <span className="text-brand-500">Installation & Repair</span>
            </h1>
            <p className="animate-fade-up text-slate-600 text-base sm:text-lg lg:text-xl mb-8 max-w-xl leading-relaxed" style={{ animation: "fadeUp 0.7s ease-out 120ms forwards" }}>
              From electric fence and CCTV to instant showers, solar systems,
              inverters, and appliance repair - Nairobi&apos;s most trusted service
              team.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="https://wa.me/254701039256"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-full bg-[#ffd92f] px-8 py-3.5 font-display font-bold text-slate-950 shadow-lg transition-all hover:scale-105"
              >
                <MessageCircle size={18} /> Talk to an Expert
              </a>
              <Link
                href="/portfolio"
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-8 py-3.5 font-display font-bold text-slate-700 shadow-sm transition-all hover:scale-105"
              >
                View Portfolio <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <div className="relative w-full max-w-2xl justify-self-end">
            {serviceVisuals.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="group relative col-span-2 aspect-[16/9] overflow-hidden rounded-[1.75rem] border border-white/80 bg-slate-100 shadow-[0_24px_60px_rgba(15,23,42,0.18)] animate-fade-up" style={{ animation: "fadeUp 0.7s ease-out 180ms forwards" }}>
                  <img src={serviceVisuals[0].image} alt={serviceVisuals[0].title || "TruePower installation service"} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#061b45]/85 via-[#061b45]/10 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 sm:bottom-5 sm:left-5 sm:right-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#ffd92f]">Featured service</p>
                    <p className="mt-1 font-display text-lg font-extrabold text-white sm:text-2xl">{serviceVisuals[0].title || "Professional installation"}</p>
                  </div>
                  <div className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-[#12336b] shadow-sm">TruePower team</div>
                </div>
                {serviceVisuals.slice(1, 3).map((visual, index) => (
                  <div key={`${visual.image}-${index}`} className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/80 bg-slate-100 shadow-lg animate-fade-up" style={{ animation: `fadeUp 0.7s ease-out ${320 + index * 120}ms forwards` }}>
                    <img src={visual.image} alt={visual.title || "TruePower service"} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#061b45]/80 via-transparent to-transparent" />
                    <p className="absolute bottom-3 left-3 right-3 text-sm font-bold text-white sm:text-base">{visual.title || "Installation & repair"}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex aspect-[16/10] items-center justify-center rounded-[1.75rem] bg-[#09295f] p-8 text-center text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
                <div>
                  <Wrench className="mx-auto mb-4 text-[#ffd92f]" size={48} />
                  <p className="font-display text-2xl font-extrabold">Installation. Repair. Support.</p>
                  <p className="mt-2 text-sm text-blue-100">Reliable TruePower service from quote to completion.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <LivelyTrustStrip items={["FAST QUOTES", "CERTIFIED TECHNICIANS", "SAME-DAY NAIROBI SERVICE", "WARRANTY ON OUR WORK", "WHATSAPP SUPPORT"]} />
      <LivelyCategoryRail items={[{ label: "Instant showers", icon: "Droplets", href: "#services" }, { label: "Solar systems", icon: "Sun", href: "#services" }, { label: "Electrical", icon: "Zap", href: "#services" }, { label: "Repairs", icon: "Wrench", href: "#services" }]} />

      <section className="border-b border-border bg-white relative z-10 container">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center group">
                <div className="text-brand-500 mb-2 flex justify-center group-hover:scale-110 transition-transform duration-300">
                  <stat.icon size={28} />
                </div>
                <p className="font-display font-extrabold text-3xl text-ink">
                  {stat.value}
                </p>
                <p className="text-sub text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <ServicesClient services={services} />
    </main>
  );
}
