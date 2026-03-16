import type { NextConfig } from "next";

const pagesBasePath = process.env["PAGES_BASE_PATH"];
const resolvedBasePath = pagesBasePath ?? "";

const nextConfig: NextConfig = {
  ...(resolvedBasePath ? { basePath: resolvedBasePath } : {}),
  // GitHub Pages only serves static assets, so the app must remain exportable.
  env: {
    NEXT_PUBLIC_BASE_PATH: resolvedBasePath,
  },
  output: "export",
  images: {
    unoptimized: true,
  },
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
