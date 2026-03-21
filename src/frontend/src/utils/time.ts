export function formatLastSeen(lastSeenNs: bigint): string {
  const nowMs = Date.now();
  const lastSeenMs = Number(lastSeenNs / 1_000_000n);
  const diffMs = nowMs - lastSeenMs;

  if (diffMs < 60_000) return "Last seen just now";
  if (diffMs < 3_600_000) {
    const min = Math.floor(diffMs / 60_000);
    return `Last seen ${min} min ago`;
  }
  if (diffMs < 86_400_000) {
    const h = Math.floor(diffMs / 3_600_000);
    return `Last seen ${h}h ago`;
  }
  const d = Math.floor(diffMs / 86_400_000);
  return `Last seen ${d}d ago`;
}

export function formatMessageTime(timestampNs: bigint): string {
  const ms = Number(timestampNs / 1_000_000n);
  const date = new Date(ms);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Derive online status from lastSeen timestamp.
// A user is considered online if they were active within the last 90 seconds.
export function isOnlineFromLastSeen(lastSeenNs: bigint): boolean {
  if (lastSeenNs === 0n) return false;
  const nowMs = Date.now();
  const lastSeenMs = Number(lastSeenNs / 1_000_000n);
  return nowMs - lastSeenMs < 90_000;
}
