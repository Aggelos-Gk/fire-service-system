export function formatRelativeTime(isoDate) {
  if (!isoDate) {
    return "";
  }

  const now = new Date();
  const target = new Date(isoDate);
  const diffMs = now.getTime() - target.getTime();

  if (Number.isNaN(diffMs)) {
    return "";
  }

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} h ago`;
  if (days < 7) return `${days} d ago`;

  return target.toLocaleDateString();
}
