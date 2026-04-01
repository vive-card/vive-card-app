export function isImageMime(mimeType?: string | null) {
  return String(mimeType || "").toLowerCase().startsWith("image/");
}

export function isPdfMime(mimeType?: string | null, fileName?: string | null) {
  const mime = String(mimeType || "").toLowerCase();
  const name = String(fileName || "").toLowerCase();
  return mime === "application/pdf" || name.endsWith(".pdf");
}

export function guessExtension(fileName?: string | null, mimeType?: string | null) {
  const name = String(fileName || "").toLowerCase();

  if (name.includes(".")) {
    return name.split(".").pop() || "bin";
  }

  const mime = String(mimeType || "").toLowerCase();
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "application/pdf") return "pdf";

  return "bin";
}

export function getDocumentEmoji(params: {
  mime_type?: string | null;
  file_name?: string | null;
}) {
  if (isImageMime(params.mime_type)) return "🖼️";
  if (isPdfMime(params.mime_type, params.file_name)) return "📄";
  return "📎";
}

export async function uriToArrayBuffer(uri: string) {
  const response = await fetch(uri);
  return await response.arrayBuffer();
}
