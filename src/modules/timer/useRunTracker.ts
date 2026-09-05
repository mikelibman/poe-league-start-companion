import { useEffect, useRef, useState } from "react";
import { onCharacterLevel, onZoneEntered } from "../../core/logWatcher";
import { useSettings } from "../../core/SettingsContext";
import type { ActiveRun, RunStatus, Split, TargetRouteEntry } from "./types";

// The Twilight Strand is the one-time, on-rails zone every character is
// created into — it can't normally be revisited once you've left Act 1
// progression, so entering it again is a very strong signal that a *new*
// character was just made (including "deleted and recreated with the same
// name", which is exactly what D7 guards against). Verified against a real
// Client.txt: 44 distinct Twilight Strand entries across one log, matching
// a pattern of repeated character creation for testing — exactly this case.
const RUN_START_ZONE = "The Twilight Strand";

// Client.txt has no field for the league (confirmed against a real log —
// it only shows up incidentally in other players' trade-whisper text, not
// from the client itself), so league stays fully manual. Character name
// *is* reliably available, just not on the zone-entry line itself — it's
// confirmed via the player's own level-up broadcast ("<Name> (<Class>) is
// now level N"), which normally fires within the first minute or two of a
// run. So the name is auto-suggested (and pre-filled) once that arrives,
// but still requires the user's confirmation, same "manual input for what
// the log can't fully guarantee" pattern used for vendor selection (D11).
interface PendingConfirmation {
  enteredAtMs: number;
  suggestedName: string | null;
  suggestedClass: string | null;
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

    const unlistenZonePromise = onZoneEntered((event) => {
      const enteredAtMs = parseClientTimestamp(event.rawTimestamp);

      if (event.zone === RUN_START_ZONE) {
        setPending({ enteredAtMs, suggestedName: null, suggestedClass: null });
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

    // Only updates the pending confirmation's suggestion — once a run is
    // already active, level-up events aren't otherwise used yet.
    const unlistenLevelPromise = onCharacterLevel((event) => {
      setPending((current) =>
        current
          ? { ...current, suggestedName: event.name, suggestedClass: event.characterClass }
          : current,
      );
    });

    return () => {
      void unlistenZonePromise.then((unlisten) => unlisten());
      void unlistenLevelPromise.then((unlisten) => unlisten());
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
