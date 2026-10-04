import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Award,
  Briefcase,
  Camera,
  Droplets,
  MapPin,
  MessageCircle,
  Shield,
  Sparkles,
  Star,
  Store,
  Sun,
  Truck,
  Users,
  Clock,
  Phone,
} from "lucide-react";

import { getGalleryImages, getTestimonials, getPageContent } from "@/lib/supabase";
import { createSeo } from "@/components/Seo";
import ProjectGallery from "@/components/ProjectGallery";
import LivelyTrustStrip from "@/components/LivelyTrustStrip";
import LivelyCategoryRail from "@/components/LivelyCategoryRail";
import LivelyShowcase from "@/components/LivelyShowcase";
import LivelyProductRail from "@/components/LivelyProductRail";
import { getProducts } from "@/lib/products";

export const metadata = createSeo({
  title: "Portfolio & Installations",
  description:
    "Browse TruePower Kenya projects, customer testimonials, and proof of installation quality across Nairobi and beyond.",
  path: "/portfolio",
});

export const dynamic = "force-dynamic";

const PortfolioIconMap = {
  Star,
  MessageCircle,
  MapPin,
  Users,
  Sparkles,
  Award,
  Truck,
  Shield,
  Droplets,
  Sun,
  Store,
  Camera,
  Briefcase,
};

function portfolioCategoryLabel(category = "") {
  const value = String(category).toLowerCase();
  if (value === "product") return "Shower & Water Systems";
  if (value === "showroom") return "Showroom Products";
  if (value === "installation") return "Completed Installation";
  if (value === "solar") return "Solar Installation";
  return category || "TruePower Project";
}

function DynamicPortfolioIcon({ name, size = 24, className = "" }) {
  const IconComponent = PortfolioIconMap[name] || Sparkles;
  return <IconComponent size={size} className={className} />;
}

