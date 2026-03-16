import fs from "node:fs";
import path from "node:path";

import { resolvePagesBasePath } from "./pages-utils.mjs";

const exportDirectory = path.join(process.cwd(), "out");

if (!fs.existsSync(exportDirectory)) {
  throw new Error('Static export not found. Run "npm run build:pages" first.');
}

const pagesBasePath = resolvePagesBasePath();
const previewRoot = path.join(process.cwd(), ".preview");
const previewSubdirectory = pagesBasePath.replace(/^\//, "");
const previewTarget = path.join(previewRoot, previewSubdirectory);

fs.rmSync(previewRoot, { force: true, recursive: true });
fs.mkdirSync(previewTarget, { recursive: true });
fs.cpSync(exportDirectory, previewTarget, { recursive: true });

fs.writeFileSync(
  path.join(previewRoot, "index.html"),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0; url=${pagesBasePath}/" />
    <title>2cents preview</title>
  </head>
  <body>
    <p>Redirecting to <a href="${pagesBasePath}/">${pagesBasePath}/</a>...</p>
  </body>
</html>
`,
);

console.log(
  `GitHub Pages preview is ready at http://localhost:3000${pagesBasePath}/`,
);
