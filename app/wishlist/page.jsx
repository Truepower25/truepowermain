"use client";
import Link from "next/link";
import { Heart, ArrowRight, Trash2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import ProductCard from "@/components/ProductCard";

export default function WishlistPage() {
  const { wishlist, toggleWishlist } = useCart();

  return (
    <main className="min-h-screen bg-white">
      <div className="border-b border-border bg-muted">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-10">
          <div className="flex items-center gap-2 mb-1">
            <Heart size={22} className="text-brand-500 fill-brand-100" />
            <h1 className="font-display font-extrabold text-4xl text-ink">
              Wishlist
            </h1>
          </div>
          <p className="text-sub text-sm">
            {wishlist.length} saved item{wishlist.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="w-full mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-10">
        {wishlist.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <Heart size={32} className="text-brand-200" />
            </div>
            <h3 className="font-display font-bold text-xl text-ink mb-2">
              Your wishlist is empty
            </h3>
            <p className="text-sub text-sm mb-6">
              Save products you love while browsing the shop.
            </p>
            <Link href="/shop" className="btn-primary">
              Browse Products <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5">
            {wishlist.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