export default async function PortfolioPage() {
  const [galleryImages, testimonials, content, productData] = await Promise.all([
    getGalleryImages(),
    getTestimonials(),
    getPageContent("portfolio"),
    getProducts({ pageSize: 30, limit: 30, sort: "newest" }),
  ]);

  const pageData = content?.main ?? content ?? {};

  const categories = pageData?.galleryCategories || [
    { key: "all", label: "All Work", icon: <Briefcase size={14} /> },
    { key: "installation", label: "Installations", icon: <Camera size={14} /> },
    { key: "showroom", label: "Showroom", icon: <Store size={14} /> },
    { key: "product", label: "Products", icon: <Droplets size={14} /> },
  ];

  const stats =
    pageData?.stats?.items ||
    pageData?.stats || [
      { value: "1,000+", label: "Customers served", icon: "Users", trend: "Growing across Kenya" },
      { value: "4.9 ★", label: "Average rating", icon: "Star", trend: "Based on 200+ reviews" },
      { value: "Same day", label: "Nairobi CBD pickup", icon: "Truck", trend: "Mon – Sat" },
      { value: "24/7", label: "WhatsApp support", icon: "MessageCircle", trend: "Reply within minutes" },
    ];

  const hero =
    pageData?.hero || {
      badge: "Portfolio",
      title: "Hot water that works —",
      titleAccent: "proof included.",
      subtitle:
        "Real installs, real reviews, and products tested against Kenyan water pressure. Browse the work, then let us help you choose.",
    };

  const gallerySection =
    pageData?.gallerySection || {
      title: "Recent Projects",
      subtitle: "Installations, showroom photos, and product highlights from completed work.",
    };

  const testimonialsSection =
    pageData?.testimonialsSection || {
      title: "Reviews",
      subtitle: "Verified buyers across Nairobi and beyond.",
    };

  const promiseSection =
    pageData?.promiseSection || {
      title: "Why TruePower",
      subtitle: "Built around Kenyan conditions",
    };

  const cta =
    pageData?.cta || {
      title: "Let's get you the right product — fast.",
      subtitle:
        "Tell us your setup on WhatsApp and we'll match you with the right instant shower, pump, or solar solution the same day.",
      button_text: "Start on WhatsApp",
      button_link: "https://wa.me/254701039256",
    };

  const heroShots = (galleryImages || []).filter((image) => image?.image_url).slice(0, 3);
  const showcaseSlides = heroShots.map((shot) => ({ image: shot.image_url, kicker: portfolioCategoryLabel(shot.category), title: shot.title || shot.description || portfolioCategoryLabel(shot.category), description: shot.location || "A completed TruePower installation in Kenya.", href: "#projects", action: "View this project" }));

  const processSteps = [
    {
      step: "01",
      icon: MessageCircle,
      title: "Share your setup",
      desc: "Water pressure, building type, borehole or mains — just tell us what you're working with.",
    },
    {
      step: "02",
      icon: Award,
      title: "Get a clear pick",
      desc: "We recommend the right product, explain the trade-offs, and keep the pricing clear.",
    },
    {
      step: "03",
      icon: Truck,
      title: "Pick up or deliver",
      desc: "Visit the Nyamakima showroom or arrange delivery with installation support where needed.",
    },
  ];

  const promiseCards = [
    {
      icon: Shield,
      title: "Local conditions first",
      desc: "Every product is vetted for Kenyan water pressure, borehole use, and installation reality.",
    },
    {
      icon: Droplets,
      title: "Low-pressure ready",
      desc: "Heaters and pumps that perform in difficult pressure conditions — not just high-flow homes.",
    },
    {
      icon: Sun,
      title: "Solar-compatible",
      desc: "Options designed to work alongside existing solar systems and cut monthly power costs.",
    },
    {
      icon: Store,
      title: "See it before buying",
      desc: "Nyamakima showroom — compare products in person and ask questions with no pressure.",
    },
  ];

  return (
    <main className="min-h-screen bg-white overflow-x-hidden">
      <LivelyShowcase slides={showcaseSlides} categories={(galleryImages || []).slice(0, 6).map((image) => ({ image: image.image_url, label: image.title || portfolioCategoryLabel(image.category), href: "#projects" }))} />
      <LivelyProductRail products={productData?.data || []} title="Products behind the projects" subtitle="Explore the instant showers, water heaters, pumps and electrical products we install." />
      <LivelyProductRail products={productData?.data || []} mode="water" badgeLabel="Installation pick" title="Water systems we install" subtitle="Shower heads, instant heaters, pumps and complete water-heating solutions." />

      {/* ── HERO ── */}
      <section className="relative overflow-hidden border-b border-orange-100 bg-[linear-gradient(135deg,#fffaf4_0%,#fff_52%,#eef5ff_100%)] text-slate-950">
        <div className="pointer-events-none absolute -left-24 top-12 h-72 w-72 animate-drift rounded-full bg-[#ffd92f]/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 animate-float rounded-full bg-[#ff8a65]/15 blur-3xl" />
        <div className="mx-auto grid w-full gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-10 lg:py-20 xl:px-12">

          {/* Left */}
          <div>
            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-6">
              <span className="inline-block h-2 w-2 rounded-full bg-[#ffd92f]" />
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-4 py-1.5 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur">
                <Camera size={14} className="text-brand-500" />
                {hero.badge || "Portfolio"}
              </div>
            </div>

            {/* Headline — two-tone */}
            <h1 className="animate-fade-up mt-2 max-w-2xl font-display text-4xl font-extrabold leading-tight text-slate-950 sm:text-5xl lg:text-6xl" style={{ animation: "fadeUp 0.7s ease-out forwards" }}>
              {hero.title || "Hot water that works —"}
              <span className="text-brand-500"> {hero.titleAccent || "proof included."}</span>
            </h1>

            <p className="animate-fade-up mt-5 max-w-xl text-base leading-8 text-slate-600 sm:text-lg" style={{ animation: "fadeUp 0.7s ease-out 120ms forwards" }}>
              {hero.subtitle ||
                "Real installs, real reviews, and products tested against Kenyan water pressure. Browse the work, then let us help you choose."}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={cta.button_link || "https://wa.me/254701039256"}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#ffd92f] px-6 py-3 font-display font-bold text-slate-950 transition-transform hover:scale-105 shadow-sm"
              >
                <MessageCircle size={18} />
                WhatsApp Us
              </a>
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 font-display font-bold text-slate-700 transition-transform hover:scale-105 shadow-sm"
              >
                Browse Products
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {["Instant showers", "Solar", "Pumps", "Showroom · Nyamakima"].map((pill) => (
                <span
                  key={pill}
                  className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur"
                >
                  {pill}
                </span>
              ))}
            </div>
          </div>

          {/* Right — image grid */}
          <div className="flex flex-col gap-4">
            {heroShots.length > 0 ? (
              <>
                {/* Main featured image */}
                <div className="relative animate-fade-up overflow-hidden rounded-[1.75rem] border border-white/15 bg-slate-50 shadow-[0_24px_60px_rgba(0,0,0,0.22)] aspect-[4/5] sm:aspect-[16/10]" style={{ animation: "fadeUp 0.7s ease-out 180ms forwards" }}>
                  <Image
                    src={heroShots[0].image_url}
                    alt={heroShots[0].title || "TruePower installation"}
                    fill
                    className="object-contain p-3 sm:object-cover sm:p-0"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                  {/* Photo count badge */}
                  <div className="absolute top-4 right-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-brand-600 shadow-sm">
                    {galleryImages?.length || 0} photos
                  </div>

                  <div className="absolute left-4 right-4 bottom-4">
                    <p className="text-[10px] uppercase tracking-[0.26em] text-white/70">Featured install</p>
                    <p className="mt-1 font-display text-lg font-bold text-white sm:text-xl">
                      {heroShots[0].title || "TruePower"}
                    </p>
                    <p className="mt-0.5 text-xs text-white/70">
                      {[heroShots[0].description, heroShots[0].location, heroShots[0].category]
                        .filter(Boolean)
                        .join(" · ") || "Project highlight"}
                    </p>
                  </div>
                </div>

                {/* Two smaller images */}
                {heroShots.length > 1 && (
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {heroShots.slice(1, 3).map((shot, i) => (
                      <div
                        key={shot.image_url}
                        className="relative animate-fade-up overflow-hidden rounded-[1.5rem] border border-white/15 bg-slate-50 shadow-lg aspect-[4/5] sm:h-48 sm:aspect-auto"
                        style={{ animation: `fadeUp 0.7s ease-out ${350 + i * 120}ms forwards` }}
                      >
                        <Image
                          src={shot.image_url}
                          alt={shot.title || "TruePower installation"}
                          fill
                          className="object-contain p-2 sm:object-cover sm:p-0"
                          sizes="(max-width: 768px) 50vw, 25vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-transparent" />
                        <div className="absolute left-3 right-3 bottom-3">
                          <p className="text-[10px] uppercase tracking-[0.22em] text-white/70">
                            {shot.category || "Installation"}
                          </p>
                          <p className="mt-0.5 font-display text-sm font-bold text-white">
                            {shot.title || "TruePower"}
                          </p>
                          {(shot.location || shot.description) && (
                            <p className="mt-0.5 text-[10px] text-white/65">
                              {shot.location || shot.description}
                            </p>
                          )}
                        </div>
                        {i === 1 && galleryImages?.length > 3 && (
                          <div className="absolute top-3 right-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-brand-600">
                            +{galleryImages.length - 3} more
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-[1.5rem] border border-border bg-white p-6 text-center shadow-sm">
                <Camera size={40} className="mx-auto text-faint mb-4" />
                <p className="font-display font-bold text-ink">Real photos loading</p>
                <p className="mt-2 text-sm text-sub">
                  Add gallery photos from the dashboard to fill this portfolio panel.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <LivelyTrustStrip items={["REAL PROJECT PHOTOS", "INSTALLATION SUPPORT", "TRUSTED ACROSS NAIROBI", "WHATSAPP QUOTES", "SEE IT. CHOOSE IT. INSTALL IT."]} />
      <LivelyCategoryRail items={[{ label: "All work", icon: "Camera", href: "#projects" }, { label: "Installations", icon: "Wrench", href: "#projects" }, { label: "Water systems", icon: "Droplets", href: "#projects" }, { label: "Solar projects", icon: "Sun", href: "#projects" }]} />

      <section className="border-b border-border bg-white">
        <div className="mx-auto w-full px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border">
            {stats.map((stat) => (
              <div key={stat.label} className="py-8 px-6 text-center">
                <div className="mb-2 flex justify-center text-brand-500">
                  {typeof stat.icon === "string" ? (
                    <DynamicPortfolioIcon name={stat.icon} size={20} />
                  ) : (
                    stat.icon
                  )}
                </div>
                <p className="font-display text-2xl font-extrabold text-ink">{stat.value}</p>
                <p className="mt-1 text-sm font-medium text-ink">{stat.label}</p>
                {stat.trend && (
                  <p className="mt-1 text-xs text-sub">{stat.trend}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROCESS ── */}
      <section className="bg-muted border-b border-border py-16 lg:py-20">
        <div className="mx-auto w-full px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <div className="badge mb-4">How it works</div>
            <h2 className="font-display text-3xl font-extrabold text-ink sm:text-4xl">
              Three steps to the right product
            </h2>
            <p className="mt-4 text-sub">
              No back-and-forth. Tell us your setup and we'll guide you to the right choice.
            </p>
          </div>

          <div className="relative grid gap-4 lg:grid-cols-3">
            {/* Dashed connector lines on desktop */}
            <div className="absolute hidden lg:block top-10 left-[calc(33.33%+8px)] right-[calc(33.33%+8px)] h-px border-t border-dashed border-border" />

            {processSteps.map((step) => {
              const StepIcon = step.icon;
              return (
                <article
                  key={step.step}
                  className="relative rounded-[1.75rem] border border-border bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
                      <StepIcon size={22} />
                    </div>
                    <div className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold tracking-[0.2em] text-sub">
                      {step.step}
                    </div>
                  </div>
                  <h3 className="mt-6 text-xl font-display font-bold text-ink">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-sub">{step.desc}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── GALLERY ── */}
      <section id="projects" className="bg-white">
        <ProjectGallery
          galleryImages={galleryImages || []}
          categories={categories}
          gallerySection={gallerySection}
        />
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="bg-muted border-b border-border py-16 lg:py-20">
        <div className="mx-auto w-full px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <div className="badge mb-4">{testimonialsSection.title}</div>
            <h2 className="font-display text-3xl font-extrabold text-ink sm:text-4xl">
              What customers say
            </h2>
            <p className="mt-4 text-sub">{testimonialsSection.subtitle}</p>
          </div>

          {testimonials.length === 0 ? (
            <div className="rounded-[1.75rem] border border-border bg-white px-6 py-16 text-center shadow-sm">
              <Star size={48} className="mx-auto text-faint" />
              <p className="mt-4 text-sub">No testimonials yet. Check back soon.</p>
              <p className="mt-2 text-sm text-faint">Admins can add testimonials in the dashboard.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {testimonials.map((testimonial, index) => {
                const isFirst = index === 0;
                return (
                  <article
                    key={testimonial.id || index}
                    className={`rounded-[1.75rem] border bg-white p-5 shadow-sm flex flex-col justify-between ${
                      isFirst ? "border-brand-400 border-2" : "border-border"
                    }`}
                  >
                    <div>
                      {isFirst && (
                        <span className="inline-block mb-3 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
                          Top review
                        </span>
                      )}
                      <div className="flex gap-1 text-yellow-400">
                        {[...Array(5)].map((_, starIndex) => (
                          <Star
                            key={starIndex}
                            size={15}
                            fill={starIndex < Number(testimonial.rating || 5) ? "currentColor" : "none"}
                          />
                        ))}
                      </div>
                      <p className="mt-4 text-sm leading-6 text-ink italic line-clamp-6">
                        &quot;{testimonial.text}&quot;
                      </p>
                    </div>
                    <div className="mt-6 flex items-center gap-3 border-t border-border pt-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 font-display font-bold text-brand-600 flex-shrink-0">
                        {(testimonial.name || "C").charAt(0)}
                      </div>
                      <div>
                        <p className="font-display font-semibold text-ink">{testimonial.name}</p>
                        <p className="flex items-center gap-1 text-xs text-sub">
                          <MapPin size={10} />
                          {testimonial.location || "Kenya"}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── PROMISE ── */}
      <section className="bg-white border-b border-border py-16 lg:py-20">
        <div className="mx-auto w-full px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <div className="badge mb-4">{promiseSection.title}</div>
            <h2 className="font-display text-3xl font-extrabold text-ink sm:text-4xl">
              {promiseSection.subtitle}
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {promiseCards.map((card) => {
              const CardIcon = card.icon;
              return (
                <article
                  key={card.title}
                  className="rounded-[1.5rem] border border-border bg-white p-5 shadow-sm"
                >
                  <div className="h-1 w-8 rounded-full bg-brand-500 mb-5" />
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
                    <CardIcon size={22} />
                  </div>
                  <h3 className="mt-5 text-lg font-display font-bold text-ink">{card.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-sub">{card.desc}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-muted py-16 lg:py-20">
        <div className="mx-auto grid w-full gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-start lg:px-10 xl:px-12">

          {/* Left — context */}
          <div>
            <div className="badge mb-4">Ready to order?</div>
            <h2 className="mt-4 max-w-xl font-display text-3xl font-extrabold text-ink sm:text-4xl">
              {cta.title || "Let's get you the right product — fast."}
            </h2>
            <p className="mt-4 max-w-xl text-sub leading-7">
              {cta.subtitle ||
                "Tell us your setup on WhatsApp and we'll match you with the right instant shower, pump, or solar solution the same day."}
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              {[
                { label: "Location", value: "Nyamakima, Nairobi CBD", icon: MapPin },
                { label: "Phone", value: "+254 701 039 256", icon: Phone },
                { label: "Hours", value: "Mon – Sat, 8am – 6pm", icon: Clock },
                { label: "Support", value: "Quotes + installation help", icon: MessageCircle },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-[1.35rem] border border-border bg-white p-4 shadow-sm">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-brand-500 flex items-center gap-1.5">
                    <Icon size={11} />
                    {label}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-ink">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — action card */}
          <div className="rounded-[1.75rem] border border-border bg-white p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-brand-500">TruePower contact</p>
                <p className="mt-2 text-2xl font-display font-bold text-ink">Chat with us now</p>
                <p className="mt-1 text-sm text-sub">Usually replies within a few minutes</p>
              </div>
              <div className="rounded-2xl bg-brand-50 p-3 text-brand-500 flex-shrink-0">
                <MessageCircle size={24} />
              </div>
            </div>

            <div className="mb-6 space-y-3 border-t border-border pt-6">
              {[
                { icon: MapPin, text: "Nyamakima, Nairobi CBD" },
                { icon: Phone, text: "+254 701 039 256" },
                { icon: Truck, text: "Pickup, delivery, and installation support" },
                { icon: Clock, text: "Mon – Sat · 8am – 6pm" },
              ].map(({ icon: Icon, text }) => (
                <p key={text} className="flex items-center gap-2 text-sm text-sub">
                  <Icon size={15} className="text-brand-500 flex-shrink-0" />
                  {text}
                </p>
              ))}
            </div>

            <a
              href={cta.button_link || "https://wa.me/254701039256"}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-6 py-3.5 font-display font-bold text-white transition-transform hover:scale-[1.02] shadow-sm"
            >
              <MessageCircle size={18} />
              {cta.button_text || "Start on WhatsApp"}
            </a>

            <p className="mt-3 text-center text-xs text-faint">No account needed — just chat</p>

            <div className="mt-5 pt-5 border-t border-border flex justify-center">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-5 py-2.5 font-display font-bold text-ink text-sm transition-transform hover:scale-[1.02]"
              >
                Browse Products
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>

        </div>
      </section>

    </main>
  );
}
