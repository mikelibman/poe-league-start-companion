# PoE League Start Companion — Spec

**Status:** Draft for implementation
**Date:** 2026-09-04
**Game scope:** Path of Exile 1 only

## Overview

A modular Windows desktop app that helps Path of Exile racers/league-starters:

1. Track time per zone, act, and total, live, compared against a manually set target pace.
2. Plan which gems to buy — quest reward or vendor purchase — and where/when.
3. Generate vendor-aware regex strings for gem shopping, changing automatically based on what's already been bought.
4. Generate regex strings for specific gear (e.g. runner boots, leveling wands), vendor-aware.
5. Generate regex strings for gambling vendors, restricted to vendors that actually gamble.

The app never reads PoE's game memory — that's against GGG's Terms of Service. Its only "automatic" data source is `Client.txt`, the game's own log file, which records zone transitions but not vendor interactions or purchases. Everything the log can't see (which vendor you're at, what you've bought) is confirmed manually in the app.

## Goals

- Fast, low-friction reference tool usable *during* a timed run without breaking flow.
- Modular architecture: each feature is a self-contained module that can be added, removed, or edited independently.
- Safe by construction: no ToS violations, no memory reading, no risk of account bans.
- Community-usable: open source, works out of the box for anyone who installs it, not just the original author.

## Non-Goals (v1)

- PoE 2 support.
- macOS or Linux support.
- Ruthless mode or SSF-specific vendor/gem rules.
- Automatic detection of vendor screens, purchases, or inventory state (would require memory reading).
- Account system, cloud sync, or multiplayer/shared data.

## Users

Broader community tool. Anyone installs and runs it independently — no accounts, no shared backend beyond the read-only reference data feed.

## Tech Stack & Architecture

- **Shell:** Tauri (Rust backend + React/TypeScript frontend). Chosen over Electron for lower CPU/RAM footprint, which matters since PoE itself is resource-heavy and this app runs alongside it.
- **Modularity:** Each feature (Timer, Gem Plan, Regex Builder) ships as a self-contained frontend module — own routes, state slice, settings schema — registered through a central module registry. Backend commands are namespaced per module in Rust. Modules can be enabled/disabled without breaking the rest of the app.
- **Core services** (shared by all modules): local JSON storage layer with atomic writes, log watcher, remote reference-data fetcher + cache, shared vendor-selector UI component.

## Feature: Time Tracking

- **What's tracked:** live splits per zone, rolled up per act, and a running total for the run.
- **Target pace:** entered manually per zone/act in-app (no file import, no auto-generated target from history in v1).
- **Run detection:** a new run starts when the log shows the first Act 1 zone entry paired with a character name/league combination not seen this session. This guards against the common case of deleting and recreating a character with the same name.
- **Log handling:** continuous read of `Client.txt`; on lock or read failure, surface an error. No special recovery logic for a manually cleared or rotated log file in v1 — treated as an acceptable edge case for now.
- **Log file location:** auto-detected from common Steam/standalone install paths, with a manual browse/override if detection fails.
- **Locale:** log parsing targets the English game client for v1. Zone-name strings are isolated from the parsing logic so other locales can be added later without a rewrite.

## Feature: Gem Planning

- **Build input:** two supported methods —
  - Manual: pick gems per level/act directly in-app.
  - Import: paste a Path of Building code/link; the app derives the gem list from it.
- **Availability tagging:** every gem in a plan is tagged with how/where it's obtained — quest reward (which quest) or vendor purchase (which act/vendor range). This tagging is what lets the regex builder filter to only what's currently buyable.
- **Plan vs. progress:** a plan is a reusable template (e.g., one per build) that you keep across league starts. "Bought" status is separate progress that resets automatically each time a new run begins.
- **Purchase tracking:** manual checkboxes only. The log doesn't record vendor purchases, and memory reading is off the table (see Constraints).

## Feature: Regex Builder — Gems, Gear, Gambling

All three regex tools share one vendor-selection dropdown (manual — the log can't tell us which vendor screen is open) and one compile/output pipeline: character-limit counter (~250 chars, matching PoE's vendor/stash search field), custom free-text entry, export/import. There are no standalone "profiles" like community tools such as `poe.re` use — everything ties into this app's own gem plan and vendor-selection state instead.

