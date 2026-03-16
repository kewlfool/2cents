import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const generatedTypesDirectory = path.join(process.cwd(), ".next", "types");
const nextBinaryPath = path.join(
  process.cwd(),
  "node_modules",
  "next",
  "dist",
  "bin",
  "next",
);
const tscBinaryPath = path.join(
  process.cwd(),
  "node_modules",
  "typescript",
  "bin",
  "tsc",
);

fs.rmSync(generatedTypesDirectory, {
  force: true,
  recursive: true,
});

const typegenResult = spawnSync(process.execPath, [nextBinaryPath, "typegen"], {
  env: process.env,
  stdio: "inherit",
});

if ((typegenResult.status ?? 1) !== 0) {
  process.exit(typegenResult.status ?? 1);
}

const tscResult = spawnSync(process.execPath, [tscBinaryPath, "--noEmit"], {
  env: process.env,
  stdio: "inherit",
});

process.exit(tscResult.status ?? 1);
