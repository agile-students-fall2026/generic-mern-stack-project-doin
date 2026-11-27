import { useEffect, useRef, useState } from "react";
import {
  getConnections,
  getConnectionRequests,
  sendConnectionRequest,
  updateConnectionRequest,
} from "./api";
import useApiData from "./useApiData";

async function loadRelationships(userId, signal) {
  const [connectedUsers, requests] = await Promise.all([
    getConnections(userId, signal),
    getConnectionRequests(userId, signal),
  ]);

  return {
    connectedUsers,
    incomingRequests: requests.filter((request) => request.recipientId === userId),
    outgoingRequests: requests.filter((request) => request.senderId === userId),
  };
}

export default function useRelationships(userId, refreshKey, routeKey) {
  const { data, error, loading, refreshing, invalidated, invalidate } = useApiData(
    userId,
    loadRelationships,
    refreshKey,
  );
  const [pendingAction, setPendingAction] = useState(null);
  const [actionError, setActionError] = useState(null);
  const activeRequest = useRef(null);
  const busy = Boolean(pendingAction || invalidated);

  useEffect(() => () => activeRequest.current?.abort(), []);

  async function change(action, send) {
    if (!userId || !data || busy || activeRequest.current) return false;

    const controller = new AbortController();
    activeRequest.current = controller;
    setPendingAction(action);
    setActionError(null);
    try {
      await send(controller.signal);
      if (controller.signal.aborted) return false;
      invalidate();
      return true;
    } catch (error) {
      if (!controller.signal.aborted) {
        setActionError({ userId, routeKey, message: error.message });
        if (error.status === 404 || error.status === 409) invalidate();
      }
      return false;
    } finally {
      activeRequest.current = null;
      if (!controller.signal.aborted) setPendingAction(null);
    }
  }

  return {
    data,
    error,
    loading,
    refreshing,
    busy,
    pendingAction,
    actionError: actionError && actionError.userId === userId && actionError.routeKey === routeKey
      ? actionError.message
      : "",
    send: (personId) => change({ id: personId, type: "send" }, (signal) => sendConnectionRequest(personId, signal)),
    respond: (requestId, status) => change({ id: requestId, type: status }, (signal) =>
      updateConnectionRequest(requestId, status, signal)),
  };
}
