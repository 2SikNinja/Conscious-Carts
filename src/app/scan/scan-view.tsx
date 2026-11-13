"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from "react";

import { Button, Spinner } from "@/components/ui/button";
import { lookupBarcode } from "@/lib/api/foods";
import { friendlyMessage } from "@/lib/auth/errors";
import { normalizeBarcode } from "@/lib/barcode";
import { cameraProblemMessages, cameraProblemOf, createBarcodeReader, type CameraProblem } from "@/lib/scanner";

export function ScanView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isCameraOn, setIsCameraOn] = useState(false);

  const lookup = useMutation({
    mutationFn: (code: string) => lookupBarcode(code),
    onSuccess: (food) => {
      if (!food) return;
      // The product page can show it right away instead of fetching it again.
      queryClient.setQueryData(["food", food.fdcId], food);
      router.push(`/food/${food.fdcId}`);
    },
  });

  function findProduct(code: string) {
    setIsCameraOn(false);
    lookup.mutate(code);
  }

  function scanAgain() {
    lookup.reset();
    setIsCameraOn(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Scan a barcode</h1>
        <p className="mt-1 text-muted">Point your camera at the barcode on a package, or type the number under it.</p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-surface" aria-label="Camera">
        {isCameraOn ? (
          <CameraScanner onDetected={findProduct} onStop={() => setIsCameraOn(false)} />
        ) : (
          <div className="flex aspect-[4/3] max-h-[60vh] w-full flex-col items-center justify-center gap-4 p-6 text-center sm:aspect-video">
            <LookupStatus
              status={lookup.status}
              code={lookup.variables}
              found={lookup.data}
              error={lookup.error}
              onScanAgain={scanAgain}
              onRetry={() => lookup.variables && lookup.mutate(lookup.variables)}
            />
          </div>
        )}
      </section>

      <ManualEntry onSubmit={findProduct} isBusy={lookup.isPending} />
    </div>
  );
}

type LookupStatusProps = {
  status: "idle" | "pending" | "success" | "error";
  code: string | undefined;
  found: unknown;
  error: Error | null;
  onScanAgain: () => void;
  onRetry: () => void;
};

function LookupStatus({ status, code, found, error, onScanAgain, onRetry }: LookupStatusProps) {
  if (status === "pending" || (status === "success" && found)) {
    return (
      <p role="status" className="flex items-center gap-3 text-muted">
        <Spinner className="size-5" />
        {status === "pending" ? `Looking up ${code}…` : "Opening the product…"}
      </p>
    );
  }
  if (status === "success") {
    return (
      <div role="alert" className="flex flex-col items-center gap-3">
        <p className="text-lg font-semibold">No match for {code}</p>
        <p className="max-w-sm text-sm text-muted">
          USDA doesn&apos;t list this barcode. Try searching for the product by name instead.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={onScanAgain}>Scan another</Button>
          <Link
            href="/search"
            className="flex min-h-11 items-center rounded-xl px-4 font-semibold text-primary hover:bg-primary/10"
          >
            Search by name
          </Link>
        </div>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div role="alert" className="flex flex-col items-center gap-3">
        <p className="max-w-sm text-muted">{friendlyMessage(error)}</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
          <Button variant="ghost" onClick={onScanAgain}>
            Scan another
          </Button>
        </div>
      </div>
    );
  }
  return (
    <>
      <BarcodeIcon />
      <Button onClick={onScanAgain}>Start camera</Button>
      <p className="max-w-xs text-sm text-muted">Your browser will ask to use the camera. Video stays on your device.</p>
    </>
  );
}

const scanIntervalMs = 150;
const maxReaderFailures = 20;

