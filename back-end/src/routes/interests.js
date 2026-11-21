import { Router } from "express";
import { store } from "../data/store.js";
import { requireMockUser } from "../middleware/mockIdentity.js";
import { serializePublicUser } from "../shared/serializers.js";

const router = Router();

router.get("/interests", (_req, res) => {
  res.json(store.interests);
});

router.post("/users/:userId/interests", requireMockUser, (req, res) => {
  const { currentUser } = req;
  if (req.params.userId !== currentUser.id) {
    return res.status(403).json({
      error: { code: "FORBIDDEN", message: "You can only update your own interests." },
    });
  }

  const { interests } = req.body ?? {};
  if (!Array.isArray(interests) || !interests.every((interest) => store.interests.includes(interest))) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Interests must be an array of options from the interest catalog." },
    });
  }

  currentUser.interests = interests;
  return res.json(serializePublicUser(currentUser));
});

export default router;
