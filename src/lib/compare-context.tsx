"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { maxCompareItems, parseCompareIds } from "./compare";

const storageKey = "conscious-carts:compare";

type CompareContextValue = {
  ids: number[];
  isComparing: (fdcId: number) => boolean;
  /** Returns false when the tray is already full. */
  toggle: (fdcId: number) => boolean;
  remove: (fdcId: number) => void;
  replace: (ids: number[]) => void;
  clear: () => void;
};

const CompareContext = createContext<CompareContextValue | null>(null);

function readStoredIds(): number[] {
  try {
    return parseCompareIds(window.localStorage.getItem(storageKey));
  } catch {
    return [];
  }
}

function storeIds(ids: number[]) {
  try {
    window.localStorage.setItem(storageKey, ids.join(","));
  } catch {
    // Storage can be unavailable (private mode, blocked site data). The tray still works for this visit.
  }
}

/** The products picked for comparison. Saved in this browser so the tray survives a refresh. */
export function CompareProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<number[]>([]);

  // Read storage after mount so server and client render the same initial HTML.
  useEffect(() => {
    const stored = readStoredIds();
    if (stored.length > 0) queueMicrotask(() => setIds(stored));
  }, []);

  const update = useCallback((next: number[]) => {
    setIds(next);
    storeIds(next);
  }, []);

  const isComparing = useCallback((fdcId: number) => ids.includes(fdcId), [ids]);

  const toggle = useCallback(
    (fdcId: number) => {
      if (ids.includes(fdcId)) {
        update(ids.filter((id) => id !== fdcId));
        return true;
      }
      if (ids.length >= maxCompareItems) return false;
      update([...ids, fdcId]);
      return true;
    },
    [ids, update],
  );

  const remove = useCallback((fdcId: number) => update(ids.filter((id) => id !== fdcId)), [ids, update]);
  const replace = useCallback((next: number[]) => update(next.slice(0, maxCompareItems)), [update]);
  const clear = useCallback(() => update([]), [update]);

  const value = useMemo(
    () => ({ ids, isComparing, toggle, remove, replace, clear }),
    [ids, isComparing, toggle, remove, replace, clear],
  );
  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare(): CompareContextValue {
  const context = useContext(CompareContext);
  if (!context) throw new Error("useCompare must be used inside <CompareProvider>.");
  return context;
}
