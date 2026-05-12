import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const generatedTypesDirectories = [
  path.join(process.cwd(), ".next", "types"),
  path.join(process.cwd(), ".next", "dev", "types"),
];
const typeScriptBuildInfoPath = path.join(
  process.cwd(),
  "tsconfig.tsbuildinfo",
);
const tsConfigPath = path.join(process.cwd(), "tsconfig.json");
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
const originalTsConfig = fs.readFileSync(tsConfigPath, "utf8");

for (const generatedTypesDirectory of generatedTypesDirectories) {
  fs.rmSync(generatedTypesDirectory, {
    force: true,
    recursive: true,
  });
}
fs.rmSync(typeScriptBuildInfoPath, {
  force: true,
});

const typegenResult = spawnSync(process.execPath, [nextBinaryPath, "typegen"], {
  env: process.env,
  stdio: "inherit",
});

fs.writeFileSync(tsConfigPath, originalTsConfig);

if ((typegenResult.status ?? 1) !== 0) {
  process.exit(typegenResult.status ?? 1);
}

const tscResult = spawnSync(process.execPath, [tscBinaryPath, "--noEmit"], {
  env: process.env,
  stdio: "inherit",
});

process.exit(tscResult.status ?? 1);
