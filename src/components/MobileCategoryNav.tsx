"use client";

import Link from "next/link";
import { useRef } from "react";
import type { ArticleCategory } from "@/lib/types";

export default function MobileCategoryNav({
  categories,
}: {
  categories: [ArticleCategory, string][];
}) {
  const menuRef = useRef<HTMLDetailsElement>(null);

  const closeMenu = () => {
    if (menuRef.current) menuRef.current.open = false;
  };

  return (
    <details
      ref={menuRef}
      className="group relative md:hidden"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        closeMenu();
        event.currentTarget.querySelector("summary")?.focus();
      }}
    >
      <summary className="cursor-pointer list-none rounded-md border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-gray-700 dark:hover:bg-gray-800 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          Browse
          <span
            aria-hidden="true"
            className="transition-transform group-open:rotate-180"
          >
            ▾
          </span>
        </span>
      </summary>
      <nav
        aria-label="Mobile navigation"
        className="absolute right-0 z-50 mt-2 w-64 rounded-lg border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-950"
      >
        <Link
          href="/"
          onClick={closeMenu}
          className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Home
        </Link>
        {categories.map(([key, label]) => (
          <Link
            key={key}
            href={`/category/${key}`}
            onClick={closeMenu}
            className="block rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {label}
          </Link>
        ))}
        <div className="my-1 border-t border-gray-200 dark:border-gray-800" />
        <Link
          href="/editorial-policy"
          onClick={closeMenu}
          className="block rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Editorial Policy
        </Link>
      </nav>
    </details>
  );
}
