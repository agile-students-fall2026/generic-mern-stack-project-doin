// Leave room for the other profile fields inside Express's default 100 KB body limit.
const maxImageValueLength = 96 * 1024;

const imageSignatures = {
  jpeg: (bytes) => bytes.length >= 8
    && bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
    && bytes.subarray(-2).equals(Buffer.from([0xff, 0xd9])),
  png: (bytes) => bytes.length >= 45
    && bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))
    && bytes.toString("ascii", 12, 16) === "IHDR"
    && bytes.subarray(-12).equals(Buffer.from("0000000049454e44ae426082", "hex")),
  gif: (bytes) => bytes.length >= 14
    && ["GIF87a", "GIF89a"].includes(bytes.toString("ascii", 0, 6))
    && bytes.at(-1) === 0x3b,
  webp: (bytes) => bytes.length >= 20
    && bytes.toString("ascii", 0, 4) === "RIFF"
    && bytes.readUInt32LE(4) === bytes.length - 8
    && bytes.toString("ascii", 8, 12) === "WEBP"
    && ["VP8 ", "VP8L", "VP8X"].includes(bytes.toString("ascii", 12, 16)),
  avif: (bytes) => {
    if (bytes.length < 24 || bytes.toString("ascii", 4, 8) !== "ftyp") return false;
    const end = bytes.readUInt32BE(0);
    if (end < 16 || end > bytes.length || end % 4 !== 0) return false;
    for (let offset = 8; offset < end; offset += 4) {
      if (offset !== 12 && ["avif", "avis"].includes(bytes.toString("ascii", offset, offset + 4))) {
        return true;
      }
    }
    return false;
  },
  bmp: (bytes) => bytes.length >= 26
    && bytes.toString("ascii", 0, 2) === "BM"
    && bytes.readUInt32LE(2) === bytes.length,
};

function isSupportedDataUrl(value) {
  const match = /^data:image\/(jpeg|png|gif|webp|avif|bmp);base64,([a-z0-9+/=]+)$/i.exec(value);
  if (!match) return false;

  const [, format, encoded] = match;
  const bytes = Buffer.from(encoded, "base64");
  return bytes.toString("base64") === encoded && imageSignatures[format.toLowerCase()](bytes);
}

export function normalizeProfileImage(value) {
  if (typeof value !== "string" || value.length > maxImageValueLength) return null;
  const image = value.trim();
  if (image === "") return image;
  if (/^data:/i.test(image)) return isSupportedDataUrl(image) ? image : null;
  if (/\s|\\|[\u0000-\u001f\u007f]/u.test(image)) return null;

  // Existing seeded profiles use HTTPS. Allow same-origin asset paths as well.
  if (/^\/(?!\/)/.test(image)) return image;
  if (!/^https?:\/\/[^/]/i.test(image)) return null;

  try {
    const url = new URL(image);
    return url.hostname && !url.username && !url.password ? image : null;
  } catch {
    return null;
  }
}
