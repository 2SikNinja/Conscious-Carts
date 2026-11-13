"use client";

import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";
import type { z } from "zod";

import { AppError } from "@/lib/auth/errors";
import { getFirebase } from "@/lib/firebase/client";

/**
 * Callable error codes whose message the backend writes for users
 * (see `toHttpsError` in functions/main.py). Anything else gets a generic message.
 */
const userFacingCodes = new Set([
  "invalid-argument",
  "not-found",
  "resource-exhausted",
  "unavailable",
  "unauthenticated",
  "failed-precondition",
]);

export function toApiError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof FirebaseError) {
    const code = error.code.replace(/^functions\//, "");
    if (code === "deadline-exceeded") {
      return new AppError("That took too long. Please try again.", code);
    }
    // The Firebase SDK appends the HTTP status, like "Message [429]". Users don't need it.
    const message = error.message.replace(/\s*\[\d{3}\]$/, "");
    if (userFacingCodes.has(code) && message) {
      return new AppError(message, code);
    }
    return new AppError("Something went wrong. Please try again.", code);
  }
  return new AppError("Something went wrong. Check your connection and try again.");
}

type CallOptions = { timeoutMs?: number };

/** Calls a Cloud Function and validates its response against `schema`. */
export async function callFunction<Schema extends z.ZodType>(
  name: string,
  data: Record<string, unknown>,
  schema: Schema,
  { timeoutMs = 30_000 }: CallOptions = {},
): Promise<z.infer<Schema>> {
  let raw: unknown;
  try {
    const callable = httpsCallable(getFirebase().functions, name, { timeout: timeoutMs });
    raw = (await callable(data)).data;
  } catch (error) {
    throw toApiError(error);
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    console.error(`Unexpected response from ${name}`, parsed.error);
    throw new AppError("The server sent something unexpected. Please try again.", "bad-response");
  }
  return parsed.data;
}
