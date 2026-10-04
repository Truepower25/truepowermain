

import { hasSupabaseConfig, supabase } from '@/lib/supabase.js'



export async function getPublishedBlogs({
    category = null,
    page = 1,
    pageSize = 20,
    searchParams = "",
    excludeId = null,
} = {}) {
    if (!hasSupabaseConfig()) {
        return {
            posts: [],
            pagination: {
                totalItems: 0,
                totalPages: 0,
                currentPage: page,
                pageSize,
            },
        };
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
        .from("blog_posts")
        .select("*", { count: "exact" })
        .eq("status", "Published");

    if (excludeId) {
        query = query.not("id", "eq", excludeId);
    }

    // Apply filters
    if (category) {
        query = query.eq("category", category);
    }

    if (searchParams) {
        query = query.ilike("title", `%${searchParams}%`);
    }

    // Execute the query with ordering and pagination
    let { data, error, count } = await query
        .order('order_index', { ascending: true, nullsFirst: false })
        .order('published_at', { ascending: false })
        .range(from, to);

    // Fallback if order_index fails
    if (error || !data) {
        // Rebuild query with filters for fallback
        let fallbackQuery = supabase
            .from("blog_posts")
            .select("*", { count: "exact" })
            .eq("status", "Published");

        if (category) fallbackQuery = fallbackQuery.eq("category", category);
        if (searchParams) fallbackQuery = fallbackQuery.ilike("title", `%${searchParams}%`);

        const fallbackResult = await fallbackQuery
            .order("published_at", { ascending: false })
            .range(from, to);

        data = fallbackResult.data;
        error = fallbackResult.error;
        count = fallbackResult.count;
    }

    if (error) throw error;

    return {
        posts: data || [],
        pagination: {
            totalItems: count || 0,
            totalPages: Math.ceil((count || 0) / pageSize),
            currentPage: page,
            pageSize,
        },
    };
}

export async function getRelatedPosts(current, limit = 3) {
    if (!current) return [];
    if (!hasSupabaseConfig()) return [];

    const blogs = await getPublishedBlogs({
        excludeId: current.id,
        pageSize: Math.max(limit * 4, 12),
    });
    const related = blogs.posts.filter((post) => post.id !== current.id);
    if (current.category) {
        const sameCategory = related.filter(
            (post) => post.category === current.category,
        );
        if (sameCategory.length >= limit) return sameCategory.slice(0, limit);
    }

    if (current.tags?.length) {
        const sharedTags = related.filter((post) =>
            post.tags?.some((tag) => current.tags.includes(tag)),
        );
        if (sharedTags.length >= limit) return sharedTags.slice(0, limit);
    }

    return related.slice(0, limit);
}

export async function getBlogPostBySlug(slug) {
    if (!hasSupabaseConfig()) return null;

    const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("status", "Published")
        .eq("slug", slug)
        .maybeSingle();

    if (error) throw error;
    return data;
}

export async function getBlogCategories() {
    if (!hasSupabaseConfig()) return [];

    const { data, error } = await supabase
        .from("blog_posts")
        .select("category", { distinct: true })
        .eq("status", "Published")
        .not("category", "is", null);

    if (error) throw error;

    return data.map((item) => item.category);
}

const BLOG_FALLBACK_GRADIENTS = [
    "linear-gradient(135deg, #0f172a 0%, #1b4fd8 52%, #7dd3fc 100%)",
    "linear-gradient(135deg, #0f6e56 0%, #17a34a 55%, #a7f3d0 100%)",
    "linear-gradient(135deg, #0f172a 0%, #0f766e 56%, #99f6e4 100%)",
    "linear-gradient(135deg, #7c2d12 0%, #ea580c 58%, #fde68a 100%)",
];

export function stripHtmlContent(content = "") {
    return String(content || "")
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export function getBlogExcerpt(post, maxLength = 160) {
    const source =
        post?.excerpt ||
        stripHtmlContent(post?.body || post?.content || post?.summary || "");

    if (!source) return "";
    if (source.length <= maxLength) return source;

    return `${source.slice(0, maxLength).trimEnd()}...`;
}

export function getBlogReadTime(post, wordsPerMinute = 180) {
    const bodyText = stripHtmlContent(post?.body || post?.content || "");
    const wordCount = bodyText.split(" ").filter(Boolean).length;

    return Math.max(1, Math.ceil((wordCount || 120) / wordsPerMinute));
}

export function formatBlogDate(value, options = {
    day: "numeric",
    month: "short",
    year: "numeric",
}) {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleDateString("en-KE", options);
}

export function getBlogCoverFallback(seed = "") {
    const normalized = String(seed || "").trim().toLowerCase();
    if (!normalized) return BLOG_FALLBACK_GRADIENTS[0];

    const score = normalized
        .split("")
        .reduce((total, character) => total + character.charCodeAt(0), 0);

    return BLOG_FALLBACK_GRADIENTS[score % BLOG_FALLBACK_GRADIENTS.length];
}

export function getBlogAuthorLabel(author = "", fallback = "TruePower Team") {
    const normalized = String(author || "").trim();
    if (!normalized) return fallback;

    const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
    if (looksLikeEmail) return fallback;

    return normalized;
}

export function hasBlogBodyContent(content = "") {
    const normalized = String(content || "").trim();
    if (!normalized) return false;
    if (/<img\b/i.test(normalized) || /<figure\b/i.test(normalized)) return true;

    return stripHtmlContent(normalized).length > 0;
}
