"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Eye,
  Users,
  MousePointerClick,
  ShoppingCart,
  Smartphone,
  Globe,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { supabase } from "@/lib/supabase";

const RANGE_OPTIONS = [
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
];

const PIE_COLORS = ["#1B4FD8", "#4c6ef5", "#91a7ff", "#bac8ff", "#dbe4ff"];

function describeRlsError(error) {
  const code = String(error?.code || "");
  const status = error?.status || error?.statusCode;

  if (status === 403 || code === "42501") {
    return "Supabase RLS is blocking reads from site_analytics_events. Add the analytics policies to your database."
  }

  return error?.message || "Unable to load analytics data."
}

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className="rounded-xl bg-brand-50 text-brand-500 p-3">{icon}</div>
      <div>
        <p className="text-sub text-xs font-display font-semibold uppercase tracking-wider">
          {label}
        </p>
        <p className="font-display font-bold text-2xl mt-1">{value}</p>
        {sub && <p className="text-sub text-xs mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function ChartCard({ title, children, empty }) {
  return (
    <div className="card p-5">
      <p className="font-display font-bold text-sm mb-4">{title}</p>
      {empty ? (
        <p className="text-sub text-sm py-8 text-center">No data yet for this period.</p>
      ) : (
        children
      )}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [range, setRange] = useState(30);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const since = new Date();
      since.setDate(since.getDate() - range);

      let all = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("site_analytics_events")
          .select(
            "event_name, page_path, visitor_id, session_id, country_name, device_type, referrer_domain, is_bot, metadata, created_at"
          )
          .gte("created_at", since.toISOString())
          .order("created_at", { ascending: true })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        all = all.concat(data || []);
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
      setEvents(all);
    } catch (e) {
      console.error("Analytics load error:", e);
      setError(describeRlsError(e));
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadData]);

  const humanEvents = useMemo(() => events.filter((e) => !e.is_bot), [events]);

  const stats = useMemo(() => {
    const pageViews = humanEvents.filter((e) => e.event_name === "page_view");
    const uniqueVisitors = new Set(humanEvents.map((e) => e.visitor_id)).size;
    const sessions = new Set(humanEvents.map((e) => e.session_id)).size;
    const addToCart = humanEvents.filter((e) => e.event_name === "add_to_cart").length;
    const checkout = humanEvents.filter((e) => e.event_name === "begin_checkout").length;
    return {
      pageViews: pageViews.length,
      uniqueVisitors,
      sessions,
      addToCart,
      checkout,
      avgPerSession: sessions ? (pageViews.length / sessions).toFixed(1) : "0",
    };
  }, [humanEvents]);

  const trendData = useMemo(() => {
    const map = {};
    humanEvents
      .filter((e) => e.event_name === "page_view")
      .forEach((e) => {
        const day = e.created_at?.slice(0, 10) || "";
        if (!day) return;
        map[day] = (map[day] || 0) + 1;
      });
    return Object.entries(map)
      .map(([date, views]) => ({ date, views }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [humanEvents]);

  const topPages = useMemo(() => {
    const map = {};
    humanEvents
      .filter((e) => e.event_name === "page_view")
      .forEach((e) => {
        const path = (e.page_path || "/").split("?")[0];
        map[path] = (map[path] || 0) + 1;
      });
    return Object.entries(map)
      .map(([page, views]) => ({ page, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 8);
  }, [humanEvents]);

  const topProducts = useMemo(() => {
    const map = {};
    humanEvents
      .filter((e) => e.event_name === "view_item")
      .forEach((e) => {
        const item = e.metadata?.items?.[0];
        if (!item) return;
        const name = item.item_name || "Unknown";
        map[name] = (map[name] || 0) + 1;
      });
    return Object.entries(map)
      .map(([product, views]) => ({ product, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 8);
  }, [humanEvents]);

  const deviceData = useMemo(() => {
    const map = {};
    humanEvents
      .filter((e) => e.event_name === "page_view")
      .forEach((e) => {
        const d = e.device_type || "unknown";
        map[d] = (map[d] || 0) + 1;
      });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [humanEvents]);

  const countryData = useMemo(() => {
    const map = {};
    humanEvents
      .filter((e) => e.event_name === "page_view")
      .forEach((e) => {
        const c = e.country_name || "Unknown";
        map[c] = (map[c] || 0) + 1;
      });
    return Object.entries(map)
      .map(([country, visits]) => ({ country, visits }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 6);
  }, [humanEvents]);

  const referrerData = useMemo(() => {
    const map = {};
    humanEvents
      .filter((e) => e.event_name === "page_view" && e.referrer_domain !== "direct")
      .forEach((e) => {
        const r = e.referrer_domain || "unknown";
        map[r] = (map[r] || 0) + 1;
      });
    return Object.entries(map)
      .map(([referrer, visits]) => ({ referrer, visits }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 6);
  }, [humanEvents]);

  const funnel = useMemo(() => {
    const count = (name) => humanEvents.filter((e) => e.event_name === name).length;
    return [
      { stage: "Page Views", value: count("page_view") },
      { stage: "Product Views", value: count("view_item") },
      { stage: "Add to Cart", value: count("add_to_cart") },
      { stage: "Checkout Started", value: count("begin_checkout") },
    ];
  }, [humanEvents]);

  return (
    <div className="space-y-8 px-4 py-8 lg:px-10 xl:px-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl">Analytics</h1>
          <p className="text-sub text-sm">Live data from your site visitors</p>
        </div>
        <div className="flex gap-2">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={`px-4 py-2 rounded-full text-sm font-display font-semibold transition-colors ${
                range === opt.value
                  ? "bg-brand-500 text-white"
                  : "bg-muted text-sub hover:text-ink"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
          <div className="mt-1 text-xs text-amber-700/80">
            This dashboard reads from `site_analytics_events`. If that table is
            empty, the client collector is not writing events yet or Supabase
            is blocking inserts.
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-sub">Loading analytics...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<Eye size={20} />}
              label="Page Views"
              value={stats.pageViews.toLocaleString()}
            />
            <StatCard
              icon={<Users size={20} />}
              label="Unique Visitors"
              value={stats.uniqueVisitors.toLocaleString()}
            />
            <StatCard
              icon={<MousePointerClick size={20} />}
              label="Sessions"
              value={stats.sessions.toLocaleString()}
              sub={`${stats.avgPerSession} views/session`}
            />
            <StatCard
              icon={<ShoppingCart size={20} />}
              label="Add to Cart"
              value={stats.addToCart.toLocaleString()}
              sub={`${stats.checkout} checkout(s) started`}
            />
          </div>

          <ChartCard title="Page Views Over Time" empty={trendData.length === 0}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="views"
                  stroke="#1B4FD8"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid lg:grid-cols-2 gap-6">
            <ChartCard title="Top Pages" empty={topPages.length === 0}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topPages} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="page"
                    tick={{ fontSize: 11 }}
                    width={100}
                  />
                  <Tooltip />
                  <Bar dataKey="views" fill="#1B4FD8" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Most Viewed Products" empty={topProducts.length === 0}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topProducts} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="product"
                    tick={{ fontSize: 10 }}
                    width={140}
                    tickFormatter={(v) => (v.length > 22 ? v.slice(0, 22) + "…" : v)}
                  />
                  <Tooltip />
                  <Bar dataKey="views" fill="#4c6ef5" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <ChartCard title="Devices" empty={deviceData.length === 0}>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={deviceData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      {deviceData.map((entry, i) => (
                        <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 mt-2 justify-center">
                {deviceData.map((d, i) => (
                  <span key={d.name} className="text-xs inline-flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    {d.name} ({d.value})
                  </span>
                ))}
              </div>
            </ChartCard>

            <ChartCard title="Top Countries" empty={countryData.length === 0}>
              <div className="space-y-3 mt-2">
                {countryData.map((c) => {
                  const max = countryData[0]?.visits || 1;
                  return (
                    <div key={c.country}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="inline-flex items-center gap-1.5">
                          <Globe size={12} className="text-sub" /> {c.country}
                        </span>
                        <span className="text-sub">{c.visits}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full"
                          style={{ width: `${(c.visits / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChartCard>

            <ChartCard title="Top Referrers" empty={referrerData.length === 0}>
              <div className="space-y-3 mt-2">
                {referrerData.map((r) => {
                  const max = referrerData[0]?.visits || 1;
                  return (
                    <div key={r.referrer}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="inline-flex items-center gap-1.5 truncate">
                          <Smartphone size={12} className="text-sub" /> {r.referrer}
                        </span>
                        <span className="text-sub">{r.visits}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-400 rounded-full"
                          style={{ width: `${(r.visits / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChartCard>
          </div>

          <ChartCard title="Shopping Funnel" empty={funnel.every((f) => f.value === 0)}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={funnel}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#1B4FD8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}
    </div>
  );
}
