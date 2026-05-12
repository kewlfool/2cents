import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { generatePwaAssets } from "./generate-pwa-assets.mjs";

const tsConfigPath = path.join(process.cwd(), "tsconfig.json");
const nextBinaryPath = path.join(
  process.cwd(),
  "node_modules",
  "next",
  "dist",
  "bin",
  "next",
);
const originalTsConfig = fs.readFileSync(tsConfigPath, "utf8");

const result = spawnSync(process.execPath, [nextBinaryPath, "build"], {
  env: process.env,
  stdio: "inherit",
});

fs.writeFileSync(tsConfigPath, originalTsConfig);

if ((result.status ?? 1) !== 0) {
  process.exit(result.status ?? 1);
}

generatePwaAssets();
