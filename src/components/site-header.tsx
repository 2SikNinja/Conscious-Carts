"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { useAuth } from "@/lib/auth/auth-context";
import { compareHref } from "@/lib/compare";
import { useCompare } from "@/lib/compare-context";

import { ButtonLink } from "./ui/button";

type NavItem = {
  /** Path prefix that marks the item active. */
  href: string;
  /** Where the link goes, when it differs from `href`. */
  linkHref?: string;
  label: string;
  icon: ReactNode;
  count?: number;
};

function useNavItems(): NavItem[] {
  const { user } = useAuth();
  const { ids } = useCompare();
  return [
    { href: "/search", label: "Search", icon: <SearchIcon /> },
    { href: "/scan", label: "Scan", icon: <ScanIcon /> },
    { href: "/compare", linkHref: compareHref(ids), label: "Compare", icon: <CompareIcon />, count: ids.length },
    { href: "/favorites", label: "Favorites", icon: <HeartIcon /> },
    { href: "/profile", label: user?.isGuest ? "Guest" : "Profile", icon: <PersonIcon /> },
  ];
}

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

/** Top bar on every screen size; the links move to a bottom tab bar on phones. */
export function SiteHeader() {
  const { status } = useAuth();

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Conscious Carts home">
          <Image src="/logo.png" alt="" width={36} height={36} className="rounded-full" />
          <span className="font-display text-xl text-primary">Conscious Carts</span>
        </Link>

        {status === "signedIn" ? (
          <DesktopNav />
        ) : status === "signedOut" ? (
          <ButtonLink href="/sign-in" variant="secondary">
            Sign in
          </ButtonLink>
        ) : null}
      </div>
    </header>
  );
}

// The nav reads the current path, so it only renders on the client after sign-in,
// never during prerendering.
function DesktopNav() {
  const items = useNavItems();
  const isActive = useIsActive();
  return (
    <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.linkHref ?? item.href}
          aria-current={isActive(item.href) ? "page" : undefined}
          className={
            "flex min-h-10 items-center rounded-xl px-3 text-sm font-semibold transition " +
            (isActive(item.href) ? "bg-surface-strong text-foreground" : "text-muted hover:bg-surface hover:text-foreground")
          }
        >
          {item.label}
          <CountBadge count={item.count} />
        </Link>
      ))}
    </nav>
  );
}

/** Phone navigation pinned to the bottom of the screen, within thumb reach. */
export function MobileTabBar() {
  const { status } = useAuth();
  return status === "signedIn" ? <MobileTabs /> : null;
}

function MobileTabs() {
  const items = useNavItems();
  const isActive = useIsActive();

  return (
    <>
      {/* Keeps page content from ending up under the fixed bar. */}
      <div aria-hidden className="h-[calc(4.5rem+env(safe-area-inset-bottom))] sm:hidden" />
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      >
        <ul className="grid grid-cols-5">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.linkHref ?? item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={
                  "flex h-[4.5rem] flex-col items-center justify-center gap-1 text-xs font-semibold " +
                  (isActive(item.href) ? "text-primary" : "text-muted")
                }
              >
                <span className="relative">
                  {item.icon}
                  {item.count ? (
                    <span className="absolute -right-2.5 -top-1.5 flex size-4.5 items-center justify-center rounded-full bg-primary text-[0.65rem] text-on-primary">
                      {item.count}
                    </span>
                  ) : null}
                </span>
                {item.label}
                {item.count ? <span className="sr-only">, {item.count} selected</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

function CountBadge({ count }: { count?: number }) {
  if (!count) return null;
  return (
    <span className="ml-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-xs text-on-primary">
      {count}
      <span className="sr-only"> selected</span>
    </span>
  );
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

function SearchIcon() {
  return (
    <Icon>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Icon>
  );
}

function ScanIcon() {
  return (
    <Icon>
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M11 8v8M14 8v8M17 8v8" />
    </Icon>
  );
}

function CompareIcon() {
  return (
    <Icon>
      <path d="M7 4v16M17 4v16M3.5 9h7M13.5 15h7" />
    </Icon>
  );
}

function HeartIcon() {
  return (
    <Icon>
      <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.3 4.5 6.9 4.5c2.1 0 3.7 1.2 5.1 3 1.4-1.8 3-3 5.1-3 3.6 0 5.5 3.5 4.2 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" />
    </Icon>
  );
}

function PersonIcon() {
  return (
    <Icon>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c1.3-3.8 4.2-5.5 7.5-5.5s6.2 1.7 7.5 5.5" />
    </Icon>
  );
}
