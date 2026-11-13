import type { Metadata } from "next";
import { Suspense } from "react";

import { RequireAuth } from "@/components/require-auth";

import { ScanView } from "./scan-view";

export const metadata: Metadata = {
  title: "Scan",
};

export default function ScanPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8">
      <Suspense>
        <RequireAuth>
          <ScanView />
        </RequireAuth>
      </Suspense>
    </main>
  );
}
