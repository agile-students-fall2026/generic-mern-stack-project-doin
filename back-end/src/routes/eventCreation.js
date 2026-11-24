
import { Router } from "express";
import { randomUUID } from "node:crypto";
import { store } from "../data/store.js";
import { requireMockUser } from "../middleware/mockIdentity.js";

const router = Router();

function sendError(res, message) {
  return res.status(400).json({
    error: {
      code: "VALIDATION_ERROR",
      message,
    },
  });
}

function validDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

  const parsed = new Date(`${date}T00:00:00Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

function validTime(time) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

function validTimezone(timezone) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

// Temporary fallback while #104's category seeds are unmerged.
const eventCategories = [
  "Art", "Food", "Games", "Music", "Social", "Sports",
];

router.post("/events", requireMockUser, (req, res) => {
  const {
    title,
    description,
    date,
    startTime,
    endTime,
    timezone = "America/New_York",
    location,
    category,
    capacity = 20,
    imageUrl = "/static/images/event-default.svg",
  } = req.body ?? {};

  const required = {
    title, description, date, startTime, endTime,
    location, category,
  };

  for (const [field, value] of Object.entries(required)) {
    if (typeof value !== "string" || !value.trim()) {
      return sendError(res, `Valid ${field} is required.`);
    }
  }

  if (!validDate(date)) {
    return sendError(res, "Invalid event date.");
  }

  if (
    !validTime(startTime) ||
    !validTime(endTime) ||
    endTime <= startTime
  ) {
    return sendError(res, "Invalid event time.");
  }

  if (
    typeof timezone !== "string" ||
    !validTimezone(timezone)
  ) {
    return sendError(res, "Invalid timezone.");
  }

  const aliases = { gaming: "Games", arts: "Art" };

  const categoryInput = category.trim().toLowerCase();
  const categories = store.categories.length
    ? store.categories
    : eventCategories;

  const normalizedCategory =
    aliases[categoryInput] ??
    categories.find(
      (item) => item.toLowerCase() === categoryInput
    );

  if (
    !normalizedCategory ||
    !categories.includes(normalizedCategory)
  ) {
    return sendError(res, "Invalid event category.");
  }

  if (!Number.isInteger(capacity) || capacity < 1) {
    return sendError(res, "Capacity must be a positive integer.");
  }

  if (typeof imageUrl !== "string" || !imageUrl.trim()) {
    return sendError(res, "Invalid image URL.");
  }

  const image = imageUrl.trim();

  const validLocalImage =
    /^\/static\/images\/[a-zA-Z0-9_.-]+$/.test(image) &&
    !image.includes("..");

  let validWebImage = false;

  try {
    const parsed = new URL(image);
    validWebImage = ["http:", "https:"].includes(parsed.protocol);
  } catch {
    // Not an absolute URL.
  }

  if (!validLocalImage && !validWebImage) {
    return sendError(res, "Invalid image URL.");
  }

  const newEvent = {
    id: `event-${randomUUID()}`,
    title: title.trim(),
    description: description.trim(),
    date,
    startTime,
    endTime,
    timezone: timezone.trim(),
    location: location.trim(),
    category: normalizedCategory,
    imageUrl: image,
    organizerId: req.currentUser.id,
    attendeeIds: [],
    capacity,
    status: "active",
  };

  store.events.push(newEvent);

  return res.status(201).json(newEvent);
});

export default router;

