/** Extract room id from pasted invite link or raw room id */
export function parseRoomId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const url = new URL(trimmed);
      const match = url.pathname.match(/\/call\/([^/]+)\/?$/);
      if (match?.[1]) return decodeURIComponent(match[1]);
    }
  } catch {
    /* not a URL */
  }

  if (/^room-[a-z0-9]+$/i.test(trimmed)) return trimmed;

  const pathMatch = trimmed.match(/\/call\/([^/\s]+)\/?$/);
  if (pathMatch?.[1]) return decodeURIComponent(pathMatch[1]);

  return trimmed.replace(/[^a-zA-Z0-9-_]/g, "") || null;
}
