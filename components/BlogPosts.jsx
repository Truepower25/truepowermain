"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, ArrowRight } from "lucide-react";
import BlogCard from "@/components/BlogCard";
import Pagination from "@/components/Pagination";

function buildBlogLink({ search, category }) {
  const params = new URLSearchParams();

  if (search) params.set("search", search);
  if (category) params.set("category", category);

  const query = params.toString();
  return query ? `/blog?${query}` : "/blog";
}

export default function BlogPosts({ posts = [], categories = [], pagination }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchTerm = searchParams.get("search") || "";
  const activeCategory = searchParams.get("category") || "";
  const page = parseInt(searchParams.get("page")) || 1;
  const [query, setQuery] = useState(searchTerm);

  useEffect(() => {
    setQuery(searchTerm);
  }, [searchTerm]);

  const totalItems = pagination?.totalItems || posts.length;
  const totalPages = pagination?.totalPages || 1;
  const publishedLabel = totalItems === 1 ? "article" : "articles";

  const categoryLinks = useMemo(
    () => ["All Articles", ...categories.filter(Boolean)],
    [categories],
  );

  const handleSearch = (event) => {
    event.preventDefault();
    router.push(buildBlogLink({ search: query.trim(), category: activeCategory }));
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#eef5f2_0%,#f7faf9_18%,#ffffff_100%)]">
      <div className="container py-4 sm:py-6 lg:py-8">
        <section className="rounded-[1rem] border border-[#d7e6e1] bg-[#f8fbfa] p-4 shadow-[0_1px_0_rgba(15,42,32,0.04)] sm:p-5 lg:p-6">
          <div className="border-b border-[#d7e6e1] pb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-brand-600">
              From the blog
            </p>
            <h1 className="mt-2 font-display text-[1.85rem] font-bold leading-tight text-ink sm:text-[2.25rem]">
              TruePower Journal
            </h1>
            <p className="mt-1 max-w-4xl text-[0.82rem] leading-relaxed text-sub">
              Practical installation guides, product advice, and real-world energy insights for Kenyan homes and businesses.
            </p>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px] lg:items-center">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-brand-700">
                Categories
              </p>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
                {categoryLinks.map((category) => {
                  const isAll = category === "All Articles";
                  const nextCategory = isAll ? "" : category;
                  const href = buildBlogLink({
                    search: searchTerm,
                    category: nextCategory,
                  });
                  const isActive = isAll ? !activeCategory : activeCategory === category;

                  return (
                    <Link
                      key={category}
                      href={href}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-[0.72rem] font-semibold transition ${
                        isActive
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-[#cfded8] bg-white text-brand-700 hover:border-brand-300 hover:bg-brand-50"
                      }`}
                    >
                      {category}
                    </Link>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleSearch} className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-brand-700">
                Search articles
              </p>
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sub"
                />
                <input
                  id="blog-search"
                  type="search"
                  value={query}
                  placeholder="Search by title, topic, or author"
                  className="input min-h-[42px] rounded-full border-[#cfded8] bg-white pl-10 pr-4 text-sm"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </form>
          </div>

          <div className="mt-4 border-t border-[#d7e6e1] pt-3">
            <p className="text-[0.78rem] text-sub">
              Showing {posts.length} of {totalItems} published {publishedLabel}
              {searchTerm ? <> for “{searchTerm}”</> : null}
            </p>
          </div>
        </section>

        {posts.length === 0 ? (
          <div className="mt-6 rounded-[1rem] border border-border bg-white p-8 text-center shadow-card">
            <p className="text-lg font-semibold text-ink">No posts found</p>
            <p className="mt-2 text-sm text-sub">
              Try a different keyword or clear the selected category.
            </p>
          </div>
        ) : (
          <>
            <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {posts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </section>

            <div className="mt-8">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
