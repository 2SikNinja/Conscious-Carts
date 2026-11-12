import type { Metadata } from "next";
import { Suspense } from "react";

import { RequireAuth } from "@/components/require-auth";

import { SearchView } from "./search-view";

export const metadata: Metadata = {
  title: "Search",
};

export default function SearchPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8">
      {/* Search state lives in the URL (?q=&type=), so these read search params inside Suspense. */}
      <Suspense>
        <RequireAuth>
          <SearchView />
        </RequireAuth>
      </Suspense>
    </main>
  );
}
