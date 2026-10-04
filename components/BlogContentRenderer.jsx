"use client";

function escapeHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default function BlogContentRenderer({ content = "", className = "" }) {
  const normalizedContent = `${content || ""}`.trim();

  if (!normalizedContent) return null;

  const looksLikeHtml = /<[^>]+>/.test(normalizedContent);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{
        __html: looksLikeHtml
          ? normalizedContent
          : escapeHtml(normalizedContent)
              .replace(/\n{2,}/g, "</p><p>")
              .replace(/\n/g, "<br />")
              .replace(/^/, "<p>")
              .replace(/$/, "</p>"),
      }}
    />
  );
}
