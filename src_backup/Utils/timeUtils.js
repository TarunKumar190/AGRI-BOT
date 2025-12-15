export function timeAgo(date) {
  if (!date) return "recently";
  const diff = Math.floor((Date.now() - new Date(date)) / 60000);
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff} min ago`;
  const hrs = Math.floor(diff / 60);
  if (hrs < 24) return `${hrs} hrs ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}
