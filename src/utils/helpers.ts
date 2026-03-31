export function normalizePid(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function buildCardUrl(pid: string) {
  const cleanPid = normalizePid(pid);
  const returnPath = `/card?pid=${encodeURIComponent(cleanPid)}&edit=1`;

  return `/p/${encodeURIComponent(cleanPid)}?emergency=1&return=${encodeURIComponent(returnPath)}`;
}

export function fullCardUrl(pid: string) {
  const origin = "https://vive-card.com";
  return origin + buildCardUrl(pid);
}
