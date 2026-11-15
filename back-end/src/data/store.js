import { seeds } from "./seeds.js";

export const store = structuredClone(seeds);

export function resetStore() {
  // Preserve the store object imported by routers, but replace its collections.
  // Read store.users/store.events inside handlers rather than caching an array.
  Object.assign(store, structuredClone(seeds));
  return store;
}
