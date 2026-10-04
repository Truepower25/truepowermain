import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Award,
  Building2,
  Check,
  Clock,
  Droplets,
  HeartHandshake,
  MapPin,
  MessageCircle,
  Shield,
  Sparkles,
  Star,
  Store,
  Sun,
  ThumbsUp,
  Truck,
  Users,
  Wrench,
  Zap,
} from "lucide-react";

import { createSeo } from "@/components/Seo";
import BlogCard from "@/components/BlogCard";
import {
  getGalleryImages,
  getPageContent,
  getTestimonials,
} from "@/lib/supabase";
import { getPublishedBlogs } from "@/lib/blogs";
import { getProducts } from "@/lib/products";
import LivelyTrustStrip from "@/components/LivelyTrustStrip";
import LivelyCategoryRail from "@/components/LivelyCategoryRail";
import LivelyShowcase from "@/components/LivelyShowcase";
import LivelyProductRail from "@/components/LivelyProductRail";

export const metadata = createSeo({
  title: "About TruePower Kenya",
  description:
    "TruePower Kenya supplies instant showers, pumps, solar, and electrical solutions from our Nyamakima showroom in Nairobi.",
  path: "/about",
});

export const dynamic = "force-dynamic";

const IconMap = {
  Users,
  Star,
  Zap,
  MapPin,
  Shield,
  Droplets,
  Sun,
  Store,
  MessageCircle,
  Award,
  Truck,
  Check,
  Clock,
  HeartHandshake,
  Building2,
  Wrench,
  ThumbsUp,
  Sparkles,
};

function DynamicIcon({ name, size = 24, className = "" }) {
  const IconComponent = IconMap[name] || Zap;
  return <IconComponent size={size} className={className} />;
}

const DEFAULT_STATS = [
  { value: "1,000+", label: "Customers served", sublabel: "Across Kenya" },
  { value: "4.9 ★", label: "Average rating", sublabel: "200+ reviews" },
  { value: "Same day", label: "CBD pickup", sublabel: "Mon – Sat" },
  { value: "24/7", label: "WhatsApp support", sublabel: "Reply in minutes" },
];

const DEFAULT_SERVICES = [
  {
    icon: "Droplets",
    title: "Instant showers",
    description:
      "Instant and storage shower systems for Kenyan homes, low pressure, and borehole use.",
    chips: ["Instant showers", "Storage tanks", "Low pressure"],
  },
  {
    icon: "Sun",
    title: "Solar solutions",
    description:
      "Panels, inverters, and battery setups that lower power bills reliably.",
    chips: ["Panels", "Inverters", "Battery setups"],
  },
  {
    icon: "Zap",
    title: "Water pumps",
    description:
      "Booster and transfer pumps for homes, apartments, and compounds.",
    chips: ["Booster", "Submersible", "Pressure tanks"],
  },
  {
    icon: "Store",
    title: "Showroom sales",
    description:
      "Walk-in, compare, ask questions, and pick up same day in Nyamakima.",
    chips: ["Walk-in", "Product demos", "Same day"],
  },
  {
    icon: "Wrench",
    title: "Installation support",
    description:
      "Site advice and setup guidance so products work from day one.",
    chips: ["Site advice", "After-sales", "Setup help"],
  },
  {
    icon: "Building2",
    title: "Electrical supply",
    description:
      "Switches, sockets, and fittings for homes, offices, and projects.",
    chips: ["Switches", "Sockets", "Lighting"],
  },
];

const DEFAULT_VALUES = [
  {
    icon: "Award",
    title: "Proven expertise",
    description: "Right product for real local conditions.",
  },
  {
    icon: "Clock",
    title: "Fast response",
    description: "WhatsApp questions answered quickly.",
  },
  {
    icon: "Shield",
    title: "Quality checked",
    description: "Products we'd trust in our own homes.",
  },
  {
    icon: "ThumbsUp",
    title: "Built for Kenya",
    description: "Local water pressure and power realities.",
  },
];

