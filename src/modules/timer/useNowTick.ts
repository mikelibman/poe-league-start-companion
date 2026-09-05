import { useEffect, useState } from "react";

/** Re-renders every `intervalMs` while `active`, so a live elapsed-time
 * display keeps ticking between zone transitions instead of looking frozen. */
export function useNowTick(active: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);

  return now;
}
