export function normalizePid(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function normalizePhone(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .replace(/[^0-9+]/g, "");
}

export function normalizeDate(value: string | null | undefined) {
  const clean = String(value || "").trim();
  if (!clean) return "";

  const dotMatch = clean.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (dotMatch) {
    const [, dd, mm, yyyy] = dotMatch;
    return `${yyyy}-${mm}-${dd}`;
  }

  const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return clean;
  }

  return clean;
}

export function normalizeEmail(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

export function normalizeText(value: string | null | undefined) {
  return String(value || "").trim();
}
