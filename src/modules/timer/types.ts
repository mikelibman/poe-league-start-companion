export interface TargetRouteEntry {
  id: string;
  act: number;
  zoneName: string;
  targetSeconds: number;
}

export interface Split {
  zoneName: string;
  enteredAtMs: number;
  elapsedMs: number;
  targetSeconds: number | null;
  act: number | null;
}

export type RunStatus = "idle" | "pending-confirmation" | "active";

export interface ActiveRun {
  characterName: string;
  league: string;
  startedAtMs: number;
  splits: Split[];
  currentZone: string;
  currentZoneEnteredAtMs: number;
}
