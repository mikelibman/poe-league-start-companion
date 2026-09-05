// PoE 1's 7 base classes. Fixed by the game itself (unlike gem
// availability, which is patch-dependent and lives in reference data) —
// safe to hardcode rather than wait on a reference-data fetch. Order
// matches reference-data.json's `classes` field.
export const POE_CLASSES = [
  "Witch",
  "Shadow",
  "Ranger",
  "Duelist",
  "Marauder",
  "Templar",
  "Scion",
] as const;

export type PoeClass = (typeof POE_CLASSES)[number];
