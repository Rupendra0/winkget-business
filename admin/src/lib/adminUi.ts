export function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export function getDisplayName(user: { name?: string; email?: string; phone?: string }) {
  return user.name || user.email || user.phone || "Unknown";
}
