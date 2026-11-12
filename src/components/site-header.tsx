"use client";

import Image from "next/image";
import Link from "next/link";

import { useAuth } from "@/lib/auth/auth-context";

import { ButtonLink } from "./ui/button";

export function SiteHeader() {
  const { status, user } = useAuth();

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Conscious Carts home">
          <Image src="/logo.png" alt="" width={36} height={36} className="rounded-full" />
          <span className="font-display text-xl text-primary">Conscious Carts</span>
        </Link>

        <nav aria-label="Account">
          {status === "loading" ? null : status === "signedIn" ? (
            <ButtonLink href="/profile" variant="secondary">
              {user?.isGuest ? "Guest" : "Profile"}
            </ButtonLink>
          ) : (
            <ButtonLink href="/sign-in" variant="secondary">
              Sign in
            </ButtonLink>
          )}
        </nav>
      </div>
    </header>
  );
}
