"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { Spinner } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { saveProfile } from "@/lib/firestore/profile";
import { useProfile } from "@/lib/firestore/use-profile";
import type { DietaryProfile } from "@/lib/profile";

import { ProfileForm } from "./profile-form";

export function DietaryProfileSection() {
  const { user } = useAuth();
  const profileState = useProfile();
  const queryClient = useQueryClient();

  const handleSave = useCallback(
    async (profile: DietaryProfile) => {
      if (!user) return;
      await saveProfile(user.uid, profile);
      // Analyses and swaps are tailored to the profile, so drop the old ones.
      queryClient.removeQueries({ queryKey: ["analysis"] });
      queryClient.removeQueries({ queryKey: ["swaps"] });
    },
    [user, queryClient],
  );

  return (
    <section id="dietary-profile" aria-labelledby="dietary-heading" className="flex scroll-mt-20 flex-col gap-4">
      <div>
        <h2 id="dietary-heading" className="text-2xl font-bold">
          Dietary profile
        </h2>
        <p className="mt-1 text-muted">Every AI analysis checks products against these.</p>
      </div>

      {profileState.status === "loading" ? (
        <div className="flex items-center gap-3 py-8 text-muted" role="status">
          <Spinner className="size-5" />
          Loading your profile…
        </div>
      ) : profileState.status === "error" ? (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-danger">
          {profileState.error.message}
        </p>
      ) : (
        <ProfileForm savedProfile={profileState.profile} onSave={handleSave} />
      )}
    </section>
  );
}
