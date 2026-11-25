
import { Router } from "express";
import authRouter from "./auth.js";
import eventsRouter from "./events.js";
import interestsRouter from "./interests.js";
import usersRouter, { profilesRouter } from "./users.js";
import connectionsRouter from "./connections.js";

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

// Event discovery and event details.
router.use("/events", eventsRouter);

export default router;
