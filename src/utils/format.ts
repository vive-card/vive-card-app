import { normalizeDate } from "./normalize";

export function lineValue(value?: string | null, fallback = "—") {
  const text = String(value || "").trim();
  return text || fallback;
}

export function formatFileSize(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDateForWeb(value: string | null | undefined) {
  const clean = normalizeDate(value);
  if (!clean) return "";

  const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!isoMatch) return clean;

  const [, yyyy, mm, dd] = isoMatch;
  return `${dd}.${mm}.${yyyy}`;
}

export function formatDateTime(value?: string | null, fallback = "—") {
  if (!value) return fallback;

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value || fallback;
  }
}

export function getStatusLabel(status?: string | null) {
  const value = String(status || "").trim();

  if (!value) return "Unbekannt";
  if (value === "claimed") return "Aktiv";
  if (value === "print_ready") return "Print Ready";
  if (value === "in_stock") return "Auf Lager";
  if (value === "printed") return "Gedruckt";
  if (value === "shipped") return "Versendet";
  if (value === "blocked") return "Gesperrt";
  if (value === "reserved") return "Reserviert";

  return value;
}

export function getStatusColor(status?: string | null) {
  const value = String(status || "").trim();

  if (value === "claimed") return "#24c26a";
  if (value === "blocked") return "#ff6b6b";
  if (value === "print_ready") return "#ffb020";
  if (value === "printed") return "#3da5ff";
  if (value === "shipped") return "#7c92ff";
  if (value === "reserved") return "#ffb020";
  if (value === "in_stock") return "#8c98a8";

  return "#8c98a8";
}
