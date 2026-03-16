import { spawnSync } from "node:child_process";
import path from "node:path";

import { resolvePagesBasePath } from "./pages-utils.mjs";

const buildScriptPath = path.join(process.cwd(), "scripts", "build-static.mjs");

const pagesBasePath = resolvePagesBasePath();

console.log(`Building GitHub Pages export with base path "${pagesBasePath}"`);

const result = spawnSync(process.execPath, [buildScriptPath], {
  env: {
    ...process.env,
    PAGES_BASE_PATH: pagesBasePath,
  },
  stdio: "inherit",
});

process.exit(result.status ?? 1);
