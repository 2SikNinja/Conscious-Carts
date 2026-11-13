import type { Metadata } from "next";
import { Suspense } from "react";

import { RequireAuth } from "@/components/require-auth";

import { FoodDetail, FoodDetailSkeleton } from "./food-detail";

export const metadata: Metadata = {
  title: "Product",
};

export default function FoodPage({ params }: PageProps<"/food/[fdcId]">) {
  // The id is only known at request time, so reading it happens inside Suspense.
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6">
      <Suspense fallback={<FoodDetailSkeleton />}>
        <RequireAuth>
          <FoodDetail params={params} />
        </RequireAuth>
      </Suspense>
    </main>
  );
}
