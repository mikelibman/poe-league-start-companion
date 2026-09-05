#!/usr/bin/env bash
# Creates GitHub Issues for the PoE League Start Companion implementation plan.
# Run from inside your repo, after `gh auth login` and `gh repo set-default`.
# Requires labels to exist first (created below) — remove --label flags if you'd rather skip that.

set -e

# Labels (safe to re-run; gh label create fails silently if it already exists)
gh label create "core" --color "00d4aa" --description "Core shell, storage, registry" 2>/dev/null || true
gh label create "module:timer" --color "60a5fa" --description "Time tracking module" 2>/dev/null || true
gh label create "module:gem-plan" --color "60a5fa" --description "Gem planning module" 2>/dev/null || true
gh label create "module:regex" --color "60a5fa" --description "Regex builder module" 2>/dev/null || true
gh label create "release" --color "f59e0b" --description "Packaging, updater, distribution" 2>/dev/null || true

gh issue create \
  --title "1. Core shell & storage" \
  --label "core" \
  --body "Tauri init, module registry, local JSON store with atomic writes (temp file + rename).

Depends on: nothing (first step).
Spec ref: spec-poe-league-start.md — Tech Stack & Architecture, Data Model & Storage."

gh issue create \
  --title "2. Log watcher & vendor selector" \
  --label "core" \
  --body "Client.txt auto-detection (Steam/standalone paths) with manual browse/override fallback. Continuous tailing, zone/run parsing (English client only, locale-ready structure). Shared vendor-picker UI component used by all regex tools.

Depends on: Core shell & storage.
Spec ref: spec-poe-league-start.md — Feature: Time Tracking, Feature: Regex Builder."

gh issue create \
  --title "3. Remote reference data fetch + cache" \
  --label "core" \
  --body "Fetch quest rewards, vendor stock, item bases, and gambling vendor list from hosted JSON at runtime. Cache last successful fetch locally as offline fallback.

Depends on: Core shell & storage.
Spec ref: spec-poe-league-start.md — Data Model & Storage."

gh issue create \
  --title "4. Time tracking module" \
  --label "module:timer" \
  --body "Live splits per zone/act/total. Manual target-pace entry per zone/act. Run auto-detection: first Act 1 entry + unseen character/league combo this session.

Depends on: Log watcher & vendor selector.
Spec ref: spec-poe-league-start.md — Feature: Time Tracking."

gh issue create \
  --title "5. Gem plan module" \
  --label "module:gem-plan" \
  --body "Manual gem checklist builder + Path of Building import. Tag each gem with source (quest reward / vendor + act range). Plan is a reusable template; 'bought' progress resets per new run.

Depends on: Core shell & storage, Remote reference data.
Spec ref: spec-poe-league-start.md — Feature: Gem Planning."

gh issue create \
  --title "6. Gem & gear regex builders" \
  --label "module:regex" \
  --body "Shared vendor dropdown, act/vendor-filtered candidate lists, checklist UI, regex compiler, ~250-char limit counter with warn/truncate fallback, custom text entry, export/import.

Depends on: Gem plan module, Vendor selector, Remote reference data.
Spec ref: spec-poe-league-start.md — Feature: Regex Builder."

gh issue create \
  --title "7. Gambling regex & release scaffolding" \
  --label "module:regex,release" \
  --body "Gambling regex tab, enabled only when a gambling-capable vendor is selected. GitHub Actions build/release pipeline, signed Tauri auto-updater that defers install/restart during an active timed run.

Depends on: Gem & gear regex builders, Core shell & storage.
Spec ref: spec-poe-league-start.md — Feature: Regex Builder, Platform & Distribution."

echo "Done. Created 7 issues."