function CameraScanner({ onDetected, onStop }: { onDetected: (code: string) => void; onStop: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Checked once on mount; this view only renders in the browser, after sign-in.
  const [problem, setProblem] = useState<CameraProblem | "reader" | null>(() =>
    !window.isSecureContext ? "insecure" : !navigator.mediaDevices?.getUserMedia ? "unsupported" : null,
  );
  const [isScanning, setIsScanning] = useState(false);
  const reportCode = useEffectEvent(onDetected);
  const canStart = problem === null;

  useEffect(() => {
    if (!canStart) return;
    let isCancelled = false;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function start() {
      try {
        // Start loading the reader while the user answers the camera prompt.
        const readerPromise = createBarcodeReader();
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        const video = videoRef.current;
        if (isCancelled || !video) return;
        video.srcObject = stream;
        await video.play();
        const reader = await readerPromise;
        if (isCancelled) return;
        setIsScanning(true);

        let failures = 0;
        const tick = async () => {
          if (isCancelled) return;
          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            try {
              const results = await reader.detect(video);
              failures = 0;
              for (const result of results) {
                const check = normalizeBarcode(result.rawValue, result.format);
                if (check.ok && !isCancelled) {
                  navigator.vibrate?.(60);
                  reportCode(check.code);
                  return;
                }
              }
            } catch {
              failures += 1;
              if (failures >= maxReaderFailures) {
                setProblem("reader");
                return;
              }
            }
          }
          timer = setTimeout(tick, scanIntervalMs);
        };
        void tick();
      } catch (error) {
        if (!isCancelled) setProblem(cameraProblemOf(error));
      }
    }

    void start();
    return () => {
      isCancelled = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [canStart]);

  if (problem) {
    return (
      <div role="alert" className="flex aspect-[4/3] max-h-[60vh] w-full flex-col items-center justify-center gap-4 p-6 text-center sm:aspect-video">
        <BarcodeIcon />
        <p className="max-w-sm text-muted">
          {problem === "reader"
            ? "The barcode reader couldn't load. Type the number under the barcode instead."
            : cameraProblemMessages[problem]}
        </p>
        <Button variant="secondary" onClick={onStop}>
          Close camera
        </Button>
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/3] max-h-[60vh] w-full bg-black sm:aspect-video">
      <video ref={videoRef} muted playsInline aria-label="Camera preview" className="size-full object-cover" />
      <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-2/5 w-4/5 max-w-md rounded-2xl border-4 border-white/90 shadow-[0_0_0_100vmax_rgb(0_0_0/0.35)] motion-safe:animate-pulse" />
      </div>
      <p role="status" className="absolute inset-x-0 top-3 text-center text-sm font-semibold text-white drop-shadow">
        {isScanning ? "Line up the barcode inside the frame" : "Starting camera…"}
      </p>
      <div className="absolute inset-x-0 bottom-3 flex justify-center">
        <Button variant="secondary" onClick={onStop}>
          Stop camera
        </Button>
      </div>
    </div>
  );
}

function ManualEntry({ onSubmit, isBusy }: { onSubmit: (code: string) => void; isBusy: boolean }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const check = normalizeBarcode(value);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setError(null);
    onSubmit(check.code);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-surface p-5" noValidate>
      <label htmlFor="barcode-input" className="text-lg font-semibold">
        Type the number
      </label>
      <p id="barcode-hint" className="mt-1 text-sm text-muted">
        The 8 to 14 digits printed under the barcode.
      </p>
      <div className="mt-4 flex gap-2">
        <input
          id="barcode-input"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
          inputMode="numeric"
          autoComplete="off"
          enterKeyHint="search"
          maxLength={20}
          placeholder="e.g. 036000291452"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "barcode-error barcode-hint" : "barcode-hint"}
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3.5 tabular-nums tracking-wide outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
        />
        <Button type="submit" disabled={!value.trim() || isBusy}>
          Look up
        </Button>
      </div>
      {error ? (
        <p id="barcode-error" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}

function BarcodeIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-12 text-primary" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
      <path d="M7 8v8M10 8v8M13 8v8M15.5 8v8M17.5 8v8" />
    </svg>
  );
}
