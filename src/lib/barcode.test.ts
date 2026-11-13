import { describe, expect, it } from "vitest";

import { expandUpcE, hasValidCheckDigit, normalizeBarcode } from "./barcode";

describe("hasValidCheckDigit", () => {
  it("accepts valid UPC-A, EAN-13, and EAN-8 codes", () => {
    expect(hasValidCheckDigit("036000291452")).toBe(true);
    expect(hasValidCheckDigit("4006381333931")).toBe(true);
    expect(hasValidCheckDigit("96385074")).toBe(true);
  });

  it("rejects a wrong check digit", () => {
    expect(hasValidCheckDigit("036000291453")).toBe(false);
    expect(hasValidCheckDigit("")).toBe(false);
  });
});

describe("expandUpcE", () => {
  it("expands each UPC-E pattern", () => {
    expect(expandUpcE("04252614")).toBe("042100005264");
    expect(expandUpcE("01234531")).toBe("012300000451");
    expect(expandUpcE("01234558")).toBe("012345000058");
  });

  it("returns null for codes that can't be UPC-E", () => {
    expect(expandUpcE("24252614")).toBeNull();
    expect(expandUpcE("1234")).toBeNull();
  });
});

describe("normalizeBarcode", () => {
  it("strips spaces and dashes", () => {
    expect(normalizeBarcode(" 0 36000-29145 2 ")).toEqual({ ok: true, code: "036000291452" });
  });

  it("expands UPC-E when the scanner reports it", () => {
    expect(normalizeBarcode("04252614", "upc_e")).toEqual({ ok: true, code: "042100005264" });
  });

  it("keeps a valid EAN-8 as is", () => {
    expect(normalizeBarcode("96385074")).toEqual({ ok: true, code: "96385074" });
  });

  it("expands a typed 8-digit code that only works as UPC-E", () => {
    expect(normalizeBarcode("04252614")).toEqual({ ok: true, code: "042100005264" });
  });

  it("explains what's wrong", () => {
    expect(normalizeBarcode("abc")).toMatchObject({ ok: false, error: expect.stringContaining("numbers") });
    expect(normalizeBarcode("12345")).toMatchObject({ ok: false, error: expect.stringContaining("digits long") });
    expect(normalizeBarcode("036000291453")).toMatchObject({ ok: false, error: expect.stringContaining("check") });
  });
});
