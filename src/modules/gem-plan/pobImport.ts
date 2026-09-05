import { invoke } from "@tauri-apps/api/core";

export interface PobImportResult {
  gemNames: string[];
}

/** Decodes a pasted Path of Building export code into a gem name list.
 * Note: the decode pipeline (base64 -> raw DEFLATE -> XML) is implemented
 * per the documented PoB export convention but has not been verified
 * against a real PoB code in this environment — the spec already treats
 * PoB format drift as an accepted risk (D28). */
export async function parsePobCode(code: string): Promise<PobImportResult> {
  return invoke<PobImportResult>("gemplan_parse_pob", { code });
}
