const dateStyle = { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" };
const shortDate = new Intl.DateTimeFormat("en-US", dateStyle);
const fullDate = new Intl.DateTimeFormat("en-US", { ...dateStyle, year: "numeric" });

export function formatEventDate(value, { includeYear } = {}) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";

  // Interpret the stored date as calendar fields, independent of the viewer's zone.
  const [year, month, day] = value.split("-").map(Number);
  const calendarDate = new Date(0);
  calendarDate.setUTCFullYear(year, month - 1, day);
  if (calendarDate.toISOString().slice(0, 10) !== value) return "";

  const showYear = includeYear ?? (year !== new Date().getFullYear());
  return (showYear ? fullDate : shortDate).format(calendarDate);
}

export function formatEventTime(value) {
  if (typeof value !== "string") return "";
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return "";

  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour < 12 ? "AM" : "PM"}`;
}

export function formatEventTimeRange(startTime, endTime) {
  const start = formatEventTime(startTime);
  const end = formatEventTime(endTime);
  return start && end ? `${start} – ${end}` : start;
}

export function formatEventTimeZone(timeZone, { long = false } = {}) {
  if (typeof timeZone !== "string" || !timeZone) return "";
  try {
    // A generic label such as ET describes the event's zone without offset conversion.
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone, timeZoneName: long ? "longGeneric" : "shortGeneric",
    });
    return formatter.formatToParts().find((part) => part.type === "timeZoneName")?.value ?? "";
  } catch (error) {
    if (error instanceof RangeError) return "";
    throw error;
  }
}
