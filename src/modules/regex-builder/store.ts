import { readStore, writeStore } from "../../core/store";
import type { RegexBuilderExport } from "./types";

const GEAR_STORE = "regex_gear_selection";
const GAMBLING_STORE = "regex_gambling_selection";

const EMPTY: RegexBuilderExport = { selectedBases: [], customEntries: [] };

export async function loadGearSelection(): Promise<RegexBuilderExport> {
  return readStore(GEAR_STORE, EMPTY);
}

export async function saveGearSelection(data: RegexBuilderExport): Promise<void> {
  await writeStore(GEAR_STORE, data);
}

export async function loadGamblingSelection(): Promise<RegexBuilderExport> {
  return readStore(GAMBLING_STORE, EMPTY);
}

export async function saveGamblingSelection(
  data: RegexBuilderExport,
): Promise<void> {
  await writeStore(GAMBLING_STORE, data);
}
