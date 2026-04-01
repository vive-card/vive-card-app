export function isImageMime(mimeType?: string | null) {
  return String(mimeType || "").toLowerCase().startsWith("image/");
}

export function isPdfMime(mimeType?: string | null, fileName?: string | null) {
  const mime = String(mimeType || "").toLowerCase();
  const name = String(fileName || "").toLowerCase();
  return mime === "application/pdf" || name.endsWith(".pdf");
}

export function formatFileSize(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getDocumentEmoji(doc: {
  mime_type?: string | null;
  file_name?: string | null;
}) {
  if (isImageMime(doc.mime_type)) return "🖼️";
  if (isPdfMime(doc.mime_type, doc.file_name)) return "📄";
  return "📎";
}

export function lineValue(value?: string | null, fallback = "—") {
  const text = String(value || "").trim();
  return text || fallback;
}
