"use client";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const categories = [
  { key: "water_heaters", label: "Instant Showers" },
  { key: "bulbs_lighting", label: "Bulbs & Lighting" },
  { key: "switches_sockets", label: "Switches & Sockets" },
  { key: "solar_solutions", label: "Solar Solutions" },
  { key: "water_pumps", label: "Water Pumps" },
];
export default function SearchProducts() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchTerm = searchParams.get("search") || "";
  const [query, setQuery] = useState(searchTerm);
  const [suggestions, setSuggestions] = useState([]);
  const [catSuggestions, setCatSuggestions] = useState([]);
  const [suggLoading, setSuggLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggTimer = useRef(null);
  const handleSearch = (e) => {
    e.preventDefault();
    router.push(`/shop?search=${encodeURIComponent(query.trim())}`);
    setQuery("");
    setSuggestions([]);
  };

  // 🔥 ONLY CHANGE: SERVER-SIDE SEARCH

  const fetchSuggestions = (q) => {
    if (suggTimer.current) clearTimeout(suggTimer.current);

    if (!q || q.length < 2) {
      setSuggestions([]);
      setCatSuggestions([]);
      setSuggLoading(false);
      return;
    }

    setSuggLoading(true);

    suggTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?search=${q}`);
        const prods = await res.json();

        setSuggestions(prods || []);
      } catch (err) {
        console.log("Error fetching suggestions:", err);
        setSuggestions([]);
      }

      const catMatches = categories.filter((c) =>
        c.label.toLowerCase().includes(q.toLowerCase()),
      );
      setCatSuggestions(catMatches);
      setSuggLoading(false);
    }, 220);
  };

  useEffect(
    () => () => {
      if (suggTimer.current) clearTimeout(suggTimer.current);
    },
    [],
  );
  return (
    <form onSubmit={handleSearch} className="relative">
      <Search
        size={16}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-sub pointer-events-none"
      />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          fetchSuggestions(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => {
          if (query.length >= 2) {
            fetchSuggestions(query);
            setShowSuggestions(true);
          }
        }}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
        placeholder="Search products, instant showers"
        className="w-full border border-border rounded-full py-2.5 pl-10 pr-4 text-sm bg-muted placeholder:text-sub focus:outline-none focus:border-brand-300 focus:bg-white transition-all"
      />

      {/* Suggestions dropdown */}
      {showSuggestions &&
        (suggestions.length > 0 ||
          catSuggestions.length > 0 ||
          suggLoading) && (
          <div className="absolute left-0 right-0 mt-2 bg-white border border-border rounded-xl shadow-lg z-30 max-h-72 overflow-auto">
            <div className="py-2">
              {suggLoading && (
                <div className="px-4 py-2 text-sub text-sm">Searching...</div>
              )}
              {catSuggestions.map((cat) => (
                <div
                  key={cat.key}
                  className="hover:bg-muted cursor-pointer px-4 "
                >
                  <Link
                    className="py-2 w-full"
                    href={`/shop?category=${cat.key}`}
                  >
                    <div className="text-sm font-semibold">{cat.label}</div>
                    <div className="text-xs text-sub">Category</div>
                  </Link>
                </div>
              ))}
              {suggestions.map((p) => (
                <Link
                  key={p.id}
                  className="px-4 py-2 hover:bg-muted cursor-pointer flex items-center gap-3"
                  href={`/product/${p.id}`}
                >
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt=""
                      className="w-10 h-10 rounded-md object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-muted rounded-md" />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-xs text-sub truncate">
                      KSh {Number(p.price || 0).toLocaleString()}
                    </div>
                  </div>
                </Link>
              ))}
              {!suggLoading &&
                suggestions.length === 0 &&
                catSuggestions.length === 0 && (
                  <div className="px-4 py-2 text-sub text-sm">No results</div>
                )}
            </div>
          </div>
        )}
    </form>
  );
}
