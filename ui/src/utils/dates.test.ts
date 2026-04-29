import { describe, expect, it } from "vitest";

import { normalizeDate } from "./dates";

describe("normalizeDate", () => {
  describe("valid inputs", () => {
    // 4-digit year + MMDD (8 digits)
    it("parses 8-digit YYYYMMDD", () => {
      expect(normalizeDate("20250312")).toBe("2025-03-12");
    });

    it("parses 8-digit with existing dashes (YYYY-MM-DD)", () => {
      expect(normalizeDate("2025-03-12")).toBe("2025-03-12");
    });

    it("parses 8-digit with misplaced dash (YYYY-MMDD)", () => {
      expect(normalizeDate("2025-0312")).toBe("2025-03-12");
    });

    it("parses with spaces instead of dashes", () => {
      expect(normalizeDate("2025 03 12")).toBe("2025-03-12");
    });

    // 2-digit year
    it("parses 6-digit YYMMDD (year <= 69 maps to 2000s)", () => {
      expect(normalizeDate("250312")).toBe("2025-03-12");
    });

    it("parses 6-digit YYMMDD (year 70 maps to 1970)", () => {
      expect(normalizeDate("700312")).toBe("1970-03-12");
    });

    it("parses 6-digit YYMMDD (year 69 maps to 2069)", () => {
      expect(normalizeDate("690312")).toBe("2069-03-12");
    });

    it("parses 2-digit year with dashes (YY-MMDD)", () => {
      expect(normalizeDate("25-0312")).toBe("2025-03-12");
    });

    // Year boundary values
    it("accepts minimum year 1970", () => {
      expect(normalizeDate("19700101")).toBe("1970-01-01");
    });

    it("accepts maximum year 2069", () => {
      expect(normalizeDate("20691231")).toBe("2069-12-31");
    });

    // Remaining string length = 3 (single-digit month unambiguous)
    it("parses 5-digit YYMMD where 2-char month parse is invalid", () => {
      // "25312" → year=2025, remaining="312" → mA=31 invalid, mB=3 dB=12 → 2025-03-12
      expect(normalizeDate("25312")).toBe("2025-03-12");
    });

    // Remaining string length = 2
    it("parses 4-digit where remaining is ambiguous-free 2-char (non-valid-month prefix)", () => {
      // "2532" → y4=2532 out of range; y2=25 year=2025, remaining="32" → mA=32 invalid, mB=3 dB=2 → 2025-03-02
      expect(normalizeDate("2532")).toBe("2025-03-02");
    });

    it("parses 4-digit YYMM+D where first digit is a valid single-digit month", () => {
      // "2531" → y2=25, year=2025, remaining="31" → mA=31 invalid, mB=3 dB=1 → 2025-03-01
      expect(normalizeDate("2531")).toBe("2025-03-01");
    });
  });

  describe("invalid / null cases", () => {
    it("returns null for empty string", () => {
      expect(normalizeDate("")).toBeNull();
    });

    it("returns null for non-digit string", () => {
      expect(normalizeDate("abcd")).toBeNull();
    });

    it("returns null for string shorter than 4 digits", () => {
      expect(normalizeDate("202")).toBeNull();
    });

    it("returns null for year-only input (no month/day)", () => {
      expect(normalizeDate("2025")).toBeNull();
    });

    it("returns null for year-only input with trailing dash", () => {
      expect(normalizeDate("2025-")).toBeNull();
    });

    it("returns null for month 13 (invalid month)", () => {
      expect(normalizeDate("20251301")).toBeNull();
    });

    it("returns null for day 32 (invalid day)", () => {
      expect(normalizeDate("20250132")).toBeNull();
    });

    it("returns null for Feb 30 (invalid calendar date)", () => {
      expect(normalizeDate("20250230")).toBeNull();
    });

    it("returns null for year below 1970", () => {
      // y4=1969 out of range; y2=19 → 2019, remaining="690101" length 6 > 4 → null
      expect(normalizeDate("19690101")).toBeNull();
    });

    it("returns null for year above 2069", () => {
      // y4=2070 > YEAR_MAX; y2=20 → 2020, remaining="700101" length 6 > 4 → null
      expect(normalizeDate("20700101")).toBeNull();
    });

    it("returns null for too many digits after year", () => {
      expect(normalizeDate("202501234")).toBeNull();
    });

    it("returns null for ambiguous month/day (3 remaining digits, both 1-and 2-digit month parse valid)", () => {
      // "2025112" → remaining="112"; mA=11 dA=2 valid; mB=1 dB=12 valid; different → ambiguous
      expect(normalizeDate("2025112")).toBeNull();
    });

    it("returns null for 2-char remaining that forms a valid month (in-progress input)", () => {
      // "202512" → remaining="12"; mA=12 valid month → treated as in-progress, return null
      expect(normalizeDate("202512")).toBeNull();
    });
  });
});
