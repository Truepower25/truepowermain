"use client";
import { usePathname, useSearchParams } from "next/navigation";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({ currentPage = 1, totalPages }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  // Clone params so we can modify
  const params = new URLSearchParams(searchParams.toString());

  // Remove "page"
  params.delete("page");

  // Build final URL
  const createPageLink = (number) => {
    // add page query parameter to basePath

    const newParams = new URLSearchParams(params.toString());
    newParams.set("page", number);
    return `${pathname}?${newParams.toString()}`;
  };

  const pages = [];

  const delta = 2; // pages around current

  const rangeStart = Math.max(2, currentPage - delta);
  const rangeEnd = Math.min(totalPages - 1, currentPage + delta);

  // Always include first page
  pages.push(1);

  // Left dots
  if (rangeStart > 2) {
    pages.push("...");
  }

  // Middle pages
  for (let i = rangeStart; i <= rangeEnd; i++) {
    pages.push(i);
  }

  // Right dots
  if (rangeEnd < totalPages - 1) {
    pages.push("...");
  }

  // Always include last page
  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return (
    <nav className="flex items-center justify-center gap-1 flex-wrap py-3 text-[12px]">
      {/* Previous */}
      {currentPage > 1 ? (
        <Link
          href={createPageLink(currentPage - 1)}
          className="p-1 rounded-md border  hover:bg-gray-100 flex items-center"
        >
          <ChevronLeft size={14} /> Prev
        </Link>
      ) : (
        <span className="p-1  rounded-md border  text-gray-400 flex items-center">
          <ChevronLeft size={14} /> Prev
        </span>
      )}

      {/* Page Numbers */}
      {pages.map((page, index) =>
        page === "..." ? (
          <span key={index} className="p-1  text-gray-500">
            ...
          </span>
        ) : (
          <Link
            key={index}
            href={createPageLink(page)}
            className={`px-3 py-1 rounded-md border  transition ${
              page === currentPage
                ? "bg-brand-600 text-white shadow-md"
                : "bg-muted text-sub hover:bg-brand-100 hover:text-brand-700"
            }`}
          >
            {page}
          </Link>
        ),
      )}

      {/* Next */}
      {currentPage < totalPages ? (
        <Link
          href={createPageLink(currentPage + 1)}
          className="p-1 rounded-md border  hover:bg-gray-100 flex items-center"
        >
          Next <ChevronRight size={14} />
        </Link>
      ) : (
        <span className=" p-1 rounded-md border  text-gray-400 flex items-center">
          Next <ChevronRight size={14} />
        </span>
      )}
    </nav>
  );
}
