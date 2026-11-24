
import { randomUUID } from "node:crypto";
import { Router } from "express";
import { store } from "../data/store.js";
import { requireMockUser } from "../middleware/mockIdentity.js";
import { serializePublicUser } from "../shared/serializers.js";

const router = Router();

// Return errors using the shared API format.
function sendError(res, status, code, message) {
  return res.status(status).json({
    error: { code, message }
  });
}

// Find a user from the shared in-memory store.
function findUser(userId) {
  return store.users.find((user) => user.id === userId);
}

// Check whether two users have a request in either direction.
function isBetween(request, userA, userB) {
  return (
    (request.senderId === userA && request.recipientId === userB) ||
    (request.senderId === userB && request.recipientId === userA)
  );
}

// POST /api/connections/requests
// Send a connection request.
router.post("/connections/requests", requireMockUser, (req, res) => {
  const senderId = req.currentUser.id;
  const recipientId = req.body?.recipientId;

  if (typeof recipientId !== "string" || !recipientId.trim()) {
    return sendError(res, 400, "VALIDATION_ERROR", "A valid recipientId is required.");
  }

  if (!findUser(recipientId)) {
    return sendError(res, 404, "NOT_FOUND", "Recipient not found.");
  }

  if (senderId === recipientId) {
    return sendError(res, 400, "VALIDATION_ERROR", "You cannot connect with yourself.");
  }

  const existingRequests = store.connectionRequests.filter(
    (request) => isBetween(request, senderId, recipientId)
  );

  if (existingRequests.some((request) => request.status === "accepted")) {
    return sendError(res, 409, "ALREADY_CONNECTED", "You are already connected.");
  }

  if (existingRequests.some((request) => request.status === "pending")) {
    return sendError(res, 409, "REQUEST_ALREADY_PENDING", "A connection request is already pending.");
  }

  const connectionRequest = {
    id: randomUUID(),
    senderId,
    recipientId,
    status: "pending"
  };

  store.connectionRequests.push(connectionRequest);

  return res.status(201).json(connectionRequest);
});

// GET /api/users/:userId/connection-requests
// Retrieve incoming and outgoing pending requests.
router.get("/users/:userId/connection-requests", requireMockUser, (req, res) => {
  const { userId } = req.params;

  if (!findUser(userId)) {
    return sendError(res, 404, "NOT_FOUND", "User not found.");
  }

  if (req.currentUser.id !== userId) {
    return sendError(res, 403, "FORBIDDEN", "You can only view your own requests.");
  }

  const requests = store.connectionRequests.filter((request) => {
    return (
      request.status === "pending" &&
      (request.senderId === userId || request.recipientId === userId)
    );
  });

  return res.status(200).json(requests);
});

// PATCH /api/connections/requests/:requestId
// Accept, decline, or cancel a pending request.
router.patch("/connections/requests/:requestId", requireMockUser, (req, res) => {
  const { requestId } = req.params;
  const { status } = req.body ?? {};

  if (!["accepted", "declined", "cancelled"].includes(status)) {
    return sendError(res, 400, "VALIDATION_ERROR", "Invalid request status.");
  }

  const connectionRequest = store.connectionRequests.find(
    (request) => request.id === requestId
  );

  if (!connectionRequest) {
    return sendError(res, 404, "NOT_FOUND", "Connection request not found.");
  }

  if (connectionRequest.status !== "pending") {
    return sendError(res, 409, "INVALID_TRANSITION", "This request is no longer pending.");
  }

  const currentUserId = req.currentUser.id;

  if (status === "cancelled") {
    if (currentUserId !== connectionRequest.senderId) {
      return sendError(res, 403, "FORBIDDEN", "Only the sender can cancel this request.");
    }
  } else {
    if (currentUserId !== connectionRequest.recipientId) {
      return sendError(res, 403, "FORBIDDEN", "Only the recipient can accept or decline.");
    }
  }

  connectionRequest.status = status;

  return res.status(200).json(connectionRequest);
});

// GET /api/users/:userId/connections
// Retrieve the user's accepted connections.
router.get("/users/:userId/connections", requireMockUser, (req, res) => {
  const { userId } = req.params;

  if (!findUser(userId)) {
    return sendError(res, 404, "NOT_FOUND", "User not found.");
  }

  if (req.currentUser.id !== userId) {
    return sendError(res, 403, "FORBIDDEN", "You can only view your own connections.");
  }

  const connectedIds = new Set();

  for (const request of store.connectionRequests) {
    if (request.status !== "accepted") continue;

    if (request.senderId === userId) {
      connectedIds.add(request.recipientId);
    } else if (request.recipientId === userId) {
      connectedIds.add(request.senderId);
    }
  }

  const connections = store.users
    .filter((user) => connectedIds.has(user.id))
    .map(serializePublicUser);

  return res.status(200).json(connections);
});

export default router;
