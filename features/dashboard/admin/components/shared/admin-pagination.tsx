"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type AdminPaginationProps = {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
};

export function AdminPagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  className = "",
}: AdminPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Auto-clamp if currentPage exceeds totalPages due to data filtering
  React.useEffect(() => {
    if (currentPage > totalPages) {
      onPageChange(totalPages);
    }
  }, [currentPage, totalPages, onPageChange]);

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages;
  };

  if (totalItems === 0) {
    return null;
  }

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-[#1e2330] bg-[#0c1017] text-xs ${className}`}
    >
      {/* Left: Summary & Page Size */}
      <div className="flex items-center gap-3 font-mono text-zinc-400">
        <span>
          Hiển thị{" "}
          <strong className="text-white font-semibold">
            {startItem}-{endItem}
          </strong>{" "}
          / <strong className="text-white font-semibold">{totalItems}</strong> kết quả
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-2 pl-3 border-l border-white/10">
            <span className="text-zinc-500">Mỗi trang:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="bg-[#171822] border border-[#222432] text-white rounded-md px-2 py-1 outline-none font-mono focus:border-[#ff5500] cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt} className="bg-[#12131a] text-white">
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page navigation */}
      <div className="flex items-center gap-1.5">
        {/* Previous button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-md border border-[#222432] text-zinc-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition"
          title="Trang trước"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Page buttons */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, idx) => {
            if (page === "...") {
              return (
                <span key={`dots-${idx}`} className="px-2 font-mono text-zinc-600 select-none">
                  ...
                </span>
              );
            }

            const pageNum = Number(page);
            const isActive = pageNum === currentPage;

            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`min-w-[32px] h-8 px-2 font-mono rounded-md text-xs font-semibold transition ${
                  isActive
                    ? "bg-[#ff5500] text-white shadow-sm font-bold"
                    : "border border-[#222432] bg-[#171822] text-zinc-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-md border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition"
          title="Trang sau"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
