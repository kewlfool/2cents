function normalizeBasePath(value: string) {
  if (!value || value === "/") {
    return "";
  }

  const trimmed = value.trim().replace(/\/+$/, "");

  if (!trimmed) {
    return "";
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function getBasePath() {
  return normalizeBasePath(process.env["NEXT_PUBLIC_BASE_PATH"] ?? "");
}

export function withBasePath(pathname: string) {
  const normalizedPathname = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${getBasePath()}${normalizedPathname}`;
}
