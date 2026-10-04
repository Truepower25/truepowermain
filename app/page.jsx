import Link from "next/link";
import { getSettings } from "@/lib/common";
import { getProducts } from "@/lib/products";
import ProductCard from "../components/ProductCard";
import { createSeo, SITE_URL, DEFAULT_IMAGE } from "../components/Seo";

export const metadata = createSeo({
  title: "Instant Showers, Solar & Electrical Solutions",
  description:
    "Shop instant showers, pumps, solar solutions, lighting and electrical gear for Kenyan homes.",
  path: "/",
});

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [{ data: products }, settings] = await Promise.all([
    getProducts({ limit: 16 }),
    getSettings(),
  ]);

  const whatsappNum = settings?.whatsapp_number || "254701039256";

  const homeJsonLd = {
    "@context": "https://schema.org",
    "@type": "ElectronicsStore",
    "@id": `${SITE_URL}/#business`,
    name: "TruePower Solutions",
    url: SITE_URL,
    image: DEFAULT_IMAGE,
    logo: `${SITE_URL}/logo.png`,
    description:
      "Instant showers, pumps, solar solutions, lighting and electrical gear for Kenyan homes.",
    telephone: "+254701039256",
    priceRange: "KSh 80 - KSh 30000",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Nairobi",
      addressRegion: "Nairobi County",
      addressCountry: "KE",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: -1.2826347,
      longitude: 36.8299638,
    },
    areaServed: "Kenya",
    hasMap: "https://maps.google.com/?cid=12689537872173264310",
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
      opens: "08:00",
      closes: "18:00",
    },
    sameAs: [],
  };

  return (
    <>
      {/* JSON-LD (SEO structured data) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(homeJsonLd),
        }}
      />

      <main className="min-h-screen bg-white container">
        {/* PRODUCT GRID */}
        <section className=" mx-auto">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h1 className="text-2xl font-bold">Featured Products</h1>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        {/* WHATSAPP CTA */}
        <section className="border-t py-10">
          <div className="mx-auto  text-center">
            <h3 className="text-3xl font-bold mb-4">
              Fast support via WhatsApp
            </h3>

            <a
              href={`https://wa.me/${whatsappNum}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex px-6 py-3 bg-green-600 text-white rounded-xl"
            >
              Chat Now
            </a>
          </div>
        </section>
      </main>
    </>
  );
}
