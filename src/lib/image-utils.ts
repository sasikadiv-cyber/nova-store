/**
 * Shared between the admin image editor (client) and the product write path
 * (server). Kept in a plain module so neither side pulls the other in.
 */

export type ImageRow = { label: string; url: string };

export function isImageUrl(value: string) {
  return /^(https?:\/\/|\/)\S+$/i.test(value.trim());
}

/**
 * Splits a stored line into its optional label and its URL.
 * The last pipe-separated token wins, so a label may itself contain a pipe.
 */
export function parseImageLine(line: string): ImageRow {
  const parts = line.split("|").map((part) => part.trim());
  const last = parts[parts.length - 1] ?? "";
  if (parts.length > 1 && isImageUrl(last)) {
    return { label: parts.slice(0, -1).join(" | "), url: last };
  }
  return { label: "", url: line.trim() };
}

/** Serialises rows back to the stored `Label | url` line format. */
export function serialiseImageRows(rows: ImageRow[]) {
  return rows
    .filter((row) => row.url.trim().length > 0)
    .map((row) => (row.label.trim() ? `${row.label.trim()} | ${row.url.trim()}` : row.url.trim()))
    .join("\n");
}
