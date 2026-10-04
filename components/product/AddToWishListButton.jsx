"use client";

import { useCart } from "@/context/CartContext";
import { Heart } from "lucide-react";

export default function AddToWishListButton({ product }) {
  const { toggleWishlist, isWishlisted } = useCart();
  const wishlisted = isWishlisted(product.id);
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        toggleWishlist(product);
      }}
      className={`absolute top-3 right-3 w-8 h-8 rounded-full backdrop-blur-sm flex items-center justify-center transition-all duration-200 shadow-sm ${
        wishlisted
          ? "bg-brand-500 text-white"
          : "bg-white/80 text-sub hover:text-brand-500"
      }`}
    >
      <Heart size={13} fill={wishlisted ? "currentColor" : "none"} />
    </button>
  );
}
