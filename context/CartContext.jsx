"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useSyncExternalStore,
} from "react";
import { trackAddToCart, trackRemoveFromCart } from "../lib/analytics";

const CartContext = createContext(null);

const CART_STORAGE_KEY = "tp_cart";
const WISHLIST_STORAGE_KEY = "tp_wishlist";
const STORAGE_EVENT = "tp-storage";
const EMPTY_ARRAY = Object.freeze([]);
const storageCache = new Map();

function readStoredArray(key) {
  if (typeof window === "undefined") return EMPTY_ARRAY;

  const raw = window.localStorage.getItem(key) || "[]";
  const cached = storageCache.get(key);
  if (cached && cached.raw === raw) {
    return cached.value;
  }

  try {
    const value = JSON.parse(raw);
    storageCache.set(key, { raw, value });
    return value;
  } catch {
    storageCache.set(key, { raw, value: EMPTY_ARRAY });
    return EMPTY_ARRAY;
  }
}

function writeStoredArray(key, updater) {
  if (typeof window === "undefined") return EMPTY_ARRAY;

  const current = readStoredArray(key);
  const next = typeof updater === "function" ? updater(current) : updater;
  const raw = JSON.stringify(next);

  window.localStorage.setItem(key, raw);
  storageCache.set(key, { raw, value: next });
  window.dispatchEvent(new Event(STORAGE_EVENT));
  return next;
}

function subscribeToStorage(callback) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("storage", callback);
  window.addEventListener(STORAGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(STORAGE_EVENT, callback);
  };
}

function useStoredArray(key) {
  return useSyncExternalStore(
    subscribeToStorage,
    () => readStoredArray(key),
    () => EMPTY_ARRAY,
  );
}

export function CartProvider({ children }) {
  const cart = useStoredArray(CART_STORAGE_KEY);
  const wishlist = useStoredArray(WISHLIST_STORAGE_KEY);
  const [cartOpen, setCartOpen] = useState(false);

  const addToCart = useCallback((product, qty = 1, analyticsParams = {}) => {
    trackAddToCart(product, qty, analyticsParams);
    writeStoredArray(CART_STORAGE_KEY, (prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + qty } : item,
        );
      }

      return [...prev, { ...product, qty }];
    });
    setCartOpen(true);
  }, []);

  const removeFromCart = useCallback((id, analyticsParams = {}) => {
    writeStoredArray(CART_STORAGE_KEY, (prev) => {
      const existing = prev.find((item) => item.id === id);
      if (existing) {
        trackRemoveFromCart(existing, existing.qty, analyticsParams);
      }

      return prev.filter((item) => item.id !== id);
    });
  }, []);

  const updateQty = useCallback((id, qty, analyticsParams = {}) => {
    if (qty < 1) return;

    writeStoredArray(CART_STORAGE_KEY, (prev) => {
      const existing = prev.find((item) => item.id === id);
      if (!existing) return prev;

      const quantityDelta = qty - existing.qty;
      if (quantityDelta > 0) {
        trackAddToCart(existing, quantityDelta, analyticsParams);
      } else if (quantityDelta < 0) {
        trackRemoveFromCart(existing, Math.abs(quantityDelta), analyticsParams);
      }

      return prev.map((item) => (item.id === id ? { ...item, qty } : item));
    });
  }, []);

  const clearCart = useCallback(() => {
    writeStoredArray(CART_STORAGE_KEY, []);
  }, []);

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const buildWhatsAppMessage = useCallback(
    (whatsappNum = "254701039256") => {
      const lines = cart.map(
        (item) =>
          `• ${item.name} × ${item.qty} = KSh ${Number(item.price * item.qty).toLocaleString()}`,
      );
      const total = `\nTotal: KSh ${Number(cartTotal).toLocaleString()}`;
      const text = encodeURIComponent(
        `Hi TruePower! I'd like to order the following:\n\n${lines.join("\n")}${total}\n\nPlease confirm availability and arrange delivery/pickup. Thank you!`,
      );
      return `https://wa.me/${whatsappNum}?text=${text}`;
    },
    [cart, cartTotal],
  );

  const toggleWishlist = useCallback((product) => {
    writeStoredArray(WISHLIST_STORAGE_KEY, (prev) => {
      const exists = prev.find((item) => item.id === product.id);
      return exists
        ? prev.filter((item) => item.id !== product.id)
        : [...prev, product];
    });
  }, []);

  const isWishlisted = useCallback(
    (id) => wishlist.some((item) => item.id === id),
    [wishlist],
  );

  const wishlistCount = wishlist.length;

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQty,
        clearCart,
        cartCount,
        cartTotal,
        cartOpen,
        setCartOpen,
        buildWhatsAppMessage,
        wishlist,
        toggleWishlist,
        isWishlisted,
        wishlistCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
