import { createContext, useContext, useState } from "react";
import { useLocation, useNavigate } from "react-router";

export const ViewHistory = createContext(null);

export function useViewState(initial) {
  const { key } = useLocation();
  const views = useContext(ViewHistory);
  const [entry, setEntry] = useState(() => ({ key, values: views.get(key)?.view ?? initial }));
  if (entry.key !== key) setEntry({ key, values: views.get(key)?.view ?? initial });

  function update(patch) {
    const saved = views.get(key) ?? {};
    const values = { ...(saved.view ?? entry.values), ...patch };
    views.set(key, { ...saved, view: values });
    setEntry({ key, values });
  }

  return [entry.values, update];
}

export function useOrigin() {
  const { pathname, search } = useLocation();
  return { origin: pathname + search };
}

export function useReturnTo(destination, fromLinkedPage) {
  const navigate = useNavigate();
  const { state } = useLocation();
  return () => {
    if (fromLinkedPage ?? state?.origin === destination) navigate(-1);
    else navigate(destination, { replace: true });
  };
}

function eventList(search) {
  const tab = new URLSearchParams(search).get("from");
  return tab === "joined" || tab === "hosting" ? tab : "";
}

export function eventProfilePath(personId, eventId, search) {
  const params = new URLSearchParams({ event: eventId });
  const tab = eventList(search);
  if (tab) params.set("from", tab);
  return `/discover/${encodeURIComponent(personId)}?${params}`;
}

export function eventProfileOrigin(search) {
  const eventId = new URLSearchParams(search).get("event");
  if (!eventId || eventId === "." || eventId === "..") return "";
  const tab = eventList(search);
  return `/events/${encodeURIComponent(eventId)}${tab ? `?from=${tab}` : ""}`;
}
