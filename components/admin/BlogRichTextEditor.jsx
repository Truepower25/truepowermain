"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowDown,
  ArrowUp,
  Image as ImageIcon,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";

import BlogContentRenderer from "@/components/BlogContentRenderer";
import { uploadImage } from "@/lib/supabase";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

const DEFAULT_FORMATS = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "list",
  "bullet",
  "blockquote",
  "link",
  "image",
];

function escapeHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createSection(section = {}) {
  return {
    id:
      section.id ||
      `blog-section-${Math.random().toString(36).slice(2, 10)}`,
    title: section.title || "",
    body: section.body || "",
  };
}

function normalizeInitialSections(value) {
  const normalized = `${value || ""}`.trim();
  if (!normalized) return [createSection({ body: "" })];

  if (normalized.includes("blog-article-section")) {
    try {
      const parser = new DOMParser();
      const document = parser.parseFromString(
        `<div id="blog-sections-root">${normalized}</div>`,
        "text/html",
      );
      const parsedSections = Array.from(
        document.querySelectorAll(".blog-article-section"),
      )
        .map((element) => {
          const title = element.querySelector("h2")?.textContent?.trim() || "";
          const bodyWrapper = element.querySelector(".blog-article-section-body");
          const body = bodyWrapper?.innerHTML?.trim() || "";
          return createSection({ title, body });
        })
        .filter((section) => section.title || section.body);

      if (parsedSections.length > 0) {
        return parsedSections;
      }
    } catch {
      // Fallback to a single section below.
    }
  }

  return [createSection({ body: normalized })];
}

function buildSectionsHtml(sections) {
  return sections
    .map((section) => {
      const title = `${section.title || ""}`.trim();
      const body = `${section.body || ""}`.trim();

      if (!title && !body) return "";

      return `
        <section class="blog-article-section">
          ${title ? `<h2>${escapeHtml(title)}</h2>` : ""}
          <div class="blog-article-section-body">${body}</div>
        </section>
      `;
    })
    .filter(Boolean)
    .join("");
}

function SectionEditor({
  section,
  index,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}) {
  const quillRef = useRef(null);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["blockquote", "link", "image"],
          ["clean"],
        ],
        handlers: {
          image: () => fileInputRef.current?.click(),
        },
      },
    }),
    [],
  );

  const insertImageIntoEditor = (url, caption = "") => {
    const editor = quillRef.current?.getEditor?.();
    const safeCaption = `${caption || ""}`.trim();
    const captionMarkup = safeCaption
      ? `<p><em>${escapeHtml(safeCaption)}</em></p><p><br /></p>`
      : "<p><br /></p>";
    const imageMarkup = `<p><img src="${escapeHtml(url)}" alt="${escapeHtml(safeCaption)}" /></p>${captionMarkup}`;

    if (!editor) {
      onChange(index, {
        ...section,
        body: `${section.body || ""}${imageMarkup}`,
      });
      return;
    }

    const range = editor.getSelection(true) || { index: editor.getLength() };
    editor.clipboard.dangerouslyPasteHTML(range.index, imageMarkup, "user");
    onChange(index, {
      ...section,
      body: editor.root.innerHTML,
    });
  };

  const handleImageUpload = async (file) => {
    if (!file) return;

    setUploading(true);

    try {
      const caption = window.prompt("Optional caption for this image", "");
      const url = await uploadImage(file, "blog-images");
      insertImageIntoEditor(url, caption || "");
    } catch (error) {
      alert(error?.message || "Unable to upload blog image.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = async (event) => {
    const file = event.target.files?.[0];
    await handleImageUpload(file);
    event.target.value = "";
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    await handleImageUpload(file);
  };

  return (
    <section
      className={`blog-section-editor overflow-hidden rounded-[1.5rem] border border-border bg-white shadow-sm ${
        uploading ? "ring-2 ring-brand-100" : ""
      }`}
      onDrop={handleDrop}
      onDragOver={(event) => event.preventDefault()}
    >
      <div className="flex flex-col gap-3 border-b border-border bg-[linear-gradient(135deg,rgba(248,251,255,0.98),rgba(255,255,255,0.98))] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <div className="mb-3 inline-flex rounded-full bg-brand-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-brand-700">
            Section {index + 1}
          </div>
          <label className="label">Section Heading</label>
          <input
            className="input min-h-[46px]"
            value={section.title}
            onChange={(event) =>
              onChange(index, { ...section, title: event.target.value })
            }
            placeholder="e.g. Why this matters for the health sector"
          />
        </div>
        <div className="flex shrink-0 gap-2 self-start sm:self-end">
          <button
            type="button"
            onClick={() => onMoveUp(index)}
            className="btn-outline px-3 py-2 text-xs"
            disabled={!canMoveUp}
            title="Move section up"
          >
            <ArrowUp size={14} />
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(index)}
            className="btn-outline px-3 py-2 text-xs"
            disabled={!canMoveDown}
            title="Move section down"
          >
            <ArrowDown size={14} />
          </button>
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="btn-outline px-3 py-2 text-xs text-red-600 hover:bg-red-500 hover:text-white"
            title="Remove section"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-border bg-gradient-to-br from-slate-50 via-white to-brand-50/30 p-3">
          <p className="max-w-2xl text-sm leading-relaxed text-sub">
            Write this section in rich text. Drop images into the block or use the insert image button to place your own visuals inline.
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-outline shrink-0 px-4 py-2.5 text-sm"
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Upload size={16} />
                Uploading...
              </>
            ) : (
              <>
                <ImageIcon size={16} />
                Insert image
              </>
            )}
          </button>
        </div>

        <div className="blog-quill overflow-hidden rounded-[1.25rem] border border-border bg-white shadow-sm">
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={section.body}
            onChange={(nextBody) =>
              onChange(index, { ...section, body: nextBody })
            }
            modules={modules}
            formats={DEFAULT_FORMATS}
          />
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInput}
      />
    </section>
  );
}

