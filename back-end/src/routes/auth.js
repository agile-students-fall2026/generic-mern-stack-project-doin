import { randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { Router } from "express";
import { store } from "../data/store.js";
import { serializePublicUser } from "../shared/serializers.js";
import { isValidEmail, isValidRegistrationPassword, normalizeEmail } from "../shared/validation.js";

const router = Router();
const derivePasswordHash = promisify(scrypt);
const hashLength = 64;

function findUserByEmail(email) {
  return store.users.find((user) => normalizeEmail(user.email) === email);
}

function invalidInput(res, message) {
  return res.status(400).json({ error: { code: "VALIDATION_ERROR", message } });
}

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body ?? {};
  const trimmedName = typeof name === "string" ? name.trim() : "";
  const normalizedEmail = normalizeEmail(email);

  if (trimmedName.length < 2) return invalidInput(res, "Please enter your full name.");
  if (!isValidEmail(normalizedEmail)) return invalidInput(res, "Please enter a valid email address.");
  if (!isValidRegistrationPassword(password)) {
    return invalidInput(
      res,
      "Password must have at least 8 characters, one uppercase letter, one number, and one special character.",
    );
  }

  const salt = randomBytes(16).toString("hex");
  const hash = await derivePasswordHash(password, salt, hashLength);

  // Check and insert together after hashing so concurrent requests cannot register the same email.
  if (findUserByEmail(normalizedEmail)) {
    return res.status(409).json({
      error: { code: "DUPLICATE_EMAIL", message: "An account already uses this email address." },
    });
  }

  const user = {
    id: randomUUID(),
    name: trimmedName,
    email: normalizedEmail,
    credentials: { salt, hash: hash.toString("hex") },
    username: null,
    bio: "",
    location: "",
    imageUrl: "",
    interests: [],
    profileComplete: false,
  };

  store.users.push(user);
  return res.status(201).json(serializePublicUser(user));
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail)) return invalidInput(res, "Please enter a valid email address.");
  if (typeof password !== "string" || password.length === 0) {
    return invalidInput(res, "Please enter your password.");
  }

  const user = findUserByEmail(normalizedEmail);
  const credentials = user?.credentials;
  // Do the same password work for unknown emails and profiles without credentials.
  const hash = await derivePasswordHash(password, credentials?.salt ?? "doin-mock-login", hashLength);
  const storedHash = credentials ? Buffer.from(credentials.hash, "hex") : Buffer.alloc(hashLength);
  if (!timingSafeEqual(hash, storedHash) || !credentials) {
    return res.status(401).json({
      error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." },
    });
  }

  return res.json(serializePublicUser(user));
});

export default router;
