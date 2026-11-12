export type CredentialMode = "signIn" | "create";

export type CredentialInput = {
  email: string;
  password: string;
  confirmPassword?: string;
};

export type CredentialErrors = Partial<Record<keyof CredentialInput, string>>;

const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const minPasswordLength = 8;

/** Client-side checks for instant feedback. Firebase still enforces its own rules. */
export function validateCredentials(input: CredentialInput, mode: CredentialMode): CredentialErrors {
  const errors: CredentialErrors = {};
  const email = input.email.trim();

  if (!email) errors.email = "Enter your email.";
  else if (!emailPattern.test(email)) errors.email = "That email looks invalid.";

  if (!input.password) errors.password = "Enter your password.";
  else if (mode === "create" && input.password.length < minPasswordLength) {
    errors.password = `Use at least ${minPasswordLength} characters.`;
  }

  if (mode === "create" && input.confirmPassword !== input.password) {
    errors.confirmPassword = "Passwords do not match.";
  }
  return errors;
}
