
import { Router } from "express";
import { store } from "../data/store.js";
import { requireMockUser } from "../middleware/mockIdentity.js";

import { guestIds, normalizeEventImage, serializeEvent } from "../shared/eventFields.js";
import { normalizeTimeZone } from "../shared/timeZones.js";

const router = Router();

function sendError(res, status, code, message) {
  return res.status(status).json({
    error: { code, message },
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

function findEvent(req, res) {
  const event = store.events.find(
    (item) => item.id === req.params.eventId
  );

  if (!event) {
    sendError(res, 404, "NOT_FOUND", "Event not found.");
    return null;
  }

  if (event.organizerId !== req.currentUser.id) {
    sendError(
      res,
      403,
      "FORBIDDEN",
      "Only the event organizer can make changes."
    );
    return null;
  }

  return event;
}

// PATCH /api/events/:eventId
router.patch("/events/:eventId", requireMockUser, (req, res) => {
  const event = findEvent(req, res);
  if (!event) return;

  if (event.status !== "active") {
    return sendError(
      res,
      409,
      "EVENT_UNAVAILABLE",
      "Cancelled events cannot be edited."
    );
  }

  const changes = req.body;

  if (
    !changes ||
    typeof changes !== "object" ||
    Array.isArray(changes) ||
    Object.keys(changes).length === 0
  ) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Provide at least one event field to update."
    );
  }

  const allowedFields = [
    "title",
    "description",
    "date",
    "startTime",
    "endTime",
    "timezone",
    "location",
    "category",
    "capacity",
    "imageUrl",
  ];

  for (const field of Object.keys(changes)) {
    if (!allowedFields.includes(field)) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        `Cannot update ${field}.`
      );
    }

    if (field !== "capacity" && field !== "imageUrl" && (
      typeof changes[field] !== "string" ||
      !changes[field].trim()
    )) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        `Valid ${field} is required.`
      );
    }
  }

  const updated = { ...event };

  for (const [field, value] of Object.entries(changes)) {
    updated[field] = typeof value === "string" ? value.trim() : value;
  }

  if (!validDate(updated.date)) {
    return sendError(
      res, 400, "VALIDATION_ERROR", "Invalid event date."
    );
  }

  if (
    !validTime(updated.startTime) ||
    !validTime(updated.endTime) ||
    updated.endTime <= updated.startTime
  ) {
    return sendError(
      res, 400, "VALIDATION_ERROR", "Invalid event time."
    );
  }

  const timeZone = normalizeTimeZone(updated.timezone);
  if (!timeZone) {
    return sendError(
      res, 400, "VALIDATION_ERROR", "Invalid timezone."
    );
  }

  if ("capacity" in changes) {
    if (!Number.isInteger(updated.capacity) || updated.capacity < 1) {
      return sendError(res, 400, "VALIDATION_ERROR", "Capacity must be a positive integer.");
    }
    if (updated.capacity < guestIds(event).length) {
      return sendError(res, 409, "CAPACITY_BELOW_GUEST_COUNT", "Capacity cannot be below the current guest count.");
    }
  }

  if ("imageUrl" in changes) {
    updated.imageUrl = normalizeEventImage(changes.imageUrl);
    if (updated.imageUrl === null) return sendError(res, 400, "VALIDATION_ERROR", "Invalid image URL.");
  }

  const aliases = {
    gaming: "Games",
    arts: "Art",
  };

  const input = updated.category.toLowerCase();

  const normalizedCategory =
    aliases[input] ??
    store.categories.find(
      (category) => category.toLowerCase() === input
    );

  if (!normalizedCategory ||
      !store.categories.includes(normalizedCategory)) {
    return sendError(
      res, 400, "VALIDATION_ERROR", "Invalid event category."
    );
  }

  updated.category = normalizedCategory;
  if ("timezone" in changes) updated.timezone = timeZone;

  // Update the shared event object only after all validation passes.
  Object.assign(event, updated);

  return res.status(200).json(serializeEvent(event));
});

// DELETE /api/events/:eventId
router.delete("/events/:eventId", requireMockUser, (req, res) => {
  const event = findEvent(req, res);
  if (!event) return;

  if (event.status !== "active") {
    return sendError(
      res,
      409,
      "EVENT_UNAVAILABLE",
      "This event is already cancelled."
    );
  }

  // Keep the event record, but remove it from active listings.
  event.status = "cancelled";

  return res.status(200).json(serializeEvent(event));
});

export default router;
