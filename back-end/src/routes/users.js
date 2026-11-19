import { Router } from "express";
import { requireMockUser } from "../middleware/mockIdentity.js";
import { serializePublicUser } from "../shared/serializers.js";

const router = Router();

router.get("/me", requireMockUser, (req, res) => {
  res.set("Cache-Control", "no-store").json(serializePublicUser(req.currentUser));
});

export default router;
