"use client";

import { useState } from "react";
import { Camera, X } from "lucide-react";

function displayCategory(category = "") {
  const value = String(category).toLowerCase();
  if (value === "product") return "Shower & Water Systems";
  if (value === "showroom") return "Showroom Products";
  if (value === "installation") return "Completed Installation";
  if (value === "solar") return "Solar Installation";
  return category || "TruePower Project";
}

export default function ProjectGallery({
  galleryImages = [],
  categories = [],
  gallerySection = {},
}) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedImage, setSelectedImage] = useState(null);

  const filteredImages =
    activeCategory === "all"
      ? galleryImages
      : galleryImages.filter((img) => img.category === activeCategory);

  return (
    <section className="bg-[#f5f8ff] py-16 lg:py-20">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
        {/* HEADER */}
        <div className="mb-10 text-center">
          <div className="badge mb-4">{gallerySection.title}</div>
          <h2 className="font-display font-extrabold text-3xl lg:text-4xl text-ink mb-4">
            {gallerySection.title}
          </h2>
          <p className="text-sub max-w-2xl mx-auto">
            {gallerySection.subtitle}
          </p>
        </div>

        {/* FILTERS */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-display font-semibold transition-all ${
                activeCategory === cat.key
                  ? "bg-brand-500 text-white shadow-sm"
                  : "bg-muted text-sub hover:bg-brand-100 hover:text-brand-600"
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {/* EMPTY STATE */}
        {filteredImages.length === 0 ? (
          <div className="text-center py-16">
            <Camera size={48} className="mx-auto text-faint mb-4" />
            <p className="text-sub">No gallery images yet. Check back soon!</p>
            <p className="text-faint text-sm mt-2">
              Admins can add images in the dashboard → Gallery tab
            </p>
          </div>
        ) : (
          /* GRID */
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredImages.map((img, index) => (
              <div
                key={img.id}
                className="group animate-fade-up relative aspect-[4/3] cursor-pointer overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_14px_35px_rgba(7,27,82,0.08)] transition hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(7,27,82,0.14)]"
                style={{ animation: `fadeUp 0.6s ease-out ${index * 90}ms forwards` }}
                onClick={() => setSelectedImage(img)}
              >
                <img
                  src={img.image_url}
                  alt={img.title || "Installation"}
                  className="h-full w-full bg-slate-50 object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />

                {/* PROJECT INFO */}
                <div className="absolute inset-x-0 bottom-0 bg-[#292566]/95 px-4 py-3 text-white">
                  <div>
                    <p className="line-clamp-2 font-display font-bold leading-tight">
                      {img.title || "Installation"}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-white/75">
                      {img.description}
                    </p>
                  </div>
                </div>

                {/* CATEGORY BADGE */}
                <div className="absolute right-3 top-3 rounded-full bg-black/50 px-2 py-1 text-xs text-white backdrop-blur-sm">
                  {displayCategory(img.category)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* LIGHTBOX MODAL */}
        {selectedImage && (
          <div
            className="fixed inset-0 z-[300] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div
              className="relative max-w-[90vw] max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedImage.image_url}
                alt={selectedImage.title}
                className="max-h-[85vh] object-contain rounded-2xl"
              />

              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-3 right-3 bg-black/80 p-2 rounded-full text-white"
              >
                <X size={24} />
              </button>

              {(selectedImage.title || selectedImage.description) && (
                <div className="mt-4 text-center text-white">
                  {selectedImage.title && (
                    <p className="font-display font-semibold text-lg">
                      {selectedImage.title}
                    </p>
                  )}
                  {selectedImage.description && (
                    <p className="text-white/70 text-sm">
                      {selectedImage.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
