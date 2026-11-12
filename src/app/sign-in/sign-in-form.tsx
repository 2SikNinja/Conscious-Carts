"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { useAuth } from "@/lib/auth/auth-context";
import { friendlyMessage } from "@/lib/auth/errors";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { validateCredentials, type CredentialErrors, type CredentialMode } from "@/lib/auth/validation";

type BusyAction = "submit" | "guest" | "reset" | null;

export function SignInForm() {
  const { status, user, signIn, createAccount, continueAsGuest, sendPasswordReset } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // ?upgrade=1 means a guest is turning their session into a real account.
  const isUpgrade = searchParams.get("upgrade") === "1";
  const redirectTo = safeRedirectPath(searchParams.get("from"));

  const [mode, setMode] = useState<CredentialMode>(isUpgrade ? "create" : "signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<CredentialErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<BusyAction>(null);

  // Leave this page once signed in, except for a guest who came here to upgrade.
  useEffect(() => {
    if (status !== "signedIn") return;
    if (isUpgrade && user?.isGuest) return;
    router.replace(redirectTo);
  }, [status, user, isUpgrade, redirectTo, router]);

  async function run(action: Exclude<BusyAction, null>, task: () => Promise<void>) {
    setBusy(action);
    setFormError(null);
    setNotice(null);
    try {
      await task();
    } catch (error) {
      setFormError(friendlyMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateCredentials({ email, password, confirmPassword }, mode);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    await run("submit", async () => {
      if (mode === "create") {
        await createAccount(email, password);
        if (isUpgrade) router.replace("/profile");
      } else {
        await signIn(email, password);
      }
    });
  }

  async function handleReset() {
    const errors = validateCredentials({ email, password: "placeholder" }, "signIn");
    if (errors.email) {
      setFieldErrors({ email: "Enter your email above, then choose Forgot password." });
      return;
    }
    await run("reset", async () => {
      await sendPasswordReset(email);
      setNotice(`If an account exists for ${email.trim()}, a reset link is on its way.`);
    });
  }

  function switchMode(next: CredentialMode) {
    setMode(next);
    setFieldErrors({});
    setFormError(null);
    setNotice(null);
  }

  const isCreating = mode === "create";

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <Image src="/logo.png" alt="" width={88} height={88} className="rounded-full" priority />
        <h1 className="text-2xl font-bold">
          {isUpgrade ? "Create your account" : isCreating ? "Create an account" : "Welcome back"}
        </h1>
        <p className="text-muted">
          {isUpgrade
            ? "Keep your favorites and dietary profile, and sign in from any device."
            : "Know what you eat before it hits your cart."}
        </p>
      </div>

      {!isUpgrade ? (
        <div role="tablist" aria-label="Sign in or create an account" className="mb-6 grid grid-cols-2 rounded-xl bg-surface p-1">
          {(["signIn", "create"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={mode === option}
              onClick={() => switchMode(option)}
              className={
                "min-h-10 rounded-lg text-sm font-semibold transition " +
                (mode === option ? "bg-background shadow-sm" : "text-muted hover:text-foreground")
              }
            >
              {option === "signIn" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors.email}
        />
        <TextField
          label="Password"
          type={showPassword ? "text" : "password"}
          autoComplete={isCreating ? "new-password" : "current-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password}
        />
        {isCreating ? (
          <TextField
            label="Confirm password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            error={fieldErrors.confirmPassword}
          />
        ) : null}

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-muted">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(event) => setShowPassword(event.target.checked)}
              className="size-4 accent-primary"
            />
            Show password
          </label>
          {!isCreating ? (
            <button
              type="button"
              onClick={handleReset}
              disabled={busy !== null}
              className="font-medium text-primary hover:underline disabled:opacity-60"
            >
              Forgot password?
            </button>
          ) : null}
        </div>

        {formError ? (
          <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
            {formError}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="rounded-xl bg-success/10 px-4 py-3 text-sm text-success">
            {notice}
          </p>
        ) : null}

        <Button type="submit" isLoading={busy === "submit"} disabled={busy !== null}>
          {isCreating ? "Create account" : "Sign in"}
        </Button>
      </form>

      {!isUpgrade ? (
        <>
          <div className="my-6 flex items-center gap-3 text-sm text-muted">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
          <Button
            variant="secondary"
            onClick={() => run("guest", continueAsGuest)}
            isLoading={busy === "guest"}
            disabled={busy !== null}
          >
            Continue as guest
          </Button>
          <p className="mt-3 text-center text-sm text-muted">
            Guests get a smaller daily AI limit and can create an account later without losing anything.
          </p>
        </>
      ) : null}
    </div>
  );
}
