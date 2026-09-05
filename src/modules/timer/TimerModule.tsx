import { useState } from "react";
import { useTimer } from "./TimerContext";
import { useNowTick } from "./useNowTick";
import { formatDuration, formatDelta } from "./format";
import type { TargetRouteEntry } from "./types";

export function TimerModule() {
  const {
    status,
    pending,
    run,
    confirmNewRun,
    dismissNewRun,
    targetRoute,
    setTargetRoute,
    targetRouteLoaded,
  } = useTimer();

  const now = useNowTick(status === "active");

  const [characterName, setCharacterName] = useState("");
  const [league, setLeague] = useState("");

  const totalElapsedMs = run ? now - run.startedAtMs : 0;
  const currentZoneElapsedMs = run ? now - run.currentZoneEnteredAtMs : 0;
  const currentZoneTarget = run
    ? (targetRoute.find((entry) => entry.zoneName === run.currentZone)
        ?.targetSeconds ?? null)
    : null;

  return (
    <section>
      <h1>Timer</h1>

      {status === "pending-confirmation" && pending && (
        <div className="new-run-banner">
          <p>New run detected — entered The Twilight Strand.</p>
          <p>
            Client.txt can't tell us the character name or league, so confirm
            them here to start timing:
          </p>
          <div className="row-buttons">
            <input
              placeholder="Character name"
              value={characterName}
              onChange={(e) => setCharacterName(e.currentTarget.value)}
            />
            <input
              placeholder="League"
              value={league}
              onChange={(e) => setLeague(e.currentTarget.value)}
            />
          </div>
          <div className="row-buttons">
            <button onClick={() => confirmNewRun(characterName, league)}>
              Start Run
            </button>
            <button onClick={dismissNewRun}>Dismiss</button>
          </div>
        </div>
      )}

      {run ? (
        <>
          <h2>
            {run.characterName || "(unnamed)"} — {run.league || "(no league)"}
          </h2>
          <p>Total: {formatDuration(totalElapsedMs)}</p>
          <p>
            Current zone: {run.currentZone} —{" "}
            {formatDuration(currentZoneElapsedMs)}
            {currentZoneTarget !== null && (
              <>
                {" "}
                (target {formatDuration(currentZoneTarget * 1000)},{" "}
                {formatDelta(currentZoneElapsedMs, currentZoneTarget)})
              </>
            )}
          </p>

          <h3>Splits</h3>
          {run.splits.length === 0 ? (
            <p>No zones completed yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Zone</th>
                  <th>Act</th>
                  <th>Time</th>
                  <th>Target</th>
                  <th>Delta</th>
                </tr>
              </thead>
              <tbody>
                {run.splits.map((split, i) => (
                  <tr key={i}>
                    <td>{split.zoneName}</td>
                    <td>{split.act ?? "—"}</td>
                    <td>{formatDuration(split.elapsedMs)}</td>
                    <td>
                      {split.targetSeconds !== null
                        ? formatDuration(split.targetSeconds * 1000)
                        : "—"}
                    </td>
                    <td>
                      {split.targetSeconds !== null
                        ? formatDelta(split.elapsedMs, split.targetSeconds)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      ) : (
        <p>
          No run in progress. Enter The Twilight Strand on a new character to
          start one.
        </p>
      )}

      <h2>Target pace</h2>
      {targetRouteLoaded ? (
        <TargetRouteEditor route={targetRoute} onChange={setTargetRoute} />
      ) : (
        <p>Loading target route…</p>
      )}
    </section>
  );
}

function TargetRouteEditor({
  route,
  onChange,
}: {
  route: TargetRouteEntry[];
  onChange: (route: TargetRouteEntry[]) => void;
}) {
  const [act, setAct] = useState("1");
  const [zoneName, setZoneName] = useState("");
  const [targetSeconds, setTargetSeconds] = useState("");

  function addEntry() {
    if (!zoneName.trim() || !targetSeconds.trim()) return;
    const entry: TargetRouteEntry = {
      id: crypto.randomUUID(),
      act: Number(act) || 1,
      zoneName: zoneName.trim(),
      targetSeconds: Number(targetSeconds) || 0,
    };
    onChange([...route, entry]);
    setZoneName("");
    setTargetSeconds("");
  }

  function removeEntry(id: string) {
    onChange(route.filter((entry) => entry.id !== id));
  }

  return (
    <div>
      {route.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Act</th>
              <th>Zone</th>
              <th>Target</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {route.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.act}</td>
                <td>{entry.zoneName}</td>
                <td>{formatDuration(entry.targetSeconds * 1000)}</td>
                <td>
                  <button onClick={() => removeEntry(entry.id)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="row-buttons">
        <input
          className="act-input"
          value={act}
          onChange={(e) => setAct(e.currentTarget.value)}
          placeholder="Act"
        />
        <input
          value={zoneName}
          onChange={(e) => setZoneName(e.currentTarget.value)}
          placeholder="Zone name"
        />
        <input
          className="seconds-input"
          value={targetSeconds}
          onChange={(e) => setTargetSeconds(e.currentTarget.value)}
          placeholder="Target seconds"
        />
        <button onClick={addEntry}>Add</button>
      </div>
    </div>
  );
}
