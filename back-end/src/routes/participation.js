
import { Router } from "express";
import { store } from "../data/store.js";
import { requireMockUser } from "../middleware/mockIdentity.js";

const router = Router();

// RSVP, Leave Event, and My Events routes will go here.
router.post("/events/:eventId/rsvp", requireMockUser, (req, res) => {
  const { eventId } = req.params;
  const userId = req.currentUser.id;

  // Find the event in our shared store
  const event = store.events.find((e) => e.id === eventId);

  if (!event) {
    return res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Event not found."
      }
    });
  }

  // Check whether the event is active
  if (event.status !== "active") {
    return res.status(409).json({
      error: {
        code: "EVENT_UNAVAILABLE",
        message: "This event is not available for registration."
      }
    });
  }

  // Prevent duplicate RSVPs
  if (event.attendeeIds.includes(userId)) {
    return res.status(409).json({
      error: {
        code: "ALREADY_REGISTERED",
        message: "You have already joined this event."
      }
    });
  }

  // Check event capacity
  if (event.attendeeIds.length >= event.capacity) {
    return res.status(409).json({
      error: {
        code: "EVENT_FULL",
        message: "This event is full."
      }
    });
  }

  // Add the user to the attendee list
  event.attendeeIds.push(userId);

  return res.status(200).json(event);
});


router.delete("/events/:eventId/rsvp", requireMockUser, (req, res) => {
  const { eventId } = req.params;
  const userId = req.currentUser.id;

  // Find the event
  const event = store.events.find((e) => e.id === eventId);

  if (!event) {
    return res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Event not found."
      }
    });
  }

  // Check if the user joined the event
  if (!event.attendeeIds.includes(userId)) {
    return res.status(409).json({
      error: {
        code: "NOT_REGISTERED",
        message: "You have not joined this event."
      }
    });
  }

  // Remove the user from the attendee list
  event.attendeeIds = event.attendeeIds.filter(
    (id) => id !== userId
  );

  return res.status(200).json(event);
});


router.get("/users/:userId/events", requireMockUser, (req, res) => {
  const { userId } = req.params;
  const { type } = req.query;

  // Check if the user exists
  const user = store.users.find((u) => u.id === userId);

  if (!user) {
    return res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "User not found."
      }
    });
  }

  // Users can only view their own My Events
  if (req.currentUser.id !== userId) {
    return res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "You can only view your own events."
      }
    });
  }

  // Validate the event filter
  if (type && type !== "joined" && type !== "hosting") {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid event filter."
      }
    });
  }

  // Find events the user joined or is hosting
  const events = store.events.filter((event) => {
    const joined = event.attendeeIds.includes(userId);
    const hosting = event.organizerId === userId;

    if (type === "joined") return joined;
    if (type === "hosting") return hosting;

    return joined || hosting;
  });

  return res.status(200).json(events);
});



export default router;
