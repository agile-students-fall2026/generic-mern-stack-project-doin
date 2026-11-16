import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import apiRouter from "./routes/index.js";

const defaultPublicDirectory = fileURLToPath(new URL("../public/", import.meta.url));
const defaultClientDirectory = fileURLToPath(new URL("../../front-end/dist/", import.meta.url));

// Optional paths let tests use isolated static files without changing the real build.
export function createApp({
  publicDirectory = defaultPublicDirectory,
  clientDirectory = defaultClientDirectory,
} = {}) {
  const app = express();

  if (process.env.NODE_ENV !== "production") {
    app.use(cors({
      origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
      allowedHeaders: ["Content-Type", "Mock-User-Id"],
    }));
  }
  app.use(express.json());

  app.use("/api", apiRouter);
  app.use("/api", notFound);

  app.use("/static", express.static(publicDirectory));
  app.use("/static", notFound);

  const clientIndex = path.join(clientDirectory, "index.html");
  if (existsSync(clientIndex)) {
    app.use(express.static(clientDirectory));
    // React Router handles page navigation; missing assets still return a 404.
    app.get("/{*path}", (req, res, next) => {
      if (path.extname(req.path) || !req.accepts("html")) return next();
      res.sendFile(clientIndex);
    });
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

export default createApp();
