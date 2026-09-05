import { useEffect, useRef, useState } from "react";
import { onZoneEntered } from "../../core/logWatcher";
import { useSettings } from "../../core/SettingsContext";
import type { ActiveRun, RunStatus, Split, TargetRouteEntry } from "./types";

// The Twilight Strand is the one-time, on-rails zone every character is
// created into — it can't normally be revisited once you've left Act 1
// progression, so entering it again is a very strong signal that a *new*
// character was just made (including "deleted and recreated with the same
// name", which is exactly what D7 guards against).
const RUN_START_ZONE = "The Twilight Strand";

// Client.txt has no reliable field for character name or league (unlike
// zone transitions, which are unambiguous) — this is a deliberate
// departure from the spec's literal "unseen character/league combo"
// wording. Rather than guess at a log format we're not confident exists,
// the zone entry triggers an automatic prompt and the user manually
// confirms who's running, the same "manual input for what the log can't
// tell us" pattern used for vendor selection (D11).
interface PendingConfirmation {
  enteredAtMs: number;
}

function parseClientTimestamp(raw: string): number {
  // Client.txt format: "YYYY/MM/DD HH:mm:ss", local time, second precision.
  const match = raw.match(/^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return Date.now();
  const [, y, mo, d, h, mi, s] = match.map(Number);
  return new Date(y, mo - 1, d, h, mi, s).getTime();
}

export function lookupTarget(
  route: TargetRouteEntry[],
  zoneName: string,
): number | null {
  return route.find((entry) => entry.zoneName === zoneName)?.targetSeconds ?? null;
}

export function lookupAct(
  route: TargetRouteEntry[],
  zoneName: string,
): number | null {
  return route.find((entry) => entry.zoneName === zoneName)?.act ?? null;
}

export function useRunTracker(targetRoute: TargetRouteEntry[]) {
  const { disabledModules } = useSettings();
  const timerEnabled = !disabledModules.has("timer");

  const [status, setStatus] = useState<RunStatus>("idle");
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const [run, setRun] = useState<ActiveRun | null>(null);

  // Read inside the event handler without re-subscribing every time the
  // route template changes.
  const targetRouteRef = useRef(targetRoute);
  targetRouteRef.current = targetRoute;

  useEffect(() => {
    if (!timerEnabled) return;

    const unlistenPromise = onZoneEntered((event) => {
      const enteredAtMs = parseClientTimestamp(event.rawTimestamp);

      if (event.zone === RUN_START_ZONE) {
        setPending({ enteredAtMs });
        setStatus("pending-confirmation");
        return;
      }

      setRun((current) => {
        if (!current) return current;
        const closedSplit: Split = {
          zoneName: current.currentZone,
          enteredAtMs: current.currentZoneEnteredAtMs,
          elapsedMs: enteredAtMs - current.currentZoneEnteredAtMs,
          targetSeconds: lookupTarget(targetRouteRef.current, current.currentZone),
          act: lookupAct(targetRouteRef.current, current.currentZone),
        };
        return {
          ...current,
          splits: [...current.splits, closedSplit],
          currentZone: event.zone,
          currentZoneEnteredAtMs: enteredAtMs,
        };
      });
    });

    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, [timerEnabled]);

  function confirmNewRun(characterName: string, league: string) {
    if (!pending) return;
    setRun({
      characterName,
      league,
      startedAtMs: pending.enteredAtMs,
      splits: [],
      currentZone: RUN_START_ZONE,
      currentZoneEnteredAtMs: pending.enteredAtMs,
    });
    setStatus("active");
    setPending(null);
  }

  function dismissNewRun() {
    setPending(null);
    setStatus(run ? "active" : "idle");
  }

  return { status, pending, run, confirmNewRun, dismissNewRun };
}
