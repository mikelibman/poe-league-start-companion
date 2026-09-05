import { readStore, writeStore } from "../../core/store";
import type { TargetRouteEntry } from "./types";

const STORE_NAME = "timer_target_route";

/** The target route is a reusable template you keep across league starts —
 * unlike run progress, it isn't reset when a new run starts. */
export async function loadTargetRoute(): Promise<TargetRouteEntry[]> {
  return readStore<TargetRouteEntry[]>(STORE_NAME, []);
}

export async function saveTargetRoute(route: TargetRouteEntry[]): Promise<void> {
  await writeStore(STORE_NAME, route);
}
