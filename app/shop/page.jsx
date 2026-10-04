// app/shop/page.jsx
import { createSeo } from "@/components/Seo";
import { Suspense } from "react";
import Loading from "@/components/Loading";
import ShopContent from "@/ui/ShopContent";

// ✅ SEO metadata (SERVER SIDE)
export const metadata = createSeo({
  title: "Shop Instant Showers, Pumps, Solar & Electrical Solutions",
  description:
    "Shop instant showers, pumps, solar solutions, lighting, and electrical gear from TruePower Kenya.",
  path: "/shop",
});

export const dynamic = "force-dynamic";

// ✅ SERVER COMPONENT
export default async function ShopPage({ searchParams }) {
  return (
    <Suspense fallback={<Loading />}>
      <ShopContent searchParams={searchParams} />
    </Suspense>
  );
}
