import { cancelEvent } from "./api";

export function cancelEventAction(title) {
  return {
    title: "Cancel this event?",
    description: `Cancel ${title} for everyone? This action cannot be undone.`,
    confirmLabel: "Cancel Event",
    dismissLabel: "Keep event",
    pendingLabel: "Canceling…",
    success: "Event canceled.",
    send: cancelEvent,
    destructive: true,
  };
}
