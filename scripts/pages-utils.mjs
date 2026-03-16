import fs from "node:fs";
import path from "node:path";

function readPackageName() {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const packageName =
    typeof packageJson.name === "string" ? packageJson.name : "2cents";

  return packageName.replace(/^@[^/]+\//, "");
}

function normalizeBasePath(basePath) {
  if (!basePath || basePath === "/") {
    return "";
  }

  return basePath.startsWith("/") ? basePath : `/${basePath}`;
}

export function resolvePagesBasePath() {
  const configuredBasePath = process.env.PAGES_BASE_PATH;

  if (configuredBasePath) {
    return normalizeBasePath(configuredBasePath);
  }

  return normalizeBasePath(readPackageName());
}
