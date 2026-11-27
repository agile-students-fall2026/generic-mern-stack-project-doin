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
