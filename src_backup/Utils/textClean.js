export function cleanText(text = "") {
  return text
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/function\s*\(.*?\)\s*\{.*?\}/gs, "") // Remove JS functions
    .replace(/\/\/.*$/gm, "") // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, "") // Remove multi-line comments
    .replace(/\{[\s\S]*?\}/g, "") // Remove JSON/object literals
    .replace(/\[[\s\S]*?\]/g, "") // Remove arrays
    .replace(/\n{3,}/g, "\n\n") // Collapse multiple newlines
    .replace(/\s+/g, " ") // Collapse whitespace
    .replace(/[^\w\s\-.,;:!?()\u0900-\u097F]/g, "") // Keep only alphanumeric, punctuation, and Hindi chars
    .trim();
}

export function truncate(text = "", n = 150) {
  return text.length > n ? text.slice(0, n) + "…" : text;
}
