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

The current `reference-data.json` is **starter data proving out the
fetch/cache pipeline (Issue #3), not a verified source**. Quest rewards,
vendor stock, and gambling-vendor entries need a pass from someone playing
the current patch before the gem plan and regex builder modules (Issues
#5-6) should treat this as ground truth. PRs correcting or expanding it are
welcome.

## Schema

```jsonc
{
  "schemaVersion": 1,
  "questRewards": [
    { "id": "...", "act": 1, "quest": "...", "gem": "..." }
  ],
  "vendorStock": [
    { "vendorId": "...", "act": 1, "vendor": "...", "gems": ["..."] }
  ],
  "itemBases": [
    { "category": "...", "bases": ["..."] }
  ],
  "gamblingVendors": ["vendorId", "..."]
}
```

`vendorId` values are shared between `vendorStock` and `gamblingVendors` —
that's what lets the app mark a vendor's gambling capability without a
separate lookup.
