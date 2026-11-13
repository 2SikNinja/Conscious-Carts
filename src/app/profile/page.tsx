import type { Metadata } from "next";
import { Suspense } from "react";

import { RequireAuth } from "@/components/require-auth";

import { AccountCard } from "./account-card";
import { DietaryProfileSection } from "./dietary-profile-section";

export const metadata: Metadata = {
  title: "Profile",
};

export default function ProfilePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="text-3xl font-bold">Profile</h1>
      {/* RequireAuth reads the current URL to send visitors back after sign-in. */}
      <Suspense>
        <RequireAuth>
          <div className="flex flex-col gap-10">
            <AccountCard />
            <DietaryProfileSection />
          </div>
        </RequireAuth>
      </Suspense>
    </main>
  );
}
