"use client";

import Image from "next/image";
import { useDebounce } from "react-use";
import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

import { Input } from "../ui/input";

const Search = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("query") || "");
  const [initialSearch, setInitialSearch] = useState(search);

  const updateQuery = useCallback(() => {
    // Create a new URLSearchParams instance
    const params = new URLSearchParams(searchParams.toString());

    // Update search parameter
    if (search) {
      params.set("query", search);
      console.log("Setting search query:", search);
    } else {
      params.delete("query");
    }

    // Only update if search has changed
    if (search !== initialSearch) {
      // Preserve existing parameters (like page)
      const newUrl = `${pathname}?${params.toString()}`;
      console.log("Navigating to:", newUrl);

      // Use replace instead of push to avoid building up history
      router.replace(newUrl);
    }
  }, [search, initialSearch, searchParams, pathname, router]);

  // Update initialSearch when searchParams changes
  useEffect(() => {
    const queryParam = searchParams.get("query") || "";
    console.log("URL search param changed to:", queryParam);
    setInitialSearch(queryParam);
  }, [searchParams]);

  // Debounce search updates to avoid excessive rerenders
  useDebounce(updateQuery, 300, [search]);

  return (
    <div className="admin-search">
      <Image
        src="/icons/admin/search.svg"
        alt="search"
        width={21}
        height={21}
        className="cursor-pointer"
      />

      <Input
        type="text"
        value={search}
        placeholder="Search users, books by title, author, or genre."
        onChange={(e) => setSearch(e.target.value)}
        className="admin-search_input"
        // Add keyboard event to submit on Enter
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            updateQuery();
          }
        }}
      />
    </div>
  );
};

export default Search;
