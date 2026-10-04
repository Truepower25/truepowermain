import { createSeo, SITE_URL, DEFAULT_IMAGE } from "@/components/Seo";
import { getPublishedBlogs, getBlogCategories } from "@/lib/blogs.js";
import BlogPosts from "@/components/BlogPosts";
import { Suspense } from "react";
import Loading from "@/components/Loading";

// ✅ SEO metadata
export const metadata = createSeo({
  title: "Blog",
  description:
    "Latest blog updates, guides, and case studies from TruePower Kenya.",
  path: "/blog",
});

export const dynamic = "force-dynamic";

// 🔥 SERVER COMPONENT (SEO CONTENT LOADS HERE)
export default async function PageContent({ searchParams }) {
  const search = (await searchParams).search || "";
  const category = (await searchParams).category || "";
  const page = parseInt((await searchParams).page) || 1;
  const { posts, pagination } = await getPublishedBlogs({
    searchParams: search,
    category: category,
    page: page || 1,
  });
  const categories = await getBlogCategories();
  return (
    <Suspense fallback={<Loading />}>
      <BlogPosts
        posts={posts}
        pagination={pagination}
        categories={categories}
      />
    </Suspense>
  );
}
