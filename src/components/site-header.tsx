"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

        <nav aria-label="Main" className="flex items-center gap-1">
          {status === "loading" ? null : status === "signedIn" ? (
            <>
              <NavLink href="/search" label="Search" />
              <NavLink href="/favorites" label="Favorites" />
              <NavLink href="/profile" label={user?.isGuest ? "Guest" : "Profile"} />
            </>
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

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={
        "flex min-h-10 items-center rounded-xl px-3 text-sm font-semibold transition " +
        (isActive ? "bg-surface-strong text-foreground" : "text-muted hover:bg-surface hover:text-foreground")
      }
    >
      {label}
    </Link>
  );
}
