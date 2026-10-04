"use client";
import Link from "next/link";
import { Heart, ShoppingBag, Zap } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { trackSelectItem } from "@/lib/analytics";

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

export default function ProductCard({
  product,
  itemListName = "Product List",
  itemListId,
}) {
  const { addToCart, toggleWishlist, isWishlisted } = useCart();
  const wishlisted = isWishlisted(product.id);
  const img = Array.isArray(product.images)
    ? product.images[0]
    : product.images;
  const analyticsList = {
    item_list_id:
      itemListId || itemListName?.toLowerCase().replace(/\s+/g, "-"),
    item_list_name: itemListName,
  };

  const handleSelectItem = () => {
    trackSelectItem(product, analyticsList);
  };

  return (
    <div className="card group flex flex-col w-full min-w-0 overflow-hidden h-full min-h-[360px] sm:min-h-[440px]">
      {/* Image */}
      <div className="relative overflow-hidden bg-muted" style={{ aspectRatio: "3 / 4" }}>
        <Link
          href={`/product/${product.id}`}
          onClick={handleSelectItem}
          className="block h-full w-full"
        >
          {img ? (
            <img
              src={img}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-brand-50">
              <Zap size={40} className="text-brand-200" />
            </div>
          )}
        </Link>

        {/* Primary badge: top-left, visible on all sizes (keeps 'bestseller', 'new', 'sale' visible) */}
        {product.badge && (
          <span className="absolute top-3 left-3 badge-green text-[10px]">
            {product.badge}
          </span>
        )}

        {/* Category label: top-right (to the left of wishlist), shown on md+ to avoid covering mobile images */}
        <Link
          href={`/shop?subcategory=${product.cat}`}
          className="absolute top-3 right-12 hidden md:inline-block bg-white/80 backdrop-blur-sm text-sub text-[10px] font-display font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm"
        >
          {CAT_LABELS[product.cat] || product.catLabel || product.cat}
        </Link>

        {/* Wishlist */}
        <button
          onClick={() => toggleWishlist(product)}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full backdrop-blur-sm flex items-center justify-center transition-all duration-200 shadow-sm ${
            wishlisted
              ? "bg-brand-500 text-white"
              : "bg-white/80 text-sub hover:text-brand-500"
          }`}
        >
          <Heart size={13} fill={wishlisted ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Category badge for small screens: placed below image (primary badge already overlays image) */}
      <div className="p-3 pt-2 md:hidden flex gap-2 items-center flex-wrap">
        <Link href={`/shop?subcategory=${product.cat}`} className="block">
          <span className="bg-white text-sub text-[8px] font-display font-semibold px-3 py-1 rounded-full uppercase tracking-wider border border-border">
            {CAT_LABELS[product.cat] || product.catLabel || product.cat}
          </span>
        </Link>
      </div>

      {/* Info */}
      <div className="p-3 sm:p-5 flex flex-col flex-1 min-w-0">
        <Link
          href={`/product/${product.id}`}
          onClick={handleSelectItem}
          className="mb-1 min-h-[2.4rem] sm:min-h-[3.2rem] group/link min-w-0"
        >
          <h3 className="font-display font-semibold text-[13px] sm:text-base leading-tight text-ink group-hover/link:text-brand-500 transition-colors line-clamp-2 break-words">
            {product.name}
          </h3>
        </Link>

        <div className="min-h-[1rem] sm:min-h-[1.25rem]">
          {product.model && (
            <p className="text-faint text-[10px] sm:text-xs mt-1.5 line-clamp-1">
              {product.model}
            </p>
          )}
        </div>

        <div className="mt-2 sm:mt-3 min-h-[2.25rem] sm:min-h-[3rem]">
          <p className="font-display font-bold text-base sm:text-xl text-ink leading-tight">
            KSh {Number(product.price).toLocaleString()}
          </p>
          {product.original_price && (
            <p className="text-faint text-[10px] sm:text-xs line-through">
              KSh {Number(product.original_price).toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 mt-3 sm:mt-4">
          <Link
            href={`/product/${product.id}`}
            onClick={handleSelectItem}
            className="flex-1 text-center text-xs sm:text-sm font-semibold h-8 sm:h-9 leading-8 sm:leading-9 px-2 sm:px-3 rounded-full border border-border text-sub hover:text-brand-500 hover:border-brand-200 transition-all"
          >
            View
          </Link>

          <button
            onClick={() => addToCart(product, 1, analyticsList)}
            aria-label="Add to cart"
            className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-full bg-brand-500 text-white hover:bg-brand-600 transition-colors shadow-sm"
          >
            <ShoppingBag size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
