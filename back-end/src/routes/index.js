
import { Router } from "express";
import eventsRouter from "./events.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Event discovery and event details.
router.use("/events", eventsRouter);

export default router;
