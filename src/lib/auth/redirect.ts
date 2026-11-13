/** Where people land after signing in when no other page was requested. */
export const defaultSignedInPath = "/search";

/**
 * Validates a `from` value before redirecting to it after sign-in.
 *
 * Only same-site paths are allowed, which blocks open redirects such as
 * `//evil.example` or `https://evil.example` sneaking in through the URL.
 */
export function safeRedirectPath(from: string | null | undefined): string {
  if (!from) return defaultSignedInPath;
  if (!from.startsWith("/") || from.startsWith("//") || from.startsWith("/\\")) {
    return defaultSignedInPath;
  }
  if (from === "/sign-in" || from.startsWith("/sign-in?") || from.startsWith("/sign-in/")) {
    return defaultSignedInPath;
  }
  return from;
}

/** Builds the sign-in URL that returns the visitor to `path` afterwards. */
export function signInUrlFor(path: string): string {
  return `/sign-in?${new URLSearchParams({ from: safeRedirectPath(path) }).toString()}`;
}
