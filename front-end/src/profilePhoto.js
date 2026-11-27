export const profilePhotoTypes = "image/jpeg,image/png,image/webp,image/gif,image/avif,image/bmp";
const supportedTypes = new Set(profilePhotoTypes.split(","));
const maxSourceBytes = 5_000_000;
const maxImageUrlLength = 96 * 1024;
const maxRequestBytes = 100 * 1024;
const preferredImageUrlLength = 90 * 1024;
const maxEdge = 640;
const qualities = [0.86, 0.75, 0.64];

export const profileBodyError = "The profile and photo are too large together. Shorten the profile text or choose a smaller photo.";

export function profileBodyFits(fields) {
  return new TextEncoder().encode(JSON.stringify(fields)).byteLength <= maxRequestBytes;
}

function readDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("The photo could not be read. Try a different file."));
    reader.readAsDataURL(blob);
  });
}

function encodeCanvas(canvas, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
}

export async function processProfilePhoto(file, fields, signal) {
  if (file.size > maxSourceBytes) throw new Error("Choose a photo up to 5 MB.");
  if (!supportedTypes.has(file.type)) {
    throw new Error("Choose a JPEG, PNG, WebP, GIF, AVIF, or BMP image.");
  }

  const url = URL.createObjectURL(file);
  const image = new Image();
  const fits = (value, limit) =>
    value.length <= limit && profileBodyFits({ ...fields, imageUrl: value });

  try {
    image.src = url;
    try {
      await image.decode();
    } catch {
      throw new Error("This photo could not be opened. Choose a valid image file.");
    }
    signal.throwIfAborted();

    const longestEdge = Math.max(image.naturalWidth, image.naturalHeight);
    // Keep small decoded originals as-is when they already fit.
    if (longestEdge <= maxEdge && file.size <= 48_000) {
      const original = await readDataUrl(file);
      if (fits(original, maxImageUrlLength)) return original;
    }

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Photo resizing is unavailable in this browser.");

    const initialScale = Math.min(1, maxEdge / longestEdge);
    for (const scale of [1, 0.8, 0.64, 0.5, 0.375]) {
      canvas.width = Math.max(1, Math.round(image.naturalWidth * initialScale * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * initialScale * scale));
      context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      for (const quality of qualities) {
        signal.throwIfAborted();
        const blob = await encodeCanvas(canvas, quality);
        if (!blob) break;
        const dataUrl = await readDataUrl(blob);
        if (fits(dataUrl, preferredImageUrlLength)) return dataUrl;
        // Browsers that return PNG ignore the quality setting.
        if (blob.type !== "image/webp") break;
      }
    }

    throw new Error(profileBodyError);
  } finally {
    URL.revokeObjectURL(url);
  }
}
