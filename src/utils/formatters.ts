export function formatFileSize(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function normalizeTel(value?: string | null) {
  return String(value || "")
    .trim()
    .replace(/[^0-9+]/g, "");
}

export function lineValue(value?: string | null, fallback = "—") {
  const clean = String(value || "").trim();
  return clean || fallback;
}