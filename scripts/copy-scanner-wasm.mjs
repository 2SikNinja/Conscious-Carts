// Copies the barcode reader's WebAssembly file into public/ so the scanner
// loads it from this site instead of a third-party CDN. The version is part of
// the path, so browsers never keep a stale copy after an upgrade.
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

import { ZXING_WASM_VERSION as version } from "barcode-detector/ponyfill";

const root = join(import.meta.dirname, "..");
const candidates = [
  join(root, "node_modules", "barcode-detector", "node_modules", "zxing-wasm"),
  join(root, "node_modules", "zxing-wasm"),
];
const packageDir = candidates.find((dir) => existsSync(join(dir, "dist", "reader", "zxing_reader.wasm")));
if (!packageDir) throw new Error("zxing-wasm is not installed. Run npm install.");

const outputRoot = join(root, "public", "zxing");
mkdirSync(outputRoot, { recursive: true });
for (const entry of readdirSync(outputRoot)) {
  if (entry !== version) rmSync(join(outputRoot, entry), { recursive: true, force: true });
}

const outputDir = join(outputRoot, version);
mkdirSync(outputDir, { recursive: true });
copyFileSync(join(packageDir, "dist", "reader", "zxing_reader.wasm"), join(outputDir, "zxing_reader.wasm"));
console.log(`Copied zxing_reader.wasm ${version} to public/zxing/${version}/`);
