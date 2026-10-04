"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Zap,
  Check,
  ShoppingBag,
  ArrowLeft,
} from "lucide-react";
import { getProduct, getProducts } from "../lib/supabase";
import { useCart } from "@/context/CartContext";
import ProductCard from "@/components/ProductCard";
import Seo, { SITE_URL, DEFAULT_IMAGE } from "@/components/Seo";
import { trackBeginCheckout, trackViewItem } from "@/lib/analytics";

const CAT_LABELS = {
  standard: "Instant Shower",
  pump: "With Pump",
  showerhead: "Shower Head",
  accessory: "Accessory",
  bulbs_lighting: "Bulbs & Lighting",
  switches_sockets: "Switches & Sockets",
  solar_solutions: "Solar Solution",
  water_pumps: "Water Pump",
};

export default function ProductContent({ product, related }) {
  const [imgIdx, setImgIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { addToCart, toggleWishlist, isWishlisted } = useCart();

  const images = Array.isArray(product.images)
    ? product.images
    : product.images
      ? [product.images]
      : [];

  const specs = product.specs || {};
  const features = product.features || [];
  const wishlisted = isWishlisted(product.id);

  useEffect(() => {
    if (product) {
      trackViewItem(product, {
        item_list_id: "product-detail",
        item_list_name: "Product Detail",
      });
    }
  }, [product]);

  const waMessage = encodeURIComponent(
    `Hi TruePower! I want to order *${product.name}* × ${qty} = KSh ${Number(product.price * qty).toLocaleString()}. Please assist.`,
  );

  const handleAddToCart = () => {
    addToCart(product, qty, {
      item_list_id: "product-detail",
      item_list_name: "Product Detail",
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleWhatsAppCheckout = () => {
    trackBeginCheckout([{ ...product, qty }], {
      checkout_method: "whatsapp",
      item_list_id: "product-detail",
      item_list_name: "Product Detail",
    });
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-sub mb-8">
          <Link
            href="/shop"
            className="hover:text-brand-500 transition-colors flex items-center gap-1"
          >
            <ArrowLeft size={14} /> Shop
          </Link>
          <span>/</span>
          <span className="text-ink truncate max-w-[200px]">
            {product.name}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10  mb-20">
          {/* Images */}
          <div>
            <div className="relative aspect-square bg-muted rounded-2xl overflow-hidden mb-3 border border-border">
              {images.length > 0 ? (
                <img
                  src={images[imgIdx]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-brand-50">
                  <Zap size={64} className="text-brand-200" />
                </div>
              )}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setImgIdx((i) => (i - 1 + images.length) % images.length)
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 backdrop-blur rounded-full shadow flex items-center justify-center text-ink hover:bg-white transition-all"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => setImgIdx((i) => (i + 1) % images.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 backdrop-blur rounded-full shadow flex items-center justify-center text-ink hover:bg-white transition-all"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              )}
              {product.badge && (
                <span className="absolute top-4 left-4 badge-green">
                  {product.badge}
                </span>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIdx(i)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${i === imgIdx ? "border-brand-500" : "border-border hover:border-brand-200"}`}
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col">
            <div>
              <div className="badge mb-3 w-auto capitalize">
                <Link href={`/shop?subcategory=${product.cat}`}>
                  {CAT_LABELS[product.cat] || product.catLabel || product.cat}
                </Link>
              </div>
            </div>

            <h1 className="font-display font-extrabold text-3xl lg:text-4xl text-ink mb-2 leading-tight">
              {product.name}
            </h1>
            {product.model && (
              <p className="text-faint text-sm mb-5">Model: {product.model}</p>
            )}

            <div className="flex items-baseline gap-3 mb-1">
              <p className="font-display font-extrabold text-4xl text-ink">
                KSh {Number(product.price).toLocaleString()}
              </p>
              {product.original_price && (
                <p className="text-faint text-lg line-through">
                  KSh {Number(product.original_price).toLocaleString()}
                </p>
              )}
            </div>
            <div className="mb-6" />

            {product.description && (
              <p className="text-sub leading-relaxed mb-8">
                {product.description}
              </p>
            )}

            {features.length > 0 && (
              <ul className="flex flex-col gap-2 mb-8">
                {features.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-sm text-ink"
                  >
                    <Check size={14} className="text-brand-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            )}

            {/* Qty selector */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center gap-1 border border-border rounded-xl p-1">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center text-sub hover:text-ink transition-all text-lg font-bold"
                >
                  −
                </button>
                <span className="w-10 text-center font-display font-bold text-ink">
                  {qty}
                </span>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center text-sub hover:text-ink transition-all text-lg font-bold"
                >
                  +
                </button>
              </div>
              <span className="text-sub text-sm">
                Total:{" "}
                <strong className="text-ink font-display">
                  KSh {Number(product.price * qty).toLocaleString()}
                </strong>
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <button
                onClick={handleAddToCart}
                className={`flex-1 flex items-center justify-center gap-2 font-display font-bold px-6 py-4 rounded-2xl transition-all text-base ${
                  added
                    ? "bg-emerald-500 text-white"
                    : "bg-brand-500 hover:bg-brand-600 text-white hover:scale-[1.01] active:scale-95"
                }`}
              >
                {added ? (
                  <>
                    <Check size={18} /> Added to Cart!
                  </>
                ) : (
                  <>
                    <ShoppingBag size={18} /> Add to Cart
                  </>
                )}
              </button>
              <a
                href={`https://wa.me/254701039256?text=${waMessage}`}
                target="_blank"
                rel="noreferrer"
                onClick={handleWhatsAppCheckout}
                className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1fb85b] text-white font-display font-bold px-6 py-4 rounded-2xl transition-all text-base hover:scale-[1.01] active:scale-95"
              >
                <MessageCircle size={18} /> Order via WhatsApp
              </a>
            </div>

            <div className="flex gap-2 mb-8">
              <button
                onClick={() => toggleWishlist(product)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl border font-display font-semibold text-sm transition-all ${
                  wishlisted
                    ? "bg-brand-50 border-brand-200 text-brand-500"
                    : "border-border text-sub hover:border-brand-200 hover:text-brand-500"
                }`}
              >
                <Heart size={15} fill={wishlisted ? "currentColor" : "none"} />
                {wishlisted ? "Saved" : "Save to Wishlist"}
              </button>
            </div>

            {/* Specs */}
            {Object.keys(specs).length > 0 && (
              <div className="border-t border-border pt-6">
                <h3 className="font-display font-bold text-xs text-sub uppercase tracking-widest mb-4">
                  Specifications
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(specs).map(([k, v]) => (
                    <div
                      key={k}
                      className="bg-muted rounded-xl px-4 py-3 border border-border"
                    >
                      <p className="text-faint text-[10px] uppercase tracking-wider font-display mb-1">
                        {k}
                      </p>
                      <p className="text-ink text-sm font-medium">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Delivery note */}
            <div className="mt-6 bg-brand-50 border border-brand-100 rounded-2xl p-4 flex gap-3">
              <Zap size={16} className="text-brand-500 shrink-0 mt-0.5" />
              <p className="text-sub text-sm leading-relaxed">
                <span className="text-brand-500 font-semibold">
                  Same-day pickup
                </span>{" "}
                available in Nairobi CBD (Nyamakima). WhatsApp us to confirm
                stock before visiting.
              </p>
            </div>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="border-t border-border pt-12">
            <h2 className="font-display font-bold text-2xl text-ink mb-6">
              Related Products
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5">
              {related.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  itemListId="related-products"
                  itemListName="Related Products"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
