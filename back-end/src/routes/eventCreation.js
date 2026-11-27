
import { Router } from "express";
import { randomUUID } from "node:crypto";
import { store } from "../data/store.js";
import { requireMockUser } from "../middleware/mockIdentity.js";

import { normalizeEventImage } from "../shared/eventFields.js";
import { normalizeTimeZone } from "../shared/timeZones.js";

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
    title,
    description,
    date,
    startTime,
    endTime,
    location,
    category,
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

  const timeZone = normalizeTimeZone(timezone);
  if (!timeZone) return sendError(res, "Invalid timezone.");

  const aliases = {
    gaming: "Games",
    arts: "Art",
  };

  const categoryInput = category.trim().toLowerCase();

  const categories = store.categories;

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
    return sendError(
      res,
      "Capacity must be a positive integer."
    );
  }

  const image = normalizeEventImage(imageUrl);
  if (image === null) return sendError(res, "Invalid image URL.");

  const newEvent = {
    id: `event-${randomUUID()}`,
    title: title.trim(),
    description: description.trim(),
    date,
    startTime,
    endTime,
    timezone: timeZone,
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
