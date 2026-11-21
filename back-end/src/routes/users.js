import { Router } from "express";
import { store } from "../data/store.js";
import { requireMockUser } from "../middleware/mockIdentity.js";
import { serializePublicUser } from "../shared/serializers.js";

const router = Router();

// The shared interest list agreed in #91. Two older spellings are accepted
// and saved in the canonical form. #94 owns the interests endpoints, so
// this list lives here only to check profile input.
const canonicalInterests = [
  "Coffee",
  "Running",
  "Art",
  "Movies",
  "Food",
  "Music",
  "Study",
  "Games",
  "Sports",
  "Hiking",
];
const interestAliases = { Arts: "Art", Gaming: "Games" };

function invalidInput(res, message) {
  return res.status(400).json({ error: { code: "VALIDATION_ERROR", message } });
}

function userNotFound(res) {
  return res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found." } });
}

function usernameTaken(res, username, ownId) {
  const taken = store.users.some((user) => user.id !== ownId && user.username === username);
  if (!taken) return false;
  res.status(409).json({
    error: { code: "DUPLICATE_USERNAME", message: "That username is already taken." },
  });
  return true;
}

function findUser(userId) {
  return store.users.find(({ id }) => id === userId);
}

// Checks an interests value from a request body. Returns the list in
// canonical form, or null when any entry is not on the shared list.
function cleanInterests(interests) {
  if (!Array.isArray(interests)) return null;
  const cleaned = [];
  for (const value of interests) {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    const interest = interestAliases[trimmed] ?? trimmed;
    if (!canonicalInterests.includes(interest)) return null;
    if (!cleaned.includes(interest)) cleaned.push(interest);
  }
  return cleaned;
}

// Reads the profile fields a request may set. Returns an object with the
// fields to save, or null after sending a 400 response. Setup requires a
// username, editing does not.
function readProfileFields(req, res, { usernameRequired }) {
  const { username, name, bio, location, imageUrl, interests } = req.body ?? {};
  const fields = {};

  if (username !== undefined || usernameRequired) {
    const cleaned = typeof username === "string" ? username.trim() : "";
    if (!cleaned) {
      invalidInput(res, "Please choose a username.");
      return null;
    }
    fields.username = cleaned;
  }
  if (name !== undefined) {
    const cleaned = typeof name === "string" ? name.trim() : "";
    if (!cleaned) {
      invalidInput(res, "Please enter your full name.");
      return null;
    }
    fields.name = cleaned;
  }
  if (bio !== undefined) {
    if (typeof bio !== "string") {
      invalidInput(res, "Profile fields must be text.");
      return null;
    }
    fields.bio = bio.trim();
  }
  if (location !== undefined) {
    if (typeof location !== "string") {
      invalidInput(res, "Profile fields must be text.");
      return null;
    }
    fields.location = location.trim();
  }
  if (imageUrl !== undefined) {
    if (typeof imageUrl !== "string") {
      invalidInput(res, "Profile fields must be text.");
      return null;
    }
    fields.imageUrl = imageUrl.trim();
  }
  if (interests !== undefined) {
    const cleaned = cleanInterests(interests);
    if (!cleaned) {
      invalidInput(res, "Please choose interests from the shared list.");
      return null;
    }
    fields.interests = cleaned;
  }
  return fields;
}

router.get("/me", requireMockUser, (req, res) => {
  res.set("Cache-Control", "no-store").json(serializePublicUser(req.currentUser));
});

// Finds the canonical form of one interest value, matching without
// worrying about capital letters and accepting the two older spellings
// from #91. Returns null when the value is not on the shared list.
function matchInterest(value) {
  const lowered = value.trim().toLowerCase();
  for (const interest of canonicalInterests) {
    if (interest.toLowerCase() === lowered) return interest;
  }
  for (const [alias, interest] of Object.entries(interestAliases)) {
    if (alias.toLowerCase() === lowered) return interest;
  }
  return null;
}

// Reads the interest filter from the query string. The filter may be
// given once, repeated, or separated by commas, and a person must have
// every selected interest to match. Returns the canonical list, or null
// when any value is not on the shared list.
function readInterestFilter(query) {
  if (query === undefined) return [];
  const values = Array.isArray(query) ? query : [query];
  const selected = [];
  for (const value of values) {
    if (typeof value !== "string") return null;
    for (const part of value.split(",")) {
      if (!part.trim()) continue;
      const interest = matchInterest(part);
      if (!interest) return null;
      if (!selected.includes(interest)) selected.push(interest);
    }
  }
  return selected;
}

// Discover people (#99), with search and interest filtering (#100). Only
// complete profiles can be discovered, and a signed in user never sees
// their own profile in the list. The search text matches part of a name
// or username without worrying about capital letters, and no match
// simply returns an empty list.
router.get("/", (req, res) => {
  const { search, interest } = req.query;
  if (search !== undefined && typeof search !== "string") {
    return invalidInput(res, "Search must be text.");
  }
  const selected = readInterestFilter(interest);
  if (!selected) {
    return invalidInput(res, "Please choose interests from the shared list.");
  }
  const text = typeof search === "string" ? search.trim().toLowerCase() : "";
  const currentUserId = req.get("Mock-User-Id");
  const people = store.users
    .filter((user) => user.profileComplete && user.id !== currentUserId)
    .filter(
      (user) =>
        !text ||
        user.name.toLowerCase().includes(text) ||
        (user.username ?? "").toLowerCase().includes(text),
    )
    .filter((user) => selected.every((name) => user.interests.includes(name)))
    .map(serializePublicUser);
  return res.json(people);
});

// Profile retrieval (#98), shared with person details (#99).
router.get("/:userId", (req, res) => {
  const user = findUser(req.params.userId);
  if (!user) return userNotFound(res);
  return res.json(serializePublicUser(user));
});

// Update a profile (#98). The acting user comes from the header, so a
// profile can only be updated by its owner.
router.patch("/:userId", requireMockUser, (req, res) => {
  const user = findUser(req.params.userId);
  if (!user) return userNotFound(res);
  if (user.id !== req.currentUser.id) {
    return res.status(403).json({
      error: { code: "FORBIDDEN", message: "You can only update your own profile." },
    });
  }
  const fields = readProfileFields(req, res, { usernameRequired: false });
  if (!fields) return undefined;
  if (fields.username && usernameTaken(res, fields.username, user.id)) return undefined;
  Object.assign(user, fields);
  return res.json(serializePublicUser(user));
});

// Profile setup (#98) updates the record registration created, so it is
// defined here with the other user routes and mounted at /api/profiles.
const profilesRouter = Router();

profilesRouter.post("/", requireMockUser, (req, res) => {
  const user = req.currentUser;
  const fields = readProfileFields(req, res, { usernameRequired: true });
  if (!fields) return undefined;
  if (fields.username && usernameTaken(res, fields.username, user.id)) return undefined;
  Object.assign(user, fields);
  user.profileComplete = true;
  return res.json(serializePublicUser(user));
});

export default router;
export { profilesRouter };
