/**
 * Merge class names conditionally (lightweight cn utility).
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Format a tool slug into a human-readable label.
 * e.g. "jpg-to-png" -> "JPG to PNG"
 */
export function formatSlugAsTitle(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
