"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { compareHref, maxCompareItems } from "@/lib/compare";
import { useCompare } from "@/lib/compare-context";

type CompareButtonProps = {
  fdcId: number;
  name: string;
  /** "icon" for list rows, "labeled" for the product page. */
  variant?: "icon" | "labeled";
  className?: string;
};

export function CompareButton({ fdcId, name, variant = "icon", className = "" }: CompareButtonProps) {
  const { ids, isComparing, toggle } = useCompare();
  const [notice, setNotice] = useState<"full" | "added" | null>(null);
  const isSelected = isComparing(fdcId);
  const label = isSelected ? `Remove ${name} from compare` : `Add ${name} to compare`;

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  function handleClick() {
    const wasSelected = isSelected;
    const changed = toggle(fdcId);
    if (!changed) setNotice("full");
    else setNotice(!wasSelected && variant === "labeled" ? "added" : null);
  }

  return (
    <span className={`relative inline-flex flex-col items-end ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={isSelected}
        aria-label={variant === "icon" ? label : undefined}
        title={label}
        className={
          "inline-flex items-center justify-center gap-2 rounded-xl transition " +
          (variant === "icon"
            ? `size-11 hover:bg-surface-strong ${isSelected ? "text-primary" : "text-muted hover:text-foreground"}`
            : `min-h-11 border px-4 text-sm font-semibold ${
                isSelected ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface hover:bg-surface-strong"
              }`)
        }
      >
        <CompareIcon selected={isSelected} />
        {variant === "labeled" ? (isSelected ? "Comparing" : "Compare") : null}
      </button>
      {notice ? (
        <span
          role="status"
          className="absolute top-full z-20 mt-1 w-max max-w-60 rounded-lg bg-foreground px-3 py-1.5 text-xs text-background shadow-lg"
        >
          {notice === "full" ? (
            `You can compare up to ${maxCompareItems} products.`
          ) : (
            <>
              Added.{" "}
              <Link href={compareHref(ids)} className="font-semibold underline">
                View comparison
              </Link>
            </>
          )}
        </span>
      ) : null}
    </span>
  );
}

function CompareIcon({ selected }: { selected: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      {selected ? (
        <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinejoin="round" />
      ) : (
        <>
          <path d="M7 4v16M17 4v16" />
          <path d="M3.5 9h7M13.5 15h7" />
        </>
      )}
    </svg>
  );
}
