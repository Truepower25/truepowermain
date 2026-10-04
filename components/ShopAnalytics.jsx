// components/ShopAnalytics.jsx
"use client";

import { useEffect, useRef } from "react";
import { trackSearch, trackViewItemList } from "@/lib/analytics";

export default function ShopAnalytics({
  products,
  category,
  search,
  sort,
  listName,
}) {
  const trackedRef = useRef("");

  useEffect(() => {
    const signature = `${category}|${search}|${sort}|${products.map((p) => p.id).join(",")}`;

    if (trackedRef.current === signature) return;
    trackedRef.current = signature;

    if (search) {
      trackSearch(search, {
        results_count: products.length,
      });
    }

    if (products.length > 0) {
      trackViewItemList(products, {
        item_list_id: category,
        item_list_name: listName,
      });
    }
  }, [products, category, search, sort, listName]);

  return null;
}
