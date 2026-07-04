/** Allow letters (any language), numbers, spaces, and basic punctuation only. */
const ALLOWED_COMMENT =
  /^[\p{L}\p{M}\p{N}\s.,!?'"\-:;()]+$/u;

const BLOCKED_CHARS =
  /[@#$%^&*+=\[\]{}|\\<>/`~_]|[^\p{L}\p{M}\p{N}\s.,!?'"\-:;()]/u;

export function validateCommentText(text) {
  const trimmed = text?.trim();
  if (!trimmed) {
    return { ok: false, message: "Comment cannot be empty" };
  }
  if (trimmed.length > 2000) {
    return { ok: false, message: "Comment is too long (max 2000 characters)" };
  }
  if (!ALLOWED_COMMENT.test(trimmed)) {
    return {
      ok: false,
      message:
        "Special characters are not allowed. Use letters, numbers, and basic punctuation only.",
    };
  }
  return { ok: true, text: trimmed };
}

export function findBlockedCharacters(text) {
  const matches = text.match(BLOCKED_CHARS);
  if (!matches) return [];
  return [...new Set(matches)];
}
