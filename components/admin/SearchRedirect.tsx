"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SearchRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("query");

  // If there's a search query, redirect to the books page with that query
  useEffect(() => {
    if (query) {
      console.log("Redirecting search from home to books page:", query);
      router.push(`/admin/books?query=${encodeURIComponent(query)}`);
    }
  }, [query, router]);

  // This component doesn't render anything
  return null;
}
