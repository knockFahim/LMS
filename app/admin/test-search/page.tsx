"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { debugSearch } from "@/lib/admin/actions/book";

export default function TestSearch() {
  const [query, setQuery] = useState("Javascript");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const searchResults = await debugSearch(query);
      setResults(searchResults);
    } catch (error) {
      console.error("Error testing search:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-10">
      <h1 className="mb-5 text-2xl font-bold">Test Search</h1>

      <div className="mb-5 flex gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter search query"
          className="max-w-md"
        />
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? "Searching..." : "Test Search"}
        </Button>
      </div>

      {results && (
        <div className="mt-5 rounded-lg bg-white p-5">
          <h2 className="mb-3 text-xl font-semibold">Search Results</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded bg-slate-50 p-3">
              <p className="font-medium">Regular search:</p>
              <p>{results.regularResults} results found</p>
            </div>

            <div className="rounded bg-slate-50 p-3">
              <p className="font-medium">Lowercase search:</p>
              <p>{results.lowercaseResults} results found</p>
            </div>

            <div className="rounded bg-slate-50 p-3">
              <p className="font-medium">Direct title search:</p>
              <p>{results.directResults} results found</p>
            </div>
          </div>

          {results.sampleBooks?.length > 0 ? (
            <div className="mt-4">
              <h3 className="mb-2 font-medium">Sample books:</h3>
              <ul className="list-disc pl-5">
                {results.sampleBooks.map((book: any) => (
                  <li key={book.id}>
                    {book.title} by {book.author}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-4 text-red-500">No sample books found.</p>
          )}
        </div>
      )}
    </div>
  );
}
