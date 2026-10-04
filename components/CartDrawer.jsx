"use client";

import {
  X,
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { trackBeginCheckout, trackViewCart } from "../lib/analytics";

export default function CartDrawer({ whatsappNum = "254701039256" }) {
  const {
    cart,
    cartOpen,
    setCartOpen,
    removeFromCart,
    updateQty,
    cartTotal,
    buildWhatsAppMessage,
  } = useCart();
  const drawerRef = useRef(null);
  const viewedOpenStateRef = useRef(false);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        cartOpen &&
        drawerRef.current &&
        !drawerRef.current.contains(e.target)
      ) {
        setCartOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [cartOpen, setCartOpen]);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = cartOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [cartOpen]);

  useEffect(() => {
    if (!cartOpen) {
      viewedOpenStateRef.current = false;
      return;
    }

    if (!viewedOpenStateRef.current && cart.length > 0) {
      trackViewCart(cart, {
        item_list_id: "cart-drawer",
        item_list_name: "Cart Drawer",
      });
      viewedOpenStateRef.current = true;
    }
  }, [cart, cartOpen]);

  if (!cartOpen) return null;

  const img = (p) => (Array.isArray(p.images) ? p.images[0] : p.images);

  return (
    <div className="fixed inset-0 z-[200]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-ink/20 backdrop-blur-sm"></div>

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="absolute right-0 top-0 bottom-0 w-full max-w-[420px] bg-white shadow-pop flex flex-col animate-slide-right"
        style={{ animationFillMode: "both" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-brand-500" />
            <h2 className="font-display font-bold text-lg text-ink">
              Your Cart
            </h2>
            {cart.length > 0 && (
              <span className="w-5 h-5 bg-brand-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center">
                {cart.reduce((s, i) => s + i.qty, 0)}
              </span>
            )}
          </div>
          <button
            onClick={() => setCartOpen(false)}
            className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center text-sub hover:text-ink transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Empty state */}
        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center">
              <ShoppingBag size={32} className="text-brand-300" />
            </div>
            <div>
              <p className="font-display font-bold text-lg text-ink mb-1">
                Cart is empty
              </p>
              <p className="text-sub text-sm">
                Add some products to get started
              </p>
            </div>
            <button
              onClick={() => setCartOpen(false)}
              className="btn-primary mt-2"
            >
              Browse Products <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <>
            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
              {cart.map((item) => (
                <div key={item.id} className="flex gap-3 group">
                  {/* Thumbnail */}
                  <Link
                    href={`/product/${item.id}`}
                    onClick={() => setCartOpen(false)}
                    className="w-20 h-20 rounded-xl overflow-hidden border border-border shrink-0 bg-muted"
                  >
                    {img(item) ? (
                      <img
                        src={img(item)}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-faint text-2xl">
                        ⚡
                      </div>
                    )}
                  </Link>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/product/${item.id}`}
                      onClick={() => setCartOpen(false)}
                      className="font-display font-semibold text-sm text-ink hover:text-brand-500 transition-colors line-clamp-2 leading-tight"
                    >
                      {item.name}
                    </Link>
                    <p className="text-brand-500 font-display font-bold text-sm mt-1">
                      KSh {Number(item.price).toLocaleString()}
                    </p>

                    <div className="flex items-center justify-between mt-2">
                      {/* Qty controls */}
                      <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                        <button
                          onClick={() =>
                            updateQty(item.id, item.qty - 1, {
                              item_list_id: "cart-drawer",
                              item_list_name: "Cart Drawer",
                            })
                          }
                          className="w-7 h-7 rounded-md hover:bg-white flex items-center justify-center text-sub hover:text-ink transition-all"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-7 text-center text-sm font-display font-bold text-ink">
                          {item.qty}
                        </span>
                        <button
                          onClick={() =>
                            updateQty(item.id, item.qty + 1, {
                              item_list_id: "cart-drawer",
                              item_list_name: "Cart Drawer",
                            })
                          }
                          className="w-7 h-7 rounded-md hover:bg-white flex items-center justify-center text-sub hover:text-ink transition-all"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() =>
                          removeFromCart(item.id, {
                            item_list_id: "cart-drawer",
                            item_list_name: "Cart Drawer",
                          })
                        }
                        className="p-1.5 text-faint hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-border px-6 py-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="font-body text-sub text-sm">Subtotal</span>
                <span className="font-display font-bold text-xl text-ink">
                  KSh {Number(cartTotal).toLocaleString()}
                </span>
              </div>

              <a
                href={buildWhatsAppMessage(whatsappNum)}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  trackBeginCheckout(cart, {
                    checkout_method: "whatsapp",
                    item_list_id: "cart-drawer",
                    item_list_name: "Cart Drawer",
                  });
                  setCartOpen(false);
                }}
                className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1fb85b] text-white font-display font-bold px-6 py-4 rounded-2xl transition-all hover:scale-[1.01] active:scale-95 shadow-sm text-base"
              >
                <MessageCircle size={20} />
                Order via WhatsApp
              </a>
              <p className="text-center text-xs text-sub">
                You&apos;ll be taken to WhatsApp to confirm your order with us.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