- **Gems:** candidate list is pre-filtered to gems obtainable at the currently selected vendor/act, and automatically excludes anything already checked off as bought. This keeps the regex short by construction, not just by truncation.
- **Gear:** curated, toggleable checklist presets by category (movement speed, weapon bases, link colors, etc. — following the pattern used by `poe.re`), plus free-text custom entries for anything not covered by presets.
- **Gambling:** the gambling category only becomes available when the selected vendor is gambling-capable. Enforced through the same shared vendor dropdown rather than a separate gambling-only picker.
- **Length limit handling:** primary defense is act/vendor filtering (above). If the filtered candidate list is still over the character limit, the app warns and truncates as a fallback — this is expected to be rare.

## Data Model & Storage

- **Personal data** (plans, target routes, run history, settings): local JSON files. Writes are atomic (write to temp file, then rename) to avoid corruption on crash.
- **Reference data** (quest rewards, vendor stock, item bases, gambling vendor list): fetched at runtime from a hosted JSON source, not bundled with the app — lets the data stay current with PoE patches without shipping a new release. The last successful fetch is cached locally as an offline fallback (used mid-race, sometimes without internet).

## Platform & Distribution

- Windows only for v1.
- Open source on GitHub.
- Distributed via signed Tauri auto-updater. Updates download in the background but don't install or restart the app while a run is actively being timed — they apply on the next app restart, so an update never interrupts a split.

## Constraints

- **No memory reading, ever.** Reading PoE's process memory is against GGG's Terms of Service and risks account bans — unacceptable for a tool meant for broader community use. `Client.txt` parsing plus manual user input are the only data sources.
- **PoB import format risk (accepted):** the app depends on a third-party site's Path of Building export format, which could change and break parsing. No alternative exists without owning that export format ourselves; accepted as a dependency risk for v1.

## Risks

| Risk | Mitigation |
|---|---|
| `Client.txt` location varies by install type | Auto-detect common paths, manual override |
| Non-English clients log different zone-name strings | English-only v1, locale-ready parser structure |
| Log file locked or manually cleared mid-session | Continuous read + error surfacing; no auto-recovery in v1 |
| Regex candidate list exceeds vendor search char limit | Act/vendor filtering first, warn/truncate fallback |
| Auto-update interrupts a timed run | Defer install until app restart, never mid-run |
| PoB export format changes upstream | Accepted risk, documented; no owned alternative |

---

## Decisions Log

