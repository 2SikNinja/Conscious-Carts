/**
 * Helpers for retail barcodes (UPC-A, UPC-E, EAN-8, EAN-13, GTIN-14).
 * USDA stores UPCs as 12 or 13 digits, so short UPC-E codes are expanded first.
 */

export const barcodeFormats = ["ean_13", "ean_8", "upc_a", "upc_e"] as const;

const validLengths = new Set([8, 12, 13, 14]);

/** True when the last digit is the correct GTIN check digit. */
export function hasValidCheckDigit(digits: string): boolean {
  if (!/^\d+$/.test(digits) || digits.length < 2) return false;
  const body = digits.slice(0, -1);
  let sum = 0;
  // Weights alternate 3, 1 starting from the digit next to the check digit.
  for (let index = 0; index < body.length; index++) {
    const digit = Number(body[body.length - 1 - index]);
    sum += index % 2 === 0 ? digit * 3 : digit;
  }
  return (10 - (sum % 10)) % 10 === Number(digits.at(-1));
}

/** Expands an 8-digit UPC-E code to its 12-digit UPC-A form, or null if it isn't one. */
export function expandUpcE(code: string): string | null {
  if (!/^[01]\d{7}$/.test(code)) return null;
  const numberSystem = code[0];
  const [d1, d2, d3, d4, d5, d6] = code.slice(1, 7);
  const check = code[7];
  let body: string;
  switch (d6) {
    case "0":
    case "1":
    case "2":
      body = `${d1}${d2}${d6}0000${d3}${d4}${d5}`;
      break;
    case "3":
      body = `${d1}${d2}${d3}00000${d4}${d5}`;
      break;
    case "4":
      body = `${d1}${d2}${d3}${d4}00000${d5}`;
      break;
    default:
      body = `${d1}${d2}${d3}${d4}${d5}0000${d6}`;
  }
  return `${numberSystem}${body}${check}`;
}

export type BarcodeCheck = { ok: true; code: string } | { ok: false; error: string };

/**
 * Cleans a scanned or typed barcode. Spaces and dashes are ignored. UPC-E is
 * expanded when the scanner says so, or when an 8-digit code only checks out
 * as UPC-E.
 */
export function normalizeBarcode(input: string, format?: string): BarcodeCheck {
  const digits = input.replace(/[\s-]/g, "");
  if (!/^\d+$/.test(digits)) {
    return { ok: false, error: "Use only the numbers under the barcode." };
  }
  if (!validLengths.has(digits.length)) {
    return { ok: false, error: "Barcodes are 8, 12, 13, or 14 digits long." };
  }

  if (digits.length === 8 && (format === "upc_e" || !hasValidCheckDigit(digits))) {
    const expanded = expandUpcE(digits);
    if (expanded && hasValidCheckDigit(expanded)) return { ok: true, code: expanded };
  }
  if (!hasValidCheckDigit(digits)) {
    return { ok: false, error: "That number doesn't check out. Double-check the digits." };
  }
  return { ok: true, code: digits };
}
