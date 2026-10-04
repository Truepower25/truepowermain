"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import BlogCard from "@/components/BlogCard";

export default function BlogClient({ initialPosts, initialCategories }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const posts = initialPosts;
  const categories = initialCategories;
  const activeCategory = searchParams.get("category") || "";

  // filter (client only for UX)
  const filteredPosts = useMemo(() => {
    if (!activeCategory) return posts;
    return posts.filter((p) => p.category === activeCategory);
  }, [posts, activeCategory]);

  const featuredPost = filteredPosts[0];
  const remainingPosts = filteredPosts.slice(1);

  const handleCategoryClick = (category) => {
    const next = activeCategory === category ? "" : category;

    router.push(next ? `/blog?category=${encodeURIComponent(next)}` : "/blog");
  };

  return (
    <main className="min-h-screen bg-white container">
      {/* HEADER */}
      <section className="border-b pb-6">
        <h1 className="text-4xl font-bold">TruePower Journal</h1>
        <p className="text-gray-600">Installation guides & solar insights</p>
      </section>

      {/* CATEGORIES */}
      <div className="mt-6 flex gap-2 overflow-x-auto">
        <button
          onClick={() => handleCategoryClick("")}
          className={`px-4 py-2 rounded-full ${
            !activeCategory ? "bg-black text-white" : "bg-gray-200"
          }`}
        >
          All
        </button>

        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoryClick(cat)}
            className={`px-4 py-2 rounded-full ${
              activeCategory === cat ? "bg-black text-white" : "bg-gray-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* POSTS (NOW SEO INDEXED) */}
      <section className="mt-8 grid gap-5 md:grid-cols-3">
        {featuredPost && <BlogCard post={featuredPost} featured />}

        {remainingPosts.map((post) => (
          <BlogCard key={post.id} post={post} />
        ))}
      </section>

      {filteredPosts.length === 0 && (
        <p className="mt-10 text-center text-gray-500">No posts found</p>
      )}
    </main>
  );
}
