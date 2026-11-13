import type { Metadata } from "next";
import { Suspense } from "react";

import { RequireAuth } from "@/components/require-auth";

import { CompareView } from "./compare-view";

export const metadata: Metadata = {
  title: "Compare",
};

export default function ComparePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8">
      {/* The products come from ?ids=, so this reads search params inside Suspense. */}
      <Suspense>
        <RequireAuth>
          <CompareView />
        </RequireAuth>
      </Suspense>
    </main>
  );
}
