import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { SITE_URL } from "@/components/Seo";

export const dynamic = "force-dynamic";

const STATIC_ROUTES = [
  {
    url: SITE_URL,
    lastModified: new Date(),
    priority: 1,
    changeFrequency: "daily",
  },
  {
    url: `${SITE_URL}/shop`,
    lastModified: new Date(),
    priority: 0.9,
    changeFrequency: "daily",
  },
  {
    url: `${SITE_URL}/blog`,
    lastModified: new Date(),
    priority: 0.9,
    changeFrequency: "daily",
  },
  {
    url: `${SITE_URL}/portfolio`,
    lastModified: new Date(),
    priority: 0.9,
    changeFrequency: "weekly",
  },
  {
    url: `${SITE_URL}/services`,
    lastModified: new Date(),
    priority: 0.9,
    changeFrequency: "weekly",
  },
  {
    url: `${SITE_URL}/about`,
    lastModified: new Date(),
    priority: 0.8,
    changeFrequency: "monthly",
  },
];

function toDate(value) {
  if (!value) return new Date();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function firstImage(item) {
  const images = Array.isArray(item.images)
    ? item.images
    : item.images
      ? [item.images]
      : [];

  return item.image_url || images[0] || null;
}

export default async function sitemap() {
  if (!hasSupabaseConfig()) {
    return STATIC_ROUTES;
  }

  try {
    const [productsRes, blogsRes] = await Promise.all([
      supabase.from("products").select("id, updated_at, image_url, images"),
      supabase
        .from("blog_posts")
        .select("slug, updated_at, featured_image_url")
        .eq("status", "Published"),
    ]);

    const products = productsRes.data || [];
    const blogs = blogsRes.data || [];

    const productRoutes = products.map((item) => {
      const image = firstImage(item);

      return {
        url: `${SITE_URL}/product/${item.id}`,
        lastModified: toDate(item.updated_at),
        priority: 0.8,
        changeFrequency: "weekly",
        ...(image ? { images: [image] } : {}),
      };
    });

    const blogRoutes = blogs.map((item) => ({
      url: `${SITE_URL}/blog/${item.slug}`,
      lastModified: toDate(item.updated_at),
      priority: 0.7,
      changeFrequency: "weekly",
      ...(item.featured_image_url ? { images: [item.featured_image_url] } : {}),
    }));

    return [...STATIC_ROUTES, ...productRoutes, ...blogRoutes];
  } catch (error) {
    console.error("Sitemap generation failed:", error);
    return STATIC_ROUTES;
  }
}
