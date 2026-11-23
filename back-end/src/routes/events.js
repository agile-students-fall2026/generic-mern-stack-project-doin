
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

export default router;
