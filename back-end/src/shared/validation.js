import { store } from "../data/store.js";

export function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidRegistrationPassword(password) {
  return typeof password === "string"
    && password.length >= 8
    && /[A-Z]/.test(password)
    && /[0-9]/.test(password)
    && /[^A-Za-z0-9]/.test(password);
}

const interestAliases = new Map([
  ["arts", "art"],
  ["gaming", "games"],
]);

export function normalizeInterests(interests) {
  if (!Array.isArray(interests)) return null;

  const catalog = new Map(store.interests.map((name) => [name.toLowerCase(), name]));
  const normalized = new Set();
  for (const value of interests) {
    if (typeof value !== "string") return null;

    const key = value.trim().toLowerCase();
    const interest = catalog.get(interestAliases.get(key) ?? key);
    if (!interest) return null;
    normalized.add(interest);
  }

  return [...normalized];
}
