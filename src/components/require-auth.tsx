"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

import { useAuth } from "@/lib/auth/auth-context";
import { signInUrlFor } from "@/lib/auth/redirect";

import { Spinner } from "./ui/button";

/**
 * Shows its children only to signed-in users (guests included) and sends
 * everyone else to sign in, returning them here afterwards.
 *
 * This only controls what the UI shows. Real protection comes from Firestore
 * rules and the Cloud Functions, which verify the user on every request.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const wasSignedIn = useRef(false);

  useEffect(() => {
    if (status === "signedIn") {
      wasSignedIn.current = true;
      return;
    }
    if (status !== "signedOut") return;
    // Signing out (here or in another tab) ends on the home page. Only visitors
    // who arrive signed out are sent to sign in and brought back afterwards.
    if (wasSignedIn.current) {
      router.replace("/");
      return;
    }
    const query = searchParams.toString();
    router.replace(signInUrlFor(query ? `${pathname}?${query}` : pathname));
  }, [status, pathname, searchParams, router]);

  if (status !== "signedIn") {
    return (
      <div className="flex flex-1 items-center justify-center p-10 text-muted" role="status">
        <Spinner className="size-6" />
        <span className="sr-only">Loading</span>
      </div>
    );
  }
  return children;
}
