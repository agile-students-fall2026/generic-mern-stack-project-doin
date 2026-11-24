import { Router } from "express";
import authRouter from "./auth.js";
import interestsRouter from "./interests.js";
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

export default router;
