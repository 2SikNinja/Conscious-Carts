/** A user-facing error whose message is safe to show as-is. */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

const authMessages: Record<string, string> = {
  "auth/invalid-email": "That email address looks invalid.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/user-not-found": "Email or password is incorrect.",
  "auth/wrong-password": "Email or password is incorrect.",
  "auth/invalid-credential": "Email or password is incorrect.",
  "auth/email-already-in-use": "An account already exists for that email. Try signing in.",
  "auth/credential-already-in-use": "An account already exists for that email. Try signing in.",
  "auth/weak-password": "Use a password with at least 8 characters.",
  "auth/too-many-requests": "Too many attempts. Wait a moment and try again.",
  "auth/network-request-failed": "No connection. Check your internet and try again.",
  "auth/operation-not-allowed": "This sign-in method isn't enabled yet.",
  "auth/popup-closed-by-user": "Sign-in was cancelled.",
};

function errorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

/** Converts a Firebase Auth error into a friendly AppError. */
export function toAuthError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  const code = errorCode(error);
  const message = (code && authMessages[code]) ?? "Sign-in failed. Please try again.";
  return new AppError(message, code);
}

/** The message to show for any error, without leaking internals. */
export function friendlyMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  return "Something went wrong. Check your connection and try again.";
}
