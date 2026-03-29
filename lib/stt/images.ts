export const STT_PLACEHOLDER_IMAGE = "/images/place-card.png";

export function resolveFirestoreImagePath(value: unknown): string {
  if (typeof value !== "string") {
    return STT_PLACEHOLDER_IMAGE;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return STT_PLACEHOLDER_IMAGE;
  }

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("//")
  ) {
    return trimmed;
  }

  if (trimmed.startsWith("/images/")) {
    return trimmed;
  }

  if (trimmed.startsWith("images/")) {
    return `/${trimmed}`;
  }

  if (trimmed.startsWith("/")) {
    return `/images/${trimmed.slice(1)}`;
  }

  return `/images/${trimmed}`;
}
