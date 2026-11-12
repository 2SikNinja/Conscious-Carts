"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button, ButtonLink } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { friendlyMessage } from "@/lib/auth/errors";

export function AccountCard() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  async function confirmSignOut() {
    dialogRef.current?.close();
    setIsSigningOut(true);
    setError(null);
    try {
      await signOut();
      router.replace("/");
    } catch (signOutError) {
      setError(friendlyMessage(signOutError));
      setIsSigningOut(false);
    }
  }

  function handleSignOut() {
    // Guests lose their data when they sign out, so ask first.
    if (user?.isGuest) dialogRef.current?.showModal();
    else void confirmSignOut();
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5" aria-labelledby="account-heading">
      <h2 id="account-heading" className="sr-only">
        Account
      </h2>
      <div className="flex items-center gap-4">
        <span
          aria-hidden
          className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-lg font-bold text-primary"
        >
          {user.isGuest ? "G" : (user.email?.[0] ?? "?").toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{user.isGuest ? "Guest" : user.email}</p>
          <p className="text-sm text-muted">
            {user.isGuest
              ? "Saved on this device only, with a smaller daily AI limit."
              : "Synced across your devices."}
          </p>
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        {user.isGuest ? <ButtonLink href="/sign-in?upgrade=1">Create account</ButtonLink> : null}
        <Button variant="secondary" onClick={handleSignOut} isLoading={isSigningOut}>
          Sign out
        </Button>
      </div>

      <dialog
        ref={dialogRef}
        className="m-auto max-w-sm rounded-2xl border border-border bg-background p-6 text-foreground backdrop:bg-black/50"
        aria-labelledby="sign-out-title"
      >
        <h3 id="sign-out-title" className="text-lg font-semibold">
          Sign out of guest session?
        </h3>
        <p className="mt-2 text-sm text-muted">
          Your guest favorites and profile will be lost unless you create an account first.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => dialogRef.current?.close()}>
            Cancel
          </Button>
          <Button onClick={confirmSignOut}>Sign out</Button>
        </div>
      </dialog>
    </section>
  );
}
