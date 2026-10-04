import ProductCard from "@/components/ProductCard";

import ShopAnalytics from "@/components/ShopAnalytics";
import SortSelect from "@/components/SortSelect";
import Pagination from "@/components/Pagination";
import { getProducts } from "@/lib/products";

const CATS = [
  { key: "all", label: "All Products" },
  { key: "water_heaters", label: "Instant Showers" },
  { key: "bulbs_lighting", label: "Bulbs & Lighting" },
  { key: "switches_sockets", label: "Switches & Sockets" },
  { key: "solar_solutions", label: "Solar Solutions" },
  { key: "water_pumps", label: "Water Pumps" },
];
const CAT_LABELS = {
  standard: "Instant Shower",
  pump: "With Pump",
  showerhead: "Shower Head",
  accessory: "Accessory",
  bulbs_lighting: "Bulbs & Lighting",
  switches_sockets: "Switches & Sockets",
  solar_solutions: "Solar Solution",
  water_pumps: "Water Pump",
};
const SORT_OPTIONS = [
  { key: "newest", label: "Newest First" },
  { key: "price-asc", label: "Price: Low → High" },
  { key: "price-desc", label: "Price: High → Low" },
];

export default async function ShopContent({ searchParams }) {
  const params = await searchParams;

  const category = params?.category || null;
  const search = params?.search || "";
  const sort = params?.sort || "";
  const page = parseInt(params?.page || "1");
  const subCategory = params?.subcategory || null;

  let { data: products, pagination } = await getProducts({
    search,
    category,
    subCategory,
    page,
    sort,
  });

  const catLabel = search
    ? "Search Results"
    : CAT_LABELS[category] ||
      CAT_LABELS[subCategory] ||
      CATS.find((c) => c.key === category)?.label ||
      "All Products";

  const listName = search ? `Search Results: ${search}` : catLabel;

  return (
    <main className="min-h-screen bg-white  container">
      <ShopAnalytics
        products={products}
        category={category}
        search={search}
        sort={sort}
        listName={listName}
      />
      {/* Header */}
      <div className="border-b bg-muted flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <div className="px-4 py-4 sm:px-6 sm:py-5">
          <h1 className="text-2xl sm:text-4xl font-bold">{catLabel}</h1>
          <p className="text-xs sm:text-sm text-gray-500">
            {pagination.totalItems} product
            {pagination.totalItems !== 1 ? "s" : ""}
            {search && <> for &quot;{search}&quot;</>}
          </p>
        </div>
        <div className="px-4 sm:px-0">
          <SortSelect />
        </div>
      </div>

      {/* Products */}
      <div className="px-4 sm:px-6 py-3">
        {products.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-6xl mb-4">🔍</p>
            <h3 className="text-xl font-bold">No products found</h3>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                itemListId={category}
                itemListName={listName}
              />
            ))}
          </div>
        )}
      </div>
      <div>
        <Pagination currentPage={page} totalPages={pagination.totalPages} />
      </div>
    </main>
  );
}
