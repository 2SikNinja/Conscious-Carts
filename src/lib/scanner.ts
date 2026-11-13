"use client";

import { barcodeFormats } from "./barcode";

/** The part of the Barcode Detection API the scanner uses. */
export type BarcodeReader = {
  detect: (source: HTMLVideoElement) => Promise<{ rawValue: string; format: string }[]>;
};

type NativeDetectorClass = {
  new (options: { formats: string[] }): BarcodeReader;
  getSupportedFormats: () => Promise<string[]>;
};

/**
 * Uses the browser's built-in barcode detector when it reads retail barcodes
 * (Chrome on Android, for example). Everywhere else, including Safari, loads a
 * WebAssembly reader served from this site.
 */
export async function createBarcodeReader(): Promise<BarcodeReader> {
  const native = (globalThis as { BarcodeDetector?: NativeDetectorClass }).BarcodeDetector;
  if (native) {
    try {
      const supported = await native.getSupportedFormats();
      const formats = barcodeFormats.filter((format) => supported.includes(format));
      if (formats.includes("ean_13") && formats.includes("upc_a")) return new native({ formats });
    } catch {
      // Fall through to the WebAssembly reader.
    }
  }

  const { BarcodeDetector, ZXING_WASM_VERSION, prepareZXingModule } = await import("barcode-detector/ponyfill");
  prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) =>
        path.endsWith(".wasm") ? `/zxing/${ZXING_WASM_VERSION}/${path}` : prefix + path,
    },
    fireImmediately: true,
  });
  return new BarcodeDetector({ formats: [...barcodeFormats] });
}

export type CameraProblem = "blocked" | "missing" | "busy" | "insecure" | "unsupported" | "unknown";

/** Maps getUserMedia failures to something the UI can explain. */
export function cameraProblemOf(error: unknown): CameraProblem {
  const name = error instanceof Error || error instanceof DOMException ? error.name : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "blocked";
    case "NotFoundError":
    case "OverconstrainedError":
      return "missing";
    case "NotReadableError":
    case "AbortError":
      return "busy";
    default:
      return "unknown";
  }
}

export const cameraProblemMessages: Record<CameraProblem, string> = {
  blocked: "Camera access is blocked. Allow it in your browser's site settings, or type the number instead.",
  missing: "No camera was found on this device. Type the number under the barcode instead.",
  busy: "The camera is being used by another app. Close it and try again.",
  insecure: "The camera only works over a secure (https) connection.",
  unsupported: "This browser can't use the camera. Type the number under the barcode instead.",
  unknown: "The camera couldn't start. Try again, or type the number instead.",
};
