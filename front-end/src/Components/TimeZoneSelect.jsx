import { useEffect, useId, useMemo, useRef, useState } from "react";
import { formatEventTimeZone } from "../eventFormat";

const regions = new Intl.DisplayNames(["en"], { type: "region" });
const simpleText = (value) => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const country = (code) => code === "TR" ? "Türkiye (Turkey)" : regions.of(code);

function describeZones(catalog) {
  const alternate = {};
  for (const [alias, id] of Object.entries(catalog?.aliases ?? {})) {
    (alternate[id] ??= []).push(alias);
  }
  return Object.entries(catalog?.zones ?? {}).map(([id, codes]) => {
    const city = id.split("/").at(-1).replaceAll("_", " ");
    const names = codes.map(country);
    const zone = formatEventTimeZone(id, { long: true });
    const shortZone = formatEventTimeZone(id);
    const label = [city, names[0]].filter(Boolean).join(", ");
    const search = simpleText([id, city, ...names, zone, shortZone, ...(alternate[id] ?? [])].join(" "));
    return { id, label, zone, search };
  }).sort((a, b) => a.label.localeCompare(b.label, "en"));
}

export default function TimeZoneSelect({ id, catalog, value, onChange, ...attributes }) {
  const listId = useId();
  const list = useRef(null);
  const options = useMemo(() => describeZones(catalog), [catalog]);
  const selected = options.find((option) => option.id === value);
  const label = selected?.label ?? value;
  const [query, setQuery] = useState(null);
  const [active, setActive] = useState(-1);
  const open = query !== null && Boolean(catalog);
  const terms = simpleText(query?.trim() ?? "").split(/\s+/);
  const matches = options.filter((option) => terms.every((term) => option.search.includes(term)));
  const activeOption = matches[active];

  useEffect(() => {
    list.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [activeOption]);

  function close() {
    setQuery(null);
    setActive(-1);
  }

  function select(option) {
    onChange(option.id);
    close();
  }

  function onKeyDown(event) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Escape" && open) {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) setQuery("");
      if (!matches.length) return;
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setActive(active < 0 ? (delta > 0 ? 0 : matches.length - 1)
        : Math.max(0, Math.min(matches.length - 1, active + delta)));
    } else if (event.key === "Enter" && open) {
      event.preventDefault();
      if (activeOption) select(activeOption);
    }
  }

  return (
    <div className="timezone-picker">
      <input
        className="doin-input"
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && activeOption ? `${listId}-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder={label || "Search city, country, or time zone"}
        value={open ? query : label ?? ""}
        disabled={!catalog}
        onFocus={(event) => event.currentTarget.select()}
        onClick={() => { if (!open) setQuery(""); }}
        onChange={(event) => { setQuery(event.target.value); setActive(-1); }}
        onBlur={close}
        onKeyDown={onKeyDown}
        {...attributes}
      />
      <input type="hidden" name="timezone" value={value} />
      <div className="timezone-popup" hidden={!open}>
        <ul id={listId} ref={list} role="listbox" aria-label="Time zones">
          {open && matches.map((option, index) => (
            <li
              id={`${listId}-${index}`}
              role="option"
              key={option.id}
              aria-selected={option.id === value}
              data-active={index === active}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(option)}
            >
              <span>{option.label}</span>
              {option.zone && option.zone !== option.label && <small>{option.zone}</small>}
            </li>
          ))}
        </ul>
        {open && matches.length === 0 && <p role="status">No matching time zones. Try a city or country.</p>}
      </div>
    </div>
  );
}
