import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");

if (!existsSync(standalone)) {
  console.log("No .next/standalone output; skipping static copy.");
  process.exit(0);
}

const staticSrc = path.join(root, ".next", "static");
const staticDest = path.join(standalone, ".next", "static");
if (!existsSync(staticSrc)) {
  console.error("Missing .next/static after the Next.js build.");
  process.exit(1);
}

rmSync(staticDest, { recursive: true, force: true });
mkdirSync(path.dirname(staticDest), { recursive: true });
cpSync(staticSrc, staticDest, { recursive: true });

const publicSrc = path.join(root, "public");
if (existsSync(publicSrc)) {
  const publicDest = path.join(standalone, "public");
  rmSync(publicDest, { recursive: true, force: true });
  cpSync(publicSrc, publicDest, { recursive: true });
}

console.log("Standalone server is ready in .next/standalone.");
