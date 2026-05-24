const MOJIBAKE_MARKERS = /[\u00c2\u00c3]/;
const UNRECOVERABLE_TEXT_MARKERS = /[\ufffd]/;

function repairUtf8ReadAsLatin1(value: string) {
  if (!MOJIBAKE_MARKERS.test(value)) return value;

  try {
    const bytes = Uint8Array.from(value, (char) => char.charCodeAt(0) & 0xff);
    const repaired = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    if (!MOJIBAKE_MARKERS.test(repaired) && !repaired.includes("\ufffd")) {
      return repaired;
    }
  } catch {
    return value;
  }

  return value.replace(/\u00c2/g, "");
}

export function normalizeDisplayText(value: string | null | undefined, fallback = "") {
  const rawValue = typeof value === "string" ? value.trim() : "";
  if (UNRECOVERABLE_TEXT_MARKERS.test(rawValue)) return fallback.trim();

  const normalized = repairUtf8ReadAsLatin1(rawValue || fallback).normalize("NFC");
  if (UNRECOVERABLE_TEXT_MARKERS.test(normalized)) return fallback.trim();

  return normalized.trim() || fallback;
}

export function hasUnrecoverableDisplayText(value: unknown) {
  return typeof value === "string" && UNRECOVERABLE_TEXT_MARKERS.test(value);
}
