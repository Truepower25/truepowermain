import Link from "next/link";
import { CalendarDays, Clock3, Eye, Heart, ArrowRight } from "lucide-react";
import {
  formatBlogDate,
  getBlogCoverFallback,
  getBlogExcerpt,
  getBlogReadTime,
} from "@/lib/blogs.js";

export default function BlogCard({ post, featured = false }) {
  if (!post) return null;

  const excerpt = getBlogExcerpt(post, featured ? 150 : 120);
  const publishedDate = formatBlogDate(post.published_at || post.created_at);
  const readTime = getBlogReadTime(post);
  const categoryLabel = post.category || "General";
  const cardImage = post.featured_image_url || post.cover_image_url || "";
  const viewCount = Number(post.view_count || post.views || 0) || 0;
  const likeCount = Number(post.like_count || post.likes || 0) || 0;

  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`group flex h-full flex-col overflow-hidden rounded-[1.1rem] border border-border bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card ${
        featured ? "lg:col-span-2" : ""
      }`}
    >
      <div className="relative overflow-hidden">
        {cardImage ? (
          <img
            src={cardImage}
            alt={post.title}
            className="h-[170px] w-full object-cover transition-transform duration-500 group-hover:scale-105 sm:h-[180px]"
          />
        ) : (
          <div
            className="flex h-[170px] w-full items-end p-4 sm:h-[180px]"
            style={{ background: getBlogCoverFallback(categoryLabel) }}
          />
        )}

        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/25 bg-white/90 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-brand-700 shadow-sm backdrop-blur-md">
            {categoryLabel}
          </span>
          {featured ? (
            <span className="rounded-full border border-white/25 bg-white/90 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-brand-700 shadow-sm backdrop-blur-md">
              Featured
            </span>
          ) : null}
        </div>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/55 via-slate-950/15 to-transparent p-3">
          <div className="flex flex-wrap gap-2 text-[10px] text-white/90">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-950/45 px-2.5 py-1 backdrop-blur-sm">
              <CalendarDays size={11} />
              {publishedDate || "Latest update"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-950/45 px-2.5 py-1 backdrop-blur-sm">
              <Clock3 size={11} />
              {readTime} min read
            </span>
          </div>
        </div>
      </div>

      <div className={`flex flex-1 flex-col gap-3 p-4 ${featured ? "lg:p-5" : ""}`}>
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-brand-600">
          <span>{categoryLabel}</span>
          <span>{publishedDate || "Latest update"}</span>
          <span>{readTime} min read</span>
        </div>

        <h3
          className="font-display text-[1rem] font-bold leading-snug text-ink sm:text-[1.05rem]"
        >
          {post.title}
        </h3>

        {excerpt ? (
          <p className="line-clamp-4 text-[0.84rem] leading-6 text-sub">
            {excerpt}
          </p>
        ) : null}

        <div className="mt-auto flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap sm:items-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
            <Eye size={11} />
            {viewCount} views
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
            <Heart size={11} />
            {likeCount} likes
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 sm:ml-auto">
            Read article
            <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </Link>
  );
}
