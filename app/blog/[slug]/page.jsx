import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, Tag, User } from "lucide-react";

import {
  getBlogPostBySlug,
  getRelatedPosts,
  formatBlogDate,
  getBlogCoverFallback,
  getBlogExcerpt,
  getBlogReadTime,
  getBlogAuthorLabel,
} from "@/lib/blogs.js";
import BlogCard from "@/components/BlogCard";
import BlogContentRenderer from "@/components/BlogContentRenderer";
import BlogEngagementBar from "@/components/BlogEngagementBar";
import { createSeo, DEFAULT_IMAGE } from "@/components/Seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    return createSeo({
      title: "Article not found",
      description: "Blog post not found",
      path: `/blog/${slug}`,
      noindex: true,
    });
  }

  return createSeo({
    title: post.title,
    description:
      post.excerpt ||
      getBlogExcerpt(post) ||
      `Read ${post.title} on TruePower Kenya.`,
    path: `/blog/${slug}`,
    image: post.featured_image_url || post.cover_image_url || DEFAULT_IMAGE,
    type: "article",
  });
}

function RelatedPostCard({ post }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block rounded-[1.35rem] border border-border bg-gradient-to-br from-white to-slate-50 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-pop sm:p-5"
    >
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-600">
        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[10px] tracking-[0.24em]">
          {post.category || "General"}
        </span>
      </div>
      <h3 className="mt-3 font-display text-[0.98rem] font-bold leading-snug text-ink sm:text-[1.02rem]">
        {post.title}
      </h3>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-sub">
        {getBlogExcerpt(post, 96)}
      </p>
      <div className="mt-4 flex flex-col gap-2 border-t border-border pt-3 text-xs text-sub sm:flex-row sm:items-center sm:justify-between">
        <span className="shrink-0 text-[0.72rem] sm:text-xs">
          {formatBlogDate(post.published_at || post.created_at)}
        </span>
        <span className="inline-flex items-center gap-1 font-semibold text-brand-600 sm:justify-end">
          Read article
          <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) return notFound();

  const relatedPosts = await getRelatedPosts(post, 3);
  const categoryLabel = post.category || "General";
  const authorName = getBlogAuthorLabel(post.author || post.author_name);
  const publishedDate = formatBlogDate(post.published_at || post.created_at, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const readTime = getBlogReadTime(post);
  const heroImage = post.featured_image_url || post.cover_image_url || "";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(27,79,216,0.09),transparent_26%),radial-gradient(circle_at_top_right,rgba(15,110,86,0.09),transparent_24%),linear-gradient(180deg,#f8fbff_0%,#ffffff_36%)]">
      <div className="container py-8 lg:py-12">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700"
        >
          <ArrowLeft size={16} />
          Back to blog
        </Link>

        <section className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.88fr)] lg:items-stretch">
          <div className="relative isolate overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 shadow-pop">
            {heroImage ? (
              <>
                <div className="aspect-[4/3] sm:aspect-square lg:aspect-auto lg:min-h-full">
                  <img
                    src={heroImage}
                    alt={post.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_38%)]" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
              </>
            ) : (
              <div
                className="flex aspect-[4/3] items-end p-8 sm:aspect-square lg:min-h-full"
                style={{ background: getBlogCoverFallback(categoryLabel) }}
              >
                <p className="max-w-xl text-2xl font-bold leading-tight text-white sm:text-3xl">
                  {post.title}
                </p>
              </div>
            )}

            <div className="absolute left-4 top-4 z-10">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white backdrop-blur-md">
                {categoryLabel}
              </span>
            </div>

            <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-6">
              <div className="mb-3 flex flex-wrap gap-2 text-[11px] text-white/85 sm:text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/35 px-3 py-1.5 backdrop-blur-sm">
                  <CalendarDays size={13} />
                  {publishedDate || "Latest update"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/35 px-3 py-1.5 backdrop-blur-sm">
                  <Clock3 size={13} />
                  {readTime} min read
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/35 px-3 py-1.5 backdrop-blur-sm">
                  <User size={13} />
                  {authorName}
                </span>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-border bg-white p-6 shadow-card sm:p-8 lg:p-9">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-brand-100/70 blur-3xl" />

            <div className="relative">
              <div className="flex flex-wrap items-center gap-3 text-sm text-sub">
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                  {categoryLabel}
                </span>
                <span>{publishedDate || "Latest update"}</span>
                <span>{readTime} min read</span>
              </div>

              <h1 className="mt-4 max-w-2xl font-display text-3xl font-bold leading-tight text-ink sm:text-4xl lg:text-[2.65rem]">
                {post.title}
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-relaxed text-sub sm:text-lg">
                {post.excerpt || getBlogExcerpt(post) || "A practical article from the TruePower team."}
              </p>

              {authorName ? (
                <p className="mt-4 text-sm font-medium text-sub">
                  Written by <span className="font-semibold text-ink">{authorName}</span>
                </p>
              ) : null}

              {post.tags?.length > 0 ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-slate-50 px-3 py-1.5 text-sm text-sub"
                    >
                      <Tag size={14} />
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <article className="rounded-[2rem] border border-border bg-white p-4 shadow-card sm:p-6 lg:p-10 overflow-hidden">
            <BlogContentRenderer
              content={post.body || post.content || ""}
              className="blog-rich-content"
            />
          </article>

          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-border bg-white p-5 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">
                Related posts
              </p>
              <h2 className="mt-2 font-display text-xl font-bold text-ink">
                More from the blog
              </h2>

              <div className="mt-5 space-y-3">
                {relatedPosts.length > 0 ? (
                  relatedPosts.map((related) => (
                    <RelatedPostCard key={related.id} post={related} />
                  ))
                ) : (
                  <p className="text-sm leading-6 text-sub">
                    No related posts are available yet.
                  </p>
                )}
              </div>

              <Link
                href="/blog"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-brand-500 px-4 py-3 text-sm font-semibold text-brand-600 transition-all hover:bg-brand-500 hover:text-white"
              >
                Browse all posts
                <ArrowRight size={16} />
              </Link>
            </div>
          </aside>
        </section>

        <section className="mt-6">
          <BlogEngagementBar
            postId={post.id}
            slug={post.slug}
            initialViewCount={post.view_count || 0}
            initialLikeCount={post.like_count || 0}
          />
        </section>

        {relatedPosts.length > 0 ? (
          <section className="mt-8">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-600">
                Continue exploring
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold text-ink">
                Related articles
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {relatedPosts.map((relatedPost) => (
                <BlogCard key={relatedPost.id} post={relatedPost} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