export default function BlogRichTextEditor({
  value,
  onChange,
  title = "Full Article Body",
  description = "Build the article in sections. Each section can have its own heading, formatted text, and images.",
}) {
  const [sections, setSections] = useState(() =>
    normalizeInitialSections(value),
  );
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onChangeRef.current(buildSectionsHtml(sections));
  }, [sections]);

  const updateSection = (index, nextSection) => {
    setSections((current) =>
      current.map((section, currentIndex) =>
        currentIndex === index ? nextSection : section,
      ),
    );
  };

  const addSection = () => {
    setSections((current) => [
      ...current,
      createSection({ title: "", body: "" }),
    ]);
  };

  const removeSection = (index) => {
    setSections((current) =>
      current.length > 1
        ? current.filter((_, currentIndex) => currentIndex !== index)
        : current,
    );
  };

  const moveSection = (fromIndex, toIndex) => {
    setSections((current) => {
      if (toIndex < 0 || toIndex >= current.length) return current;

      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const previewHtml = buildSectionsHtml(sections);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-[1.5rem] border border-border bg-gradient-to-br from-slate-50 via-white to-brand-50/30 p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <label className="label">{title}</label>
          <p className="text-sm leading-relaxed text-sub">{description}</p>
        </div>
        <button
          type="button"
          onClick={addSection}
          className="btn-primary shrink-0 px-4 py-2.5 text-sm"
        >
          <Plus size={16} />
          Add section
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.7fr)]">
        <div className="space-y-4">
          {sections.map((section, index) => (
            <SectionEditor
              key={section.id}
              section={section}
              index={index}
              onChange={updateSection}
              onRemove={removeSection}
              onMoveUp={(sectionIndex) => moveSection(sectionIndex, sectionIndex - 1)}
              onMoveDown={(sectionIndex) => moveSection(sectionIndex, sectionIndex + 1)}
              canMoveUp={index > 0}
              canMoveDown={index < sections.length - 1}
            />
          ))}
        </div>

        <aside className="rounded-[1.5rem] border border-border bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-600">
              Live Preview
            </p>
            <p className="mt-2 text-sm leading-relaxed text-sub">
              This is the article as it will appear on the public blog page.
            </p>
          </div>

          <div className="blog-preview-shell rounded-[1.25rem] border border-border bg-gradient-to-br from-slate-50 via-white to-brand-50/20 p-4">
            <BlogContentRenderer
              content={previewHtml}
              className="blog-rich-content"
            />
            {!previewHtml?.trim() ? (
              <p className="text-sm text-sub">
                Add your first section to see the preview here.
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
