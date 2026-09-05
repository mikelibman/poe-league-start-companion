export function formatDuration(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}

/** Signed actual-vs-target delta, e.g. "+0:05" (behind) or "-0:02" (ahead). */
export function formatDelta(
  actualMs: number,
  targetSeconds: number | null,
): string | null {
  if (targetSeconds === null) return null;
  const deltaMs = actualMs - targetSeconds * 1000;
  const sign = deltaMs >= 0 ? "+" : "-";
  return `${sign}${formatDuration(Math.abs(deltaMs))}`;
}
