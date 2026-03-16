import { spawnSync } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const releaseScripts = [
  "lint",
  "typecheck",
  "test",
  "e2e",
  "e2e:pwa",
  "build",
];

for (const scriptName of releaseScripts) {
  console.log(`\n> Running release check step: npm run ${scriptName}\n`);

  const result = spawnSync(npmCommand, ["run", scriptName], {
    env: process.env,
    stdio: "inherit",
  });

  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("\nRelease check completed successfully.\n");
