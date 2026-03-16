import { spawnSync } from "node:child_process";
import path from "node:path";

import { generatePwaAssets } from "./generate-pwa-assets.mjs";

const nextBinaryPath = path.join(
  process.cwd(),
  "node_modules",
  "next",
  "dist",
  "bin",
  "next",
);

const result = spawnSync(process.execPath, [nextBinaryPath, "build"], {
  env: process.env,
  stdio: "inherit",
});

if ((result.status ?? 1) !== 0) {
  process.exit(result.status ?? 1);
}

generatePwaAssets();
