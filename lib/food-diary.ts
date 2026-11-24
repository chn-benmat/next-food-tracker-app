export const mealOptions = [
  { value: "breakfast", label: "มื้อเช้า" },
  { value: "lunch", label: "มื้อกลางวัน" },
  { value: "dinner", label: "มื้อเย็น" },
  { value: "snack", label: "ของว่าง" },
] as const;

export function localFoodDate(date = new Date()): string {
  return [
    String(date.getFullYear()).padStart(4, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function normalizeFoodDate(value?: string | null): string {
  if (!value) return "";

  // Keep the UTC day used by the existing editor for offset timestamps.
  if (/T.+(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) {
    const timestamp = new Date(value);
    return Number.isNaN(timestamp.getTime()) ? "" : timestamp.toISOString().slice(0, 10);
  }

  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/.exec(value);
  const legacy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  let normalized = "";
  if (iso) {
    normalized = iso[1] + "-" + iso[2] + "-" + iso[3];
  } else if (legacy) {
    normalized = legacy[3] + "-" + legacy[1].padStart(2, "0") + "-" + legacy[2].padStart(2, "0");
  }
  if (!normalized) return "";

  const parsed = new Date(normalized + "T00:00:00Z");
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized
    ? ""
    : normalized;
}

const thaiFoodDate = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function formatFoodDate(date: string): string {
  const parsed = new Date(date + "T00:00:00Z");
  return Number.isNaN(parsed.getTime()) ? "" : thaiFoodDate.format(parsed);
}
