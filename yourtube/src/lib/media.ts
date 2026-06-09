export function getMediaUrl(filepath?: string | null): string {
  if (!filepath) return "";
  const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  let normalized = filepath.replace(/\\/g, "/");
  const uploadsIndex = normalized.indexOf("uploads/");
  if (uploadsIndex > 0) {
    normalized = normalized.slice(uploadsIndex);
  }
  normalized = normalized.replace(/^\//, "");
  return `${base}/${normalized}`;
}
