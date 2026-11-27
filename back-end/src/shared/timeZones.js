import catalog from "../data/time-zones.json" with { type: "json" };

// Generated from IANA tzdb tzdata.zi, zone.tab and zone1970.tab.
export const timeZoneCatalog = catalog;
const primaryNames = new Map(Object.keys(catalog.zones).map((id) => [id.toLowerCase(), id]));
const aliases = new Map(Object.entries(catalog.aliases).map(([name, id]) => [name.toLowerCase(), id]));

export function normalizeTimeZone(input) {
  if (typeof input !== "string") return null;
  const name = input.trim().toLowerCase();
  const primary = primaryNames.get(name) ?? aliases.get(name);
  if (!primary) return null;
  try {
    new Intl.DateTimeFormat("en", { timeZone: primary });
    return primary;
  } catch {
    return null;
  }
}
