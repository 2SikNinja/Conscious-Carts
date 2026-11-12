import { describe, expect, it } from "vitest";

import { AppError, friendlyMessage, toAuthError } from "./errors";
import { defaultSignedInPath, safeRedirectPath, signInUrlFor } from "./redirect";
import { validateCredentials } from "./validation";

describe("toAuthError", () => {
  it("maps known Firebase codes to friendly messages", () => {
    const error = toAuthError({ code: "auth/invalid-credential", message: "Firebase: raw" });
    expect(error).toBeInstanceOf(AppError);
    expect(error.message).toBe("Email or password is incorrect.");
    expect(error.code).toBe("auth/invalid-credential");
  });

  it("falls back to a generic message for unknown errors", () => {
    expect(toAuthError(new Error("boom")).message).toBe("Sign-in failed. Please try again.");
    expect(toAuthError("weird").code).toBeUndefined();
  });

  it("only shows AppError messages to users", () => {
    expect(friendlyMessage(new AppError("Shown"))).toBe("Shown");
    expect(friendlyMessage(new Error("internal detail"))).not.toContain("internal");
  });
});

describe("safeRedirectPath", () => {
  it.each([
    ["/search?q=oats", "/search?q=oats"],
    ["/food/123", "/food/123"],
  ])("keeps same-site path %s", (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });

  it.each([
    [null],
    [""],
    ["https://evil.example"],
    ["//evil.example"],
    ["/\\evil.example"],
    ["/sign-in"],
    ["/sign-in?from=/profile"],
  ])("rejects %s", (input) => {
    expect(safeRedirectPath(input)).toBe(defaultSignedInPath);
  });

  it("builds an encoded sign-in URL", () => {
    expect(signInUrlFor("/search?q=oat milk")).toBe("/sign-in?from=%2Fsearch%3Fq%3Doat+milk");
  });
});

describe("validateCredentials", () => {
  it("requires a valid email and password", () => {
    expect(validateCredentials({ email: "", password: "" }, "signIn")).toEqual({
      email: "Enter your email.",
      password: "Enter your password.",
    });
    expect(validateCredentials({ email: "a@b", password: "x" }, "signIn").email).toBe(
      "That email looks invalid.",
    );
  });

  it("checks length and confirmation when creating an account", () => {
    const errors = validateCredentials(
      { email: "a@b.co", password: "short", confirmPassword: "different" },
      "create",
    );
    expect(errors.password).toBe("Use at least 8 characters.");
    expect(errors.confirmPassword).toBe("Passwords do not match.");
  });

  it("passes valid input", () => {
    expect(
      validateCredentials(
        { email: " a@b.co ", password: "longenough", confirmPassword: "longenough" },
        "create",
      ),
    ).toEqual({});
  });
});
