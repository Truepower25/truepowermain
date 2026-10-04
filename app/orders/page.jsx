"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getOrdersByUser } from "@/lib/supabase";

export default function OrdersPage() {
  useEffect(() => {
    document.title = "My Orders";
  }, []);
  const auth = useAuth();
  const { user } = auth ?? {};
  const [orders, setOrders] = useState([]);
  const [loadedForUser, setLoadedForUser] = useState(null);
  const loading = Boolean(auth?.loading) || (user && loadedForUser !== user.id);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getOrdersByUser(user.id)
      .then((list) => {
        if (cancelled) return;
        setOrders(list || []);
        setLoadedForUser(user.id);
      })
      .catch(() => {
        if (!cancelled) setLoadedForUser(user.id);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading)
    return (
      <div className="pt-[120px] min-h-screen flex items-center justify-center">
        Loading…
      </div>
    );

  return (
    <main className="pt-[120px] min-h-screen bg-white">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="font-display font-extrabold text-2xl mb-4">Orders</h1>
        {!orders || orders.length === 0 ? (
          <div className="bg-muted p-6 rounded">
            You have no orders yet.{" "}
            <a href="/shop" className="text-brand-500">
              Start shopping
            </a>
            .
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => (
              <div key={o.id} className="p-4 border border-border rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm text-sub">Order #{o.id}</div>
                  <div className="text-sm font-semibold">
                    {new Date(o.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="text-sm text-sub mb-2">
                  Status:{" "}
                  <span className="font-medium">{o.status || "pending"}</span>
                </div>
                <div className="text-sm">
                  Total: KSh {Number(o.total || 0).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
