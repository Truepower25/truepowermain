"use client";

import { ShoppingBag } from "lucide-react";
import { useCart } from "../context/CartContext";
import { trackSelectItem } from "../lib/analytics";
import CartDrawer from "./CartDrawer";

export default function AddToCartButton({
  product,
  itemListName = "Product List",
  itemListId,
}) {
  const { addToCart, cartOpen } = useCart();
  const analyticsList = {
    item_list_id:
      itemListId || itemListName?.toLowerCase().replace(/\s+/g, "-"),
    item_list_name: itemListName,
  };
  return (
    <>
      <button
        onClick={() => addToCart(product, 1, analyticsList)}
        aria-label="Add to cart"
        className="h-9 w-9 flex items-center justify-center rounded-full bg-brand-500 text-white hover:bg-brand-600 transition-colors shadow-sm"
      >
        <ShoppingBag size={16} />
      </button>
    </>
  );
}