function showcaseProductName(name = "") {
  const value = String(name).trim();
  if (/industrial plug|industrial socket|ip44/i.test(value)) return "IP44 Industrial Plug 16A/32A";
  return value.length > 42 ? `${value.split(/\s+/).slice(0, 6).join(" ")}…` : value;
}

const DEFAULT_HERO = {
  badge: "About TruePower",
  title: "Kenya's honest guide to hot water and power.",
  subtitle:
    "We help homes and businesses choose products that actually work — tested against local water pressure, borehole conditions, and real installation needs.",
};

export default async function AboutPage() {
  const [content, testimonials, galleryImages, blogData, productData] = await Promise.all([
    getPageContent("about"),
    getTestimonials(),
    getGalleryImages(),
    getPublishedBlogs({ pageSize: 3 }),
    getProducts({ pageSize: 20, limit: 20, sort: "newest" }),
  ]);

  const pageData = content?.main ?? content ?? {};
  const hero = pageData?.hero || DEFAULT_HERO;
  const stats = pageData?.stats?.items || DEFAULT_STATS;
  const services = pageData?.services?.items || DEFAULT_SERVICES;
  const values = pageData?.values?.items || DEFAULT_VALUES;
  const story = pageData?.story || {};
  const showroom = pageData?.showroom || {};
  const cta = pageData?.cta || {};
  const blogPosts = blogData?.posts || [];
  const galleryPreview = (galleryImages || []).slice(0, 4);
  const productPreview = (productData?.data || [])
    .filter((product) => product.image_url || product.images?.[0])
    .slice(0, 4)
    .map((product) => ({
      id: product.id,
      image_url: product.image_url || product.images?.[0],
      title: showcaseProductName(product.name),
      description: product.model || product.catLabel || product.category || "Product",
    }));
  const heroVisuals = [...galleryPreview, ...productPreview]
    .filter((item) => item?.image_url)
    .slice(0, 4);
  const showcaseSlides = [...productPreview, ...galleryPreview].filter((item) => item?.image_url).slice(0, 5).map((item, index) => ({ image: item.image_url, kicker: item.category || (index < productPreview.length ? "TruePower product" : "Completed installation"), title: item.title || item.name || "TruePower solution", description: item.description || item.location || "Real products and completed work for Kenyan homes.", href: index < productPreview.length ? "/shop" : "/portfolio", action: index < productPreview.length ? "Shop this solution" : "View the project" }));
  const showcaseCategories = productPreview.map((item) => ({ image: item.image_url, label: item.title || "Water and power solution", href: "/shop" }));

  const storyParagraphs = story.paragraphs?.length
    ? story.paragraphs
    : [
        "Most instant shower systems on the market are designed for European water quality and pressure standards. They fail fast in Nairobi's borehole-heavy, variable-pressure environment.",
        "We visit factories, test products, and only stock units we'd put in our own homes. Our Nyamakima showroom means you can see and touch every product before buying.",
        "Every sale comes with real advice — we help you pick the right heater for your building, tank position, and water source.",
      ];

  const storyFeatures = story.features?.length
    ? story.features
    : [
        "Borehole Tested",
        "Low Pressure Approved",
        "Solar Compatible",
        "Nairobi Delivery",
        "1 Year Warranty",
        "Expert Support",
      ];

  const heroPills = [
    showroom.address || "Nyamakima, Nairobi CBD",
    "WhatsApp quotes",
    "Install guidance",
  ];

  return (
    <main className="min-h-screen bg-white">
      <LivelyShowcase slides={showcaseSlides} categories={showcaseCategories} />
      <LivelyProductRail products={productData?.data || []} title="Bestselling water & power solutions" subtitle="Instant showers, water heaters, pumps, solar and electrical products." />
      <LivelyProductRail products={productData?.data || []} mode="new" badgeLabel="New" title="New arrivals" subtitle="Fresh products recently added to the TruePower catalogue." />
      <LivelyProductRail products={productData?.data || []} mode="electrical" badgeLabel="Essential" title="Electrical & solar essentials" subtitle="Bulbs, plugs, switches, solar equipment and power accessories." />
      {/* HERO SECTION */}
      <section className="relative overflow-hidden border-b border-orange-100 bg-[linear-gradient(135deg,#fffaf4_0%,#fff_52%,#eef5ff_100%)]">
        <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 animate-drift rounded-full bg-[#ffd92f]/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 animate-float rounded-full bg-[#ff8a65]/15 blur-3xl" />
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Left column */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
                  {hero.badge}
                </span>
              </div>

              <h1 className="animate-fade-up font-display text-4xl font-bold leading-tight text-gray-900 sm:text-5xl lg:text-6xl" style={{ animation: "fadeUp 0.7s ease-out forwards" }}>
                {hero.title}
              </h1>

              <p className="animate-fade-up mt-4 max-w-md text-base leading-relaxed text-gray-600" style={{ animation: "fadeUp 0.7s ease-out 120ms forwards" }}>
                {hero.subtitle}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="https://wa.me/254701039256"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <MessageCircle size={18} />
                  Talk on WhatsApp
                </a>
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                >
                  View products
                  <ArrowRight size={16} />
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-4 pt-4 border-t border-gray-100">
                {heroPills.map((pill) => (
                  <div key={pill} className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                    {pill}
                  </div>
                ))}
              </div>
            </div>

            {/* Right column - image collage with proper sizing */}
            <div className="space-y-3">
              {/* Main large image */}
              <div className="group relative animate-fade-up w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 aspect-[16/9] shadow-lg" style={{ animation: "fadeUp 0.7s ease-out 180ms forwards" }}>
                <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                  <Zap size={48} />
                </div>
                {heroVisuals[0] && (
                  <Image
                    src={heroVisuals[0].image_url}
                    alt={heroVisuals[0].title || "Featured product"}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-[10px] uppercase tracking-wider text-white/70">Featured product</p>
                  <p className="text-base font-semibold text-white">Tankless instant shower</p>
                </div>
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 text-[10px] font-semibold text-blue-600 shadow-sm">
                  40+ products
                </div>
              </div>

              {/* Two smaller images */}
              <div className="grid grid-cols-2 gap-3">
                <div className="group relative animate-fade-up w-full overflow-hidden rounded-xl border border-gray-200 bg-blue-50 aspect-[4/3]" style={{ animation: "fadeUp 0.7s ease-out 300ms forwards" }}>
                  <div className="absolute inset-0 flex items-center justify-center text-blue-200">
                    <Sun size={32} />
                  </div>
                  {heroVisuals[1] && (
                    <Image
                      src={heroVisuals[1].image_url}
                      alt="Solar"
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-[9px] uppercase tracking-wider text-white/70">Solar</p>
                    <p className="text-sm font-medium text-white">Hybrid setup</p>
                  </div>
                </div>
                <div className="group relative animate-fade-up w-full overflow-hidden rounded-xl border border-gray-200 bg-emerald-50 aspect-[4/3]" style={{ animation: "fadeUp 0.7s ease-out 420ms forwards" }}>
                  <div className="absolute inset-0 flex items-center justify-center text-emerald-200">
                    <Store size={32} />
                  </div>
                  {heroVisuals[2] && (
                    <Image
                      src={heroVisuals[2].image_url}
                      alt="Showroom"
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-[9px] uppercase tracking-wider text-white/70">Showroom</p>
                    <p className="text-sm font-medium text-white">Nyamakima</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LivelyTrustStrip />
      <LivelyCategoryRail items={[{ label: "Our story", icon: "Sparkles", href: "#story" }, { label: "What we do", icon: "Zap", href: "#services" }, { label: "Our projects", icon: "Camera", href: "/portfolio" }, { label: "Talk to us", icon: "MessageCircle", href: "https://wa.me/254701039256" }]} />

      {/* STATS SECTION */}
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-y divide-gray-100 md:divide-y-0">
            {stats.map((stat, idx) => (
              <div
                key={stat.label}
                className={`group py-6 px-4 text-center transition duration-300 hover:-translate-y-1 hover:bg-[#fffaf4] ${idx < 2 ? 'border-b border-gray-100 md:border-b-0' : ''} ${idx === 0 || idx === 2 ? 'border-r border-gray-100' : ''}`}
              >
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
                {stat.sublabel && <p className="text-[10px] text-gray-400 mt-0.5">{stat.sublabel}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES SECTION */}
      <section id="services" className="bg-gray-50 py-16 border-b border-gray-100">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600">
              What we do
            </span>
            <h2 className="text-2xl font-semibold mt-3 text-gray-900 sm:text-3xl">
              Complete support for water, power, and electrical needs.
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              From product selection to installation advice, we keep it simple and practical.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service, idx) => (
              <div
                key={service.title}
                className="animate-fade-up flex gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                style={{ animation: `fadeUp 0.55s ease-out ${idx * 90}ms forwards` }}
              >
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <DynamicIcon name={service.icon} size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900">{service.title}</h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{service.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {service.chips.slice(0, 3).map((chip) => (
                      <span key={chip} className="text-[10px] border border-gray-200 rounded-full px-2.5 py-1 text-gray-600 bg-gray-50">
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STORY + VALUES SECTION */}
      <section id="story" className="py-16 bg-white border-b border-gray-100">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left column */}
            <div>
              <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
                Our story
              </span>
              <h2 className="text-2xl font-semibold mt-3 text-gray-900 sm:text-3xl">
                Built by Kenyans, for Kenyan conditions
              </h2>
              <div className="mt-5 space-y-4 text-sm text-gray-600 leading-relaxed">
                {storyParagraphs.map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 mt-6">
                {storyFeatures.map((feature) => (
                  <span
                    key={feature}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700"
                  >
                    <Check size={12} className="text-blue-600" />
                    {feature}
                  </span>
                ))}
              </div>

              <div className="mt-8 bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-xl p-5 border border-gray-100">
                <p className="text-[11px] uppercase tracking-wider text-blue-600 font-semibold">
                  Why customers choose us
                </p>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  {values.map((value) => (
                    <div key={value.title} className="flex gap-3 items-start">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                        <DynamicIcon name={value.icon} size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{value.title}</p>
                        <p className="text-xs text-gray-500 leading-relaxed">{value.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column - Image grid with proper sizing */}
            <div className="grid grid-cols-2 gap-3 auto-rows-min">
              {/* Main image - spans both columns */}
              <div className="group col-span-2 relative w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100 shadow-md aspect-[16/9]">
                <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                  <CameraIcon size={36} />
                </div>
                {galleryPreview[0] && (
                  <Image
                    src={galleryPreview[0].image_url}
                    alt="Recent installation"
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-[9px] uppercase tracking-wider text-white/70">Real project photo</p>
                  <p className="text-sm font-semibold text-white">Recent installation</p>
                </div>
              </div>

              {/* Bottom left image */}
              <div className="group relative w-full overflow-hidden rounded-lg border border-gray-200 bg-blue-50 aspect-[4/3]">
                <div className="absolute inset-0 flex items-center justify-center text-blue-200">
                  <Droplets size={28} />
                </div>
                {galleryPreview[1] && (
                  <Image
                    src={galleryPreview[1].image_url}
                    alt="Borehole setup"
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-[8px] uppercase tracking-wider text-white/70">Installation</p>
                  <p className="text-xs font-medium text-white">Borehole setup</p>
                </div>
              </div>

              {/* Bottom right image */}
              <div className="group relative w-full overflow-hidden rounded-lg border border-gray-200 bg-emerald-50 aspect-[4/3]">
                <div className="absolute inset-0 flex items-center justify-center text-emerald-200">
                  <Sun size={28} />
                </div>
                {galleryPreview[2] && (
                  <Image
                    src={galleryPreview[2].image_url}
                    alt="Hybrid system"
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-[8px] uppercase tracking-wider text-white/70">Solar</p>
                  <p className="text-xs font-medium text-white">Hybrid system</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600">
              Customer feedback
            </span>
            <h2 className="text-2xl font-semibold mt-3 text-gray-900 sm:text-3xl">
              Real customers, real results.
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              What people say after buying, installing, and using our products.
            </p>
          </div>

          {testimonials.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center">
              <Star size={48} className="mx-auto text-gray-300" />
              <p className="mt-4 text-sm text-gray-500">No testimonials yet. Check back soon.</p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-3">
              {testimonials.slice(0, 3).map((testimonial, index) => (
                <div
                  key={testimonial.id || index}
                  className={`animate-fade-up rounded-xl border bg-white p-6 transition duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    index === 0 ? 'border-blue-300 shadow-md' : 'border-gray-200 shadow-sm'
                  }`}
                  style={{ animation: `fadeUp 0.55s ease-out ${index * 100}ms forwards` }}
                >
                  {index === 0 && (
                    <span className="inline-block bg-blue-50 text-blue-600 text-[10px] font-semibold px-2 py-0.5 rounded-full mb-3">
                      Top review
                    </span>
                  )}
                  <div className="flex gap-0.5 text-amber-400 text-sm mb-3">
                    {"★".repeat(5)}
                  </div>
                  <p className="text-sm text-gray-700 italic leading-relaxed">
                    "{testimonial.text}"
                  </p>
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-semibold">
                      {(testimonial.name || "C").charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{testimonial.name}</p>
                      <p className="text-xs text-gray-400">{testimonial.location || "Kenya"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* BLOG SECTION */}
      <section className="py-16 bg-white border-b border-gray-100">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-10">
            <div>
              <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
                From the blog
              </span>
              <h2 className="text-2xl font-semibold mt-3 text-gray-900 sm:text-3xl">
                Helpful reads for better buying decisions.
              </h2>
            </div>
            <Link href="/blog" className="text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1">
              All posts <ArrowRight size={14} />
            </Link>
          </div>

          {blogPosts.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-6 py-16 text-center">
              <p className="text-sm text-gray-500">No blog posts published yet.</p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-3">
              {blogPosts.slice(0, 3).map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-16 bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            <div>
              <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600">
                Come see us
              </span>
              <h2 className="text-2xl font-semibold mt-3 text-gray-900 sm:text-3xl">
                Visit the showroom or start on WhatsApp.
              </h2>
              <p className="text-sm text-gray-500 mt-3">
                See products in person at Nyamakima, ask questions before you buy, or get a quick quote on WhatsApp — whichever works for you.
              </p>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-blue-600 font-semibold">Location</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{showroom.address || "Nyamakima, Nairobi CBD"}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-blue-600 font-semibold">Phone</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{showroom.phone || "+254 701 039 256"}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-blue-600 font-semibold">Hours</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">Mon – Sat, 8am – 6pm</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-blue-600 font-semibold">Support</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">Quotes + install help</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mt-6">
                <a
                  href="https://wa.me/254701039256"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <MessageCircle size={18} />
                  Chat on WhatsApp
                </a>
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                >
                  Browse products
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            {/* Showroom card */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-md">
              <div className="h-32 bg-gradient-to-r from-emerald-100 to-teal-100 flex items-center justify-center">
                <MapPin size={40} className="text-emerald-600" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900">Nyamakima Showroom</h3>
                <p className="text-sm text-gray-500 mt-1">Walk in, compare products in person, and leave with the right choice.</p>
                <div className="mt-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <MapPin size={16} className="text-blue-600 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{showroom.address || "Nyamakima, Nairobi CBD"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MessageCircle size={16} className="text-blue-600 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{showroom.phone || "+254 701 039 256"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock size={16} className="text-blue-600 flex-shrink-0" />
                    <span className="text-sm text-gray-600">Mon – Sat · 8am – 6pm</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Truck size={16} className="text-blue-600 flex-shrink-0" />
                    <span className="text-sm text-gray-600">Same day pickup available</span>
                  </div>
                </div>
                <div className="mt-6 flex flex-col gap-3">
                  <a
                    href="https://wa.me/254701039256"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                  >
                    <MessageCircle size={16} />
                    Chat now on WhatsApp
                  </a>
                  <button className="flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    <MapPin size={14} />
                    Get directions
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 text-center mt-4">No appointment needed</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

// Camera icon component
function CameraIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
