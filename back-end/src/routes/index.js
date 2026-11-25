import { Router } from "express";
import authRouter from "./auth.js";
import connectionsRouter from "./connections.js";
import eventCreationRouter from "./eventCreation.js";
import eventsRouter from "./events.js";
import interestsRouter from "./interests.js";
import participationRouter from "./participation.js";
import usersRouter, { profilesRouter } from "./users.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Mount feature routers here as their tasks are implemented (paths omit /api).
router.use("/auth", authRouter);
router.use(interestsRouter);
router.use("/users", usersRouter);
router.use("/profiles", profilesRouter);
router.use(connectionsRouter);

// Event discovery and event details (#104).
router.use("/events", eventsRouter);

// Event creation (#105).
router.use(eventCreationRouter);

// RSVP, leave event, and My Events (#110).
router.use(participationRouter);

export default router;