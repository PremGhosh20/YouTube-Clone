const STORAGE_KEY = "yourtube-call-client-id";

/** Unique per browser tab — allows same account on two browsers in one room */
export function getCallClientId(): string {
  if (typeof window === "undefined") return "";

  let id = sessionStorage.getItem(STORAGE_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? `client-${crypto.randomUUID()}`
        : `client-${Math.random().toString(36).slice(2, 12)}`;
    sessionStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
