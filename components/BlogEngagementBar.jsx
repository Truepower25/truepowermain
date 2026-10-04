"use client";

import { useEffect, useMemo, useState } from "react";
import { Heart, Eye } from "lucide-react";
import { supabase, hasSupabaseConfig } from "@/lib/supabase.js";

function getVisitorKey() {
  if (typeof window === "undefined") return "";

  const storageKey = "truepower-blog-visitor-key";
  let key = window.localStorage.getItem(storageKey);

  if (!key) {
    key =
      (window.crypto?.randomUUID && window.crypto.randomUUID()) ||
      `visitor-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    window.localStorage.setItem(storageKey, key);
  }

  return key;
}

function readFlag(key) {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(key) === "1";
}

function writeFlag(key) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, "1");
}

export default function BlogEngagementBar({
  postId,
  slug,
  initialViewCount = 0,
  initialLikeCount = 0,
}) {
  const [visitorKey, setVisitorKey] = useState("");
  const [viewCount, setViewCount] = useState(Number(initialViewCount) || 0);
  const [likeCount, setLikeCount] = useState(Number(initialLikeCount) || 0);
  const [viewerLiked, setViewerLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [liking, setLiking] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const storageKeys = useMemo(
    () => ({
      liked: `truepower-blog-liked:${slug}`,
      viewed: `truepower-blog-viewed:${slug}`,
    }),
    [slug],
  );

  useEffect(() => {
    setVisitorKey(getVisitorKey());
  }, []);

  useEffect(() => {
    if (!visitorKey || !hasSupabaseConfig() || !slug) return;

    let active = true;

    async function loadEngagement() {
      try {
        const { data, error } = await supabase.rpc("get_blog_post_engagement", {
          post_slug: slug,
          visitor_key: visitorKey,
        });

        if (!active) return;

        if (error) {
          console.warn("Failed to load engagement:", error);
          setLoading(false);
          return;
        }

        if (!error && data) {
          const snapshot = Array.isArray(data) ? data[0] : data;
          if (snapshot) {
            setViewCount(Number(snapshot.view_count ?? initialViewCount) || 0);
            setLikeCount(Number(snapshot.like_count ?? initialLikeCount) || 0);
            setViewerLiked(Boolean(snapshot.viewer_liked));
            setLoading(false);
            return;
          }
        }
      } catch (error) {
        console.error("Error loading engagement:", error);
      }

      setViewerLiked(readFlag(storageKeys.liked));
      setLoading(false);
    }

    loadEngagement();

    return () => {
      active = false;
    };
  }, [initialLikeCount, initialViewCount, slug, storageKeys.liked, visitorKey]);

  useEffect(() => {
    if (!visitorKey || !hasSupabaseConfig() || !slug) return;
    if (readFlag(storageKeys.viewed)) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (cancelled) return;

      try {
        const { data, error } = await supabase.rpc("record_blog_post_view", {
          post_slug: slug,
          visitor_key: visitorKey,
        });

        if (cancelled) return;

        if (error) {
          console.warn("Failed to record view:", error);
          return;
        }

        if (!error && data) {
          const snapshot = Array.isArray(data) ? data[0] : data;
          setViewCount(Number(snapshot?.view_count ?? viewCount + 1) || viewCount + 1);
          writeFlag(storageKeys.viewed);
        }
      } catch (error) {
        console.error("Error recording view:", error);
      }
    }, 900);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [slug, storageKeys.viewed, viewCount, visitorKey]);

  useEffect(() => {
    if (!postId || !hasSupabaseConfig()) return;

    const channel = supabase
      .channel(`blog-post-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "blog_posts",
          filter: `id=eq.${postId}`,
        },
        (payload) => {
          setViewCount(Number(payload.new?.view_count ?? 0) || 0);
          setLikeCount(Number(payload.new?.like_count ?? 0) || 0);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  const handleLike = async () => {
    if (!visitorKey || !slug || viewerLiked || liking || !hasSupabaseConfig()) return;

    setLiking(true);
    setStatusMessage("");

    try {
      const { data, error } = await supabase.rpc("record_blog_post_like", {
        post_slug: slug,
        visitor_key: visitorKey,
      });

      if (error) throw error;

      const snapshot = Array.isArray(data) ? data[0] : data;
      setLikeCount(Number(snapshot?.like_count ?? likeCount + 1) || likeCount + 1);
      setViewerLiked(true);
      writeFlag(storageKeys.liked);
      setStatusMessage(snapshot?.viewer_liked ? "Liked" : "Saved");
    } catch (error) {
      console.error("Error liking post:", error);
      setStatusMessage(error?.message || "Unable to like this article.");
    } finally {
      setLiking(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-[1.2rem] border border-border bg-gradient-to-br from-slate-50 via-white to-brand-50/20 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-wrap items-center gap-2 text-sm text-sub">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-semibold text-ink shadow-sm">
            <Eye size={14} />
            {viewCount} views
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-semibold text-ink shadow-sm">
            <Heart size={14} />
            {likeCount} likes
          </span>
        </div>
        {statusMessage ? (
          <span className="text-xs font-medium text-sub">{statusMessage}</span>
        ) : null}
      </div>

      <button
        type="button"
        onClick={handleLike}
        disabled={viewerLiked || liking || loading}
        className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
          viewerLiked
            ? "border border-brand-200 bg-brand-50 text-brand-700"
            : "border border-brand-600 bg-brand-600 text-white hover:bg-brand-700"
        } disabled:cursor-not-allowed disabled:opacity-70`}
      >
        <Heart size={16} fill={viewerLiked ? "currentColor" : "none"} />
        {viewerLiked ? "Liked" : liking ? "Liking..." : "Like article"}
      </button>
    </div>
  );
}
