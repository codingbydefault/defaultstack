import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const server = path.join(root, ".next", "standalone", "server.js");
// Load runtime configuration from the checkout, rather than requiring a rebuild
// when the dashboard snapshot path or backend address changes.
for (const filename of [".env.local", ".env"]) {
  const envFile = path.join(root, filename);
  if (existsSync(envFile)) {
    if (typeof process.loadEnvFile !== "function") {
      console.error("Runtime env loading requires Node.js 20.12 or later.");
      process.exit(1);
    }
    process.loadEnvFile(envFile);
  }
}

if (!existsSync(server)) {
  console.error("Standalone server is missing. Run npm run build first.");
  process.exit(1);
}

// BIND_HOST wins. Otherwise pin 127.0.0.1. The process HOSTNAME on Ubuntu is
// the machine name, and Next's standalone server treats HOSTNAME as the bind address.
const child = spawn(process.execPath, [server], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || "production",
    PORT: process.env.PORT || "3100",
    HOSTNAME: process.env.BIND_HOST || "127.0.0.1",
  },
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("error", (error) => {
  console.error("Could not start the dashboard:", error.message);
  process.exit(1);
});
child.on("exit", (code, signal) => {
  for (const name of ["SIGINT", "SIGTERM"]) process.removeAllListeners(name);
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
