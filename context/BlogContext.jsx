"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { hasSupabaseConfig } from "@/lib/supabase";
import { getPublishedBlogs } from "@/lib/blogs.js";

const BlogContext = createContext(null);

export function BlogProvider({ children }) {
  const isConfigured = hasSupabaseConfig();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(isConfigured);

  const refreshBlogs = useCallback(async () => {
    try {
      if (!isConfigured) return;
      const data = await getPublishedBlogs();
      setPosts(data.posts || []);
    } catch (err) {
      console.error("Failed to load blogs:", err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [isConfigured]);

  const getRelatedBlogPosts = (current, limit = 3) => {
    if (!current) return [];

    const related = posts.filter((p) => p.id !== current.id);

    if (current.category) {
      const sameCategory = related.filter(
        (p) => p.category === current.category,
      );
      if (sameCategory.length >= limit) return sameCategory.slice(0, limit);
    }

    if (current.tags?.length) {
      const shared = related.filter((p) =>
        p.tags?.some((tag) => current.tags.includes(tag)),
      );
      if (shared.length >= limit) return shared.slice(0, limit);
    }

    return related.slice(0, limit);
  };

  const categories = [...new Set(posts.map((p) => p.category).filter(Boolean))];

  useEffect(() => {
    if (!isConfigured) return undefined;

    let cancelled = false;

    const loadBlogs = async () => {
      try {
        const data = await getPublishedBlogs();
        if (cancelled) return;
        setPosts(data.posts || []);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load blogs:", err);
        setPosts([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadBlogs();

    return () => {
      cancelled = true;
    };
  }, [isConfigured]);

  return (
    <BlogContext.Provider
      value={{
        posts,
        categories,
        loading,
        refreshBlogs,
        getRelatedBlogPosts,
      }}
    >
      {children}
    </BlogContext.Provider>
  );
}

export function useBlog() {
  return useContext(BlogContext);
}
