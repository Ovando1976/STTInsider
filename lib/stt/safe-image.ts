export function safeImageSrc(src: unknown): string {
  const fallback = "/images/place-card.png";

  if (typeof src !== "string") return fallback;

  const trimmed = src.trim().replace(/^"+|"+$/g, "");

  if (!trimmed) return fallback;

  if (
    trimmed.includes("…") ||
    trimmed.includes("...") ||
    trimmed === "https://…/photo.jpg" ||
    trimmed === "https://.../photo.jpg" ||
    trimmed === "http://…/photo.jpg" ||
    trimmed === "http://.../photo.jpg"
  ) {
    return fallback;
  }

  if (trimmed.startsWith("/")) return trimmed;
  if (trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("http://")) return trimmed;

  return fallback;
}
