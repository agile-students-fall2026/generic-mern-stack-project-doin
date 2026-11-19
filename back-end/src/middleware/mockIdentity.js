import { store } from "../data/store.js";

export function requireMockUser(req, res, next) {
  const userId = req.get("Mock-User-Id");
  const user = userId && store.users.find(({ id }) => id === userId);

  if (!user) {
    return res.status(401).json({
      error: { code: "INVALID_MOCK_IDENTITY", message: "A valid Mock-User-Id header is required." },
    });
  }

  req.currentUser = user;
  return next();
}
