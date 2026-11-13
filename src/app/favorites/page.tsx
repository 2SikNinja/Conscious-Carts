import type { Metadata } from "next";
import { Suspense } from "react";

import { RequireAuth } from "@/components/require-auth";

import { FavoritesView } from "./favorites-view";

export const metadata: Metadata = {
  title: "Favorites",
};

export default function FavoritesPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8">
      <Suspense>
        <RequireAuth>
          <FavoritesView />
        </RequireAuth>
      </Suspense>
    </main>
  );
}
