export function formatMinorUnits(
  value: number,
  currency = "USD",
  locale = "en-US",
) {
  return new Intl.NumberFormat(locale, {
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value / 100);
}

export function sumMinorUnits(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

export function parseMajorUnitToMinorUnits(value: number | string) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return null;
    }

    return Math.round(value * 100);
  }

  const normalized = value
    .trim()
    .replace(/\s+/g, "")
    .replace(/[$,]/g, "")
    .replace(/^\((.*)\)$/, "-$1");

  if (!normalized) {
    return null;
  }

  const parsedNumber = Number(normalized);

  if (!Number.isFinite(parsedNumber)) {
    return null;
  }

  return Math.round(parsedNumber * 100);
}
