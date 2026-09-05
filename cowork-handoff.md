# Cowork Handoff — PoE League Start Companion

## Files to bring into Cowork
1. `spec-poe-league-start.md` — full spec, source of truth for scope and decisions
2. `create-github-issues.sh` — creates the 7 implementation-order issues in your repo
3. `preview-poe-league-start.html` — visual reference, optional

## Suggested first prompt for Cowork

```
I'm building a Windows desktop app called "PoE League Start Companion" —
a modular tool for Path of Exile league starts: live zone/act/total time
splits vs a target pace, a gem-buying plan (manual + Path of Building
import), and vendor-aware regex builders for gems, gear, and gambling.

Attached: spec-poe-league-start.md (full spec, follow it as source of
truth) and create-github-issues.sh (creates GitHub issues in dependency
order).

Please:
1. Set up a new git repo with a Tauri + React/TypeScript scaffold, matching
   the "Tech Stack & Architecture" section of the spec.
2. Run create-github-issues.sh against the repo (after I confirm gh auth
   is set up) to create the 7 implementation issues.
3. Start on Issue 1 (Core shell & storage): Tauri init, module registry,
   local JSON store with atomic writes.

Hard constraint from the spec: never read PoE's game memory — log file
parsing (Client.txt) and manual user input are the only data sources.
This isn't negotiable even if it'd simplify a later feature.
```

## Non-negotiable constraints (repeat if Cowork drifts)
- No game-memory reading, ever — ToS violation, ban risk (spec: Constraints, D8).
- Windows only, v1 (D18).
- Personal data in local JSON, atomic writes (D17, D27).
- Reference data (quest rewards, vendor stock, item bases) fetched from hosted JSON at runtime, not bundled (D15).
- Auto-updates defer install until app restart — never mid-run (D25).

## Build order (from the spec's Dependency Graph)
Core shell → Log watcher + vendor selector → Remote data fetch/cache → Time tracking + Gem plan → Gem/gear regex → Gambling regex + release scaffolding.
