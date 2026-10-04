"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export default function SortSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const sort = searchParams.get("sort") || "";

  const handleChange = (value) => {
    const params = new URLSearchParams(searchParams.toString());

    // ONLY replace sort, everything else stays
    params.set("sort", value);

    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <select
      value={sort}
      onChange={(e) => handleChange(e.target.value)}
      className="input w-auto bg-white cursor-pointer"
    >
      <option value="">Featured</option>
      <option value="newest">Newest</option>
      <option value="price-asc">Low → High</option>
      <option value="price-desc">High → Low</option>
    </select>
  );
}
