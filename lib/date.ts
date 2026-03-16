import { monthKeySchema } from "@/types/domain";

function resolveDateParts(dateInput: string | Date) {
  if (dateInput instanceof Date) {
    return {
      day: dateInput.getDate(),
      month: dateInput.getMonth() + 1,
      year: dateInput.getFullYear(),
    };
  }

  const [rawYear, rawMonth, rawDay] = dateInput.split("-");
  const year = Number(rawYear);
  const month = Number(rawMonth);
  const day = Number(rawDay);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new Error("Month keys require dates in YYYY-MM-DD format.");
  }

  return {
    day,
    month,
    year,
  };
}

function shiftMonth(year: number, month: number, delta: number) {
  const shiftedDate = new Date(Date.UTC(year, month - 1 + delta, 1));

  return {
    month: shiftedDate.getUTCMonth() + 1,
    year: shiftedDate.getUTCFullYear(),
  };
}

export function toMonthKey(dateInput: string | Date, monthStartDay = 1) {
  const dateParts = resolveDateParts(dateInput);
  const effectiveMonth =
    dateParts.day < monthStartDay
      ? shiftMonth(dateParts.year, dateParts.month, -1)
      : {
          month: dateParts.month,
          year: dateParts.year,
        };

  return monthKeySchema.parse(
    `${effectiveMonth.year}-${String(effectiveMonth.month).padStart(2, "0")}`,
  );
}

export function compareMonthKeysDesc(left: string, right: string) {
  return right.localeCompare(left);
}

export function createIsoTimestamp(date = new Date()) {
  return date.toISOString();
}

export function getCurrentMonthKey(date = new Date(), monthStartDay = 1) {
  return toMonthKey(date, monthStartDay);
}

function getMonthKeyRange(monthKey: string, monthStartDay: number) {
  const [rawYear, rawMonth] = monthKey.split("-");
  const year = Number(rawYear);
  const month = Number(rawMonth);

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return null;
  }

  const start = new Date(Date.UTC(year, month - 1, monthStartDay));
  const end = new Date(
    Date.UTC(year, month, monthStartDay === 1 ? 1 : monthStartDay),
  );
  end.setUTCDate(end.getUTCDate() - 1);

  return {
    end,
    start,
  };
}

export function formatMonthKeyLabel(
  monthKey: string,
  locale = "en-US",
  monthStartDay = 1,
) {
  const range = getMonthKeyRange(monthKey, monthStartDay);

  if (!range) {
    return monthKey;
  }

  if (monthStartDay > 1) {
    const startLabel = new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(range.start);
    const endLabel = new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
      year: "numeric",
    }).format(range.end);

    return `${startLabel} - ${endLabel}`;
  }

  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(range.start);
}
