export function isValidEmail(email: string | null | undefined) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

export function isValidPassword(password: string | null | undefined, min = 6) {
  return String(password || "").length >= min;
}
