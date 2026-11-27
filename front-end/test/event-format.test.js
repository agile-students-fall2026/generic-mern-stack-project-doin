import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatEventDate,
  formatEventTime,
  formatEventTimeRange,
  formatEventTimeZone,
} from "../src/eventFormat.js";

test("event dates preserve the stored day in different viewer time zones", () => {
  const previousZone = process.env.TZ;
  try {
    for (const zone of ["America/Los_Angeles", "Pacific/Kiritimati"]) {
      process.env.TZ = zone;
      assert.equal(formatEventDate("2026-11-28", { includeYear: false }), "Sat, Nov 28");
      assert.equal(formatEventDate("2024-02-29", { includeYear: true }), "Thu, Feb 29, 2024");
      assert.equal(formatEventDate("2026-01-01", { includeYear: false }), "Thu, Jan 1");
    }
  } finally {
    if (previousZone === undefined) delete process.env.TZ;
    else process.env.TZ = previousZone;
  }
});

test("future years are included automatically", () => {
  const nextYear = new Date().getFullYear() + 1;
  assert.match(formatEventDate(nextYear + "-01-02"), new RegExp(String(nextYear) + "$"));
});

test("impossible and missing dates produce no display value", () => {
  for (const input of ["2026-02-29", "2026-04-31", "2026-00-01", "2026-01-00", "2026-1-1", "", null, 123]) {
    assert.equal(formatEventDate(input), "");
  }
});

test("midnight, noon, and other wall-clock times format without zone conversion", () => {
  for (const [stored, expected] of [
    ["00:00", "12:00 AM"],
    ["00:30", "12:30 AM"],
    ["09:05", "9:05 AM"],
    ["12:00", "12:00 PM"],
    ["15:00", "3:00 PM"],
    ["23:59", "11:59 PM"],
  ]) {
    assert.equal(formatEventTime(stored), expected);
  }
  assert.equal(formatEventTimeRange("15:00", "17:00"), "3:00 PM – 5:00 PM");
  assert.equal(formatEventTimeRange("00:00", "12:00"), "12:00 AM – 12:00 PM");
});

test("invalid or incomplete time and zone values degrade safely", () => {
  for (const input of ["24:00", "08:60", "9:00", "", null, 1200]) {
    assert.equal(formatEventTime(input), "");
  }
  assert.equal(formatEventTimeRange("09:00"), "9:00 AM");
  assert.equal(formatEventTimeRange(undefined, "17:00"), "");
  assert.equal(formatEventTimeZone("America/New_York"), "ET");
  assert.equal(formatEventTimeZone("America/New_York", { long: true }), "Eastern Time");
  assert.equal(formatEventTimeZone("America/Los_Angeles"), "PT");
  assert.equal(formatEventTimeZone("Not/AZone"), "");
  assert.equal(formatEventTimeZone(null), "");
});
