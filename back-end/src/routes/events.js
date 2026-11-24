
import { Router } from "express";
import { store } from "../data/store.js";

const router = Router();

// Get all active events with optional search and category filtering.
router.get("/", (req, res) => {
  let events = store.events.filter((event) => event.status === "active");

  const search = req.query.search;
  const category = req.query.category;

  // Search events by title.
  if (search) {
    events = events.filter((event) =>
      event.title.toLowerCase().includes(search.toLowerCase()),
    );
  }

  // Filter events by category.
  if (category) {
    events = events.filter(
      (event) => event.category.toLowerCase() === category.toLowerCase(),
    );
  }

  res.json(events);
});

// Get details of one event using its ID.

router.get("/categories", (_req, res) => {
  res.json(store.categories);
});
router.get("/:eventId", (req, res) => {
  const event = store.events.find(
    (item) => item.id === req.params.eventId,
  );

  if (!event) {
    return res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Event not found.",
      },
    });
  }

  res.json(event);
});

 // Create a new event.
router.post("/", (req, res) => {
  const {
    title,
    description,
    date,
    startTime,
    endTime,
    timezone,
    location,
    category,
    organizerId,
    capacity,
  } = req.body ?? {};

  // Check required text fields.
  const required = [
    title,
    description,
    date,
    startTime,
    endTime,
    location,
    category,
    organizerId,
  ];

  if (required.some((value) => typeof value !== "string" || !value.trim())) {
    return res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "All required event fields must be provided.",
      },
    });
  }

  // Validate date and time format.
  const validDate =
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(`${date}T00:00:00Z`));

  const validTime = (time) =>
    /^([01]\d|2[0-3]):[0-5]\d$/.test(time);

  if (!validDate || !validTime(startTime) ||
      !validTime(endTime) || endTime <= startTime) {
    return res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "Invalid event date or time.",
      },
    });
  }

  // Validate category.
  if (!store.categories.includes(category)) {
    return res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "Invalid event category.",
      },
    });
  }

  // Validate organizer.
  const organizer = store.users.find(
    (user) => user.id === organizerId,
  );

  if (!organizer) {
    return res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "Organizer not found.",
      },
    });
  }

  // Validate capacity.
  const eventCapacity = capacity ?? 20;

  if (!Number.isInteger(eventCapacity) || eventCapacity < 1) {
    return res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "Capacity must be a positive integer.",
      },
    });
  }

  // Create event using the shared data structure.
  const newEvent = {
    id: `event-${crypto.randomUUID()}`,
    title: title.trim(),
    description: description.trim(),
    date,
    startTime,
    endTime,
    timezone: timezone || "America/New_York",
    location: location.trim(),
    category,
    imageUrl: "/static/images/event-default.svg",
    organizerId,
    attendeeIds: [],
    capacity: eventCapacity,
    status: "active",
  };

  // Save event in shared in-memory storage.
  store.events.push(newEvent);

  return res.status(201).json(newEvent);
});

export default router;
