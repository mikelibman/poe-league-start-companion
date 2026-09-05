# Reference data

This is the hosted JSON the app fetches at runtime (spec: Data Model &
Storage, D15/D16) — quest rewards, vendor stock, item bases, and the
gambling-capable vendor list. It's intentionally *not* bundled with the
app, so a patch-driven correction is a commit + merge here, not a new
release.

The app fetches `reference-data.json` from this repo's `master` branch via
`raw.githubusercontent.com` (see `REFERENCE_DATA_URL` in
`src-tauri/src/modules/reference_data.rs`) and caches the last successful
fetch locally so it still works mid-race without internet.

## Status

**Quest rewards and vendor gem stock are sourced from
[poewiki.net](https://www.poewiki.net/wiki/Quest_Rewards)**, and are
class-aware: both which gems a quest offers and which gems a vendor sells
depend on character class in Path of Exile.

Coverage: skill-gem *choice* rewards only exist on quests in Acts 1-4 —
other quests with the same per-class table layout (Acts 5/6/7/9/10) hand
out class-restricted weapon/armor base types instead, not gems, and are
out of scope for this gem-only dataset. A quest can grant a direct gem
choice, unlock new vendor stock, or both at once (`vendorUnlocks` on the
quest entry) — "The Root of the Problem" in Act 2 is purely the
vendor-unlock kind, no direct reward at all. `order` is each quest's
position in its act's completion sequence, taken from that Act's own wiki
page listing — not independently walkthrough-verified quest-by-quest, so
flag it if something looks out of place once you see it in-app.

Vendor stock (`vendorStock`) covers the four class-restricted Act 1-4
vendors (Nessa, Yeena, Clarissa, Petarus and Vanja) plus Siosa and Lilly
Roth, whose stock ignores class entirely and is modeled as the union of
quest-reward gems across their stated act range. It's each vendor's
final, fully-unlocked stock (union across every quest tier that adds to
it) — used for filtering by currently-selected vendor, independent of
quest completion, since the app only tracks zone entry.

**`itemBases` and `gamblingVendors` remain unverified starter
placeholders** — that pass hasn't happened yet. PRs correcting or
expanding any of this are welcome; a patch update to gem availability is
exactly the kind of change this file exists to make cheap.

## Schema

```jsonc
{
  "schemaVersion": 3,
  "classes": ["Witch", "Shadow", "Ranger", "Duelist", "Marauder", "Templar", "Scion"],
  "questRewards": [
    {
      "id": "a1-enemy-at-the-gate",
      "act": 1,
      "order": 1,
      "quest": "Enemy at the Gate",
      "gemsByClass": { "Witch": ["Freezing Pulse", "..."], "...": [] },
      "vendorUnlocks": [
        { "vendorId": "a1-nessa", "vendor": "Nessa", "gemsByClass": { "Witch": ["..."], "...": [] } }
      ]
    }
  ],
  "vendorStock": [
    {
      "vendorId": "a1-nessa",
      "act": 1,
      "vendor": "Nessa",
      "gemsByClass": { "Witch": ["..."], "...": [] }
    }
  ],
  "itemBases": [
    { "category": "...", "bases": ["..."] }
  ],
  "gamblingVendors": ["vendorId", "..."]
}
```

`vendorId` values are shared between `questRewards[].vendorUnlocks`,
`vendorStock`, and `gamblingVendors` — that's what lets the app mark a
vendor's gambling capability, and match a quest's unlock to the vendor's
full stock, without a separate lookup table. `gemsByClass` keys always
match `classes` exactly, even for vendors like Siosa/Lilly Roth whose
stock doesn't actually vary by class (the same list is just repeated
under every key, so the frontend never has to special-case "this vendor
ignores class") and for a quest with no direct reward (all classes get an
empty array rather than the key being absent).
