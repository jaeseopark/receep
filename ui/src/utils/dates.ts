import { formatDistanceToNow, isValid } from "date-fns";

const YEAR_MIN = 1970;
const YEAR_MAX = 2069;

function isValidMonth(m: number) {
  return m >= 1 && m <= 12;
}
function isValidDay(d: number) {
  return d >= 1 && d <= 31;
}

/**
 * Try to parse month and day from a string of digits.
 * Returns [month, day] (1-based) if unambiguous, or null if ambiguous/invalid.
 *
 * Interpretation A: first 2 chars = month, remaining = day (1 or 2 chars)
 * Interpretation B: first 1 char  = month, remaining = day (1 or 2 chars)
 */
function parseMonthDay(s: string): [number, number] | null {
  if (s.length === 4) {
    const m = parseInt(s.slice(0, 2));
    const d = parseInt(s.slice(2, 4));
    return isValidMonth(m) && isValidDay(d) ? [m, d] : null;
  }

  if (s.length === 3) {
    const mA = parseInt(s.slice(0, 2));
    const dA = parseInt(s.slice(2));
    const validA = isValidMonth(mA) && isValidDay(dA);

    const mB = parseInt(s.slice(0, 1));
    const dB = parseInt(s.slice(1));
    const validB = isValidMonth(mB) && isValidDay(dB);

    if (validA && validB && (mA !== mB || dA !== dB)) return null; // ambiguous
    if (validA) return [mA, dA];
    if (validB) return [mB, dB];
    return null;
  }

  if (s.length === 2) {
    // If the raw pair forms a valid month, the user may still be typing the day — treat as in-progress.
    const mA = parseInt(s);
    if (isValidMonth(mA)) return null;

    // Otherwise try single-digit month + single-digit day.
    const mB = parseInt(s[0]);
    const dB = parseInt(s[1]);
    return isValidMonth(mB) && isValidDay(dB) ? [mB, dB] : null;
  }

  return null;
}

/**
 * Attempt to interpret a loosely formatted date string and normalize it to
 * "YYYY-MM-DD". Returns null when the input is ambiguous or invalid.
 *
 * Supported year range: 1970–2069.
 * Supported inputs (dashes optional / misplaced):
 *   "20250312", "250312", "25-0312", "2025-0112", "2025-32", "2532", …
 */
export function normalizeDate(input: string): string | null {
  const digits = input.replace(/[\s-]/g, "");
  if (!/^\d+$/.test(digits) || digits.length < 4) return null;

  let year: number | null = null;
  let remaining: string = "";

  // Try 4-digit year first.
  if (digits.length >= 4) {
    const y4 = parseInt(digits.slice(0, 4));
    if (y4 >= YEAR_MIN && y4 <= YEAR_MAX) {
      year = y4;
      remaining = digits.slice(4);
    }
  }

  // Fall back to 2-digit year.
  if (year === null) {
    const y2 = parseInt(digits.slice(0, 2));
    const fullYear = y2 <= 69 ? 2000 + y2 : 1900 + y2;
    if (fullYear >= YEAR_MIN && fullYear <= YEAR_MAX) {
      year = fullYear;
      remaining = digits.slice(2);
    }
  }

  if (year === null) return null;
  if (remaining.length === 0 || remaining.length > 4) return null;

  const parsed = parseMonthDay(remaining);
  if (!parsed) return null;

  const [month, day] = parsed;

  // Guard against overflows like Feb 30.
  const date = new Date(year, month - 1, day);
  if (!isValid(date) || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export const TZ_OFFSET_HRS = -new Date().getTimezoneOffset() / 60;

// TODO: ensure this function reflects the current timezone.
export const toRelativeTime = (epoch: number): string => {
  // the epoch times in the backend are in seconds, so applying 1000 to make it ms.
  // addSuffix adds "ago"
  // strings are prefixed with "about" so replacing that as well.
  return formatDistanceToNow(new Date(epoch * 1000), { addSuffix: true })
    .replace("about ", "")
    .replace("less than a minute ago", "Just now")
    .replace("in less than a minute", "Just now");
};

export const toAbsoluteDate = (epoch: number): string => {
  const date = new Date((epoch - TZ_OFFSET_HRS * 3600) * 1000);
  return date.toISOString().split("T")[0];
};

export const getYearTimestamps = (y: number) => ({
  start: new Date(y, 0, 1).getTime() + TZ_OFFSET_HRS * 3600000,
  end: new Date(y, 11, 31, 23, 59, 59, 999).getTime(),
});