| ID | Topic | Decision | Rationale | Source | Date |
|---|---|---|---|---|---|
| D1 | Platform | Desktop app, Client.txt log parsing | Balances automation with ToS compliance | Interview | 2026-09-04 |
| D2 | Tech stack | Tauri + React/TypeScript, feature-module pattern | Lower resource use than Electron; plugin system supports modularity | Interview | 2026-09-04 |
| D3 | Target users | Broader community, standalone installs, no accounts | User wants a public release | Interview | 2026-09-04 |
| D4 | Game scope | PoE 1 only | PoE1/PoE2 differ entirely in acts, vendors, quest rewards | Interview | 2026-09-04 |
| D5 | Time tracking scope | Live splits (zone/act/total) + compare vs target pace | Enables the racing use case | Interview | 2026-09-04 |
| D6 | Target route input | Manually entered per zone/act in-app | Simplest v1 approach | Interview | 2026-09-04 |
| D7 | Run detection | Infer from first Act 1 entry + unseen character/league combo | Client.txt has no explicit "character created" event; guards against recreated same-name characters | Interview | 2026-09-04 |
| D8 | Memory reading | Ruled out entirely | Violates PoE ToS; ban risk for a community-distributed tool | Interview | 2026-09-04 |
| D9 | Gem build input | Manual checklist + Path of Building import, both supported | Covers casual and build-planning users | Interview | 2026-09-04 |
| D10 | Gem progress tracking | Manual checkboxes only | No memory reading; log doesn't record purchases | Interview | 2026-09-04 |
| D11 | Vendor selection | Manual dropdown; log can't detect an open vendor screen | Confirmed via research into Client.txt's log format | Interview | 2026-09-04 |
| D12 | Gear want-list model | Curated toggleable checklist by category + custom text | Matches the poe.re UX the user referenced | Interview | 2026-09-04 |
| D13 | Regex feature parity | Char-limit counter, custom text, export/import; profiles replaced by plan/vendor state | Ties the regex tool into the app's own data model instead of standalone profiles | Interview | 2026-09-04 |
| D14 | Gambling restriction | Gambling category enabled only when a gambling-capable vendor is selected | Matches the "specific vendors only" requirement via the shared vendor picker | Interview | 2026-09-04 |
| D15 | Reference data source | Fetched at runtime from hosted JSON, not bundled | Allows data updates without shipping a new app release | Interview | 2026-09-04 |
| D16 | Reference data offline fallback | Cache the last successful fetch locally | App is used mid-race, possibly offline | Interview | 2026-09-04 |
| D17 | Personal data storage | Local JSON files | Simpler, human-editable, no DB overhead needed at this scale | Interview | 2026-09-04 |
| D18 | OS support | Windows only for v1 | Matches the vast majority of the PoE player base | Interview | 2026-09-04 |
| D19 | Distribution/license | Open source on GitHub, releases + auto-updater | User's explicit choice | Interview | 2026-09-04 |
| D20 | Client.txt path detection | Auto-detect common install paths, manual override/browse fallback | Handles Steam vs. standalone install variance | Red Team | 2026-09-04 |
| D21 | Locale support | English-only parsing in v1, architected for easy locale extension later | Balances effort against community reach | Red Team | 2026-09-04 |
| D22 | Log lock/clear handling | Read continuously, surface an error on failure; no special recovery in v1 | Avoids over-engineering a rare edge case | Red Team | 2026-09-04 |
| D23 | Regex length limit handling | Filter by act/vendor availability first, then warn/truncate as a fallback | User's own design insight; keeps regex short by construction | Red Team | 2026-09-04 |
| D24 | Checklist state model | Reusable plan template + bought-progress that resets per new run | Matches replaying a build across multiple league starts | Red Team | 2026-09-04 |
| D25 | Update timing | Defer auto-update install during an active timed run; apply on next restart | Protects race timing integrity | Red Team | 2026-09-04 |
| D26 | Ruthless/SSF scope | Out of scope for v1, documented as a known limitation | Reduces v1 complexity | Red Team | 2026-09-04 |
| D27 | Local write safety | Atomic writes (temp file + rename) for local JSON | Standard practice; prevents corruption on crash | Red Team | 2026-09-04 |
| D28 | PoB import dependency risk | Accepted risk; format changes on the import source could break parsing | No alternative without owning the export format | Red Team | 2026-09-04 |

---

## Dependency Graph & Implementation Order

```
Core Shell (storage, module registry)
  ├─> Log Watcher ───────────────┐
  ├─> Vendor Selector ───────────┼─> Gem/Gear Regex Builders ─> Gambling Regex
  └─> Remote Data Fetch+Cache ───┘         ^
        │                                   │
        ├─> Time Tracking                   │
        └─> Gem Plan ────────────────────────┘

Core Shell ─> Auto-Updater / Release Packaging (parallel, any time after Core Shell)
```

1. **Core shell & storage** — Tauri init, module registry, local JSON store with atomic writes.
2. **Log watcher & vendor selector** — Client.txt auto-detection/override, tailing, zone/run parsing; shared vendor-picker UI component.
3. **Remote reference data** — fetch + local cache for quest rewards, vendor stock, item bases, gambling vendor list.
4. **Time tracking module** — splits, manual target pace entry, run auto-detection.
5. **Gem plan module** — manual checklist + PoB import, act/vendor availability tagging, per-run bought progress.
6. **Gem & gear regex builders** — act/vendor filtering, checklist UI, compiler, char-limit warn/truncate, copy-to-clipboard.
7. **Gambling regex & release scaffolding** — vendor-gated gambling tab; GitHub Actions, signed auto-updater with run-aware deferral.
