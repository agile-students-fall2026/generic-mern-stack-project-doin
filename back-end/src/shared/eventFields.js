import { normalizeProfileImage } from "./profileImage.js";

const placeholder = "/static/images/event-default.svg";

export function normalizeEventImage(value) {
  const image = normalizeProfileImage(value);
  if (image === "") return placeholder;
  if (image?.startsWith("/") && (
    !/^\/static\/images\/[a-zA-Z0-9_-][a-zA-Z0-9_.-]*$/.test(image) || image.includes("..")
  )) return null;
  return image;
}

export function guestIds(event) {
  return event.attendeeIds.filter((id) => id !== event.organizerId);
}

export function serializeEvent(event) {
  return { ...event, attendeeIds: guestIds(event) };
}
