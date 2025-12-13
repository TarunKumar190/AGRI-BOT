export function cleanText(text = "") {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/function\s*\(.*?\)\s*\{.*?\}/gs, "")
    .replace(/\/\/.*$/gm, "")
    .trim();
}

export function truncate(text = "", n = 150) {
  return text.length > n ? text.slice(0, n) + "…" : text;
}
