"use client";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";

export default function ShoppingTagButton() {
  const { cartCount, setCartOpen } = useCart();

  return (
    <button
      onClick={() => setCartOpen(true)}
      className="text-sub hover:text-ink hover:bg-muted rounded-lg transition-all relative"
    >
      <ShoppingBag size={18} />

      {cartCount > 0 && (
        <span className="absolute -top-1 -right-1 w-[14px] h-[14px] bg-brand-500 rounded-full text-[9px] font-bold flex items-center justify-center text-white leading-none">
          {cartCount > 9 ? "9+" : cartCount}
        </span>
      )}
    </button>
  );
}
