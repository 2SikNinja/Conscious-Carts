"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { AuthProvider } from "@/lib/auth/auth-context";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // USDA data barely changes, so results stay fresh for a few minutes.
        staleTime: 5 * 60 * 1000,
        // One retry for flaky networks. Errors that need the user (quota, bad input) aren't retried.
        retry: (failureCount, error) => {
          const code = (error as { code?: string }).code;
          if (code === "resource-exhausted" || code === "invalid-argument" || code === "not-found") return false;
          return failureCount < 1;
        },
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  // One client per browser session, created lazily so it isn't shared across requests.
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
