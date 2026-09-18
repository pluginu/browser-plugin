# Changelog

## 0.1.0 — 2026-09-16

- Established MV3 service worker, content script, popup, side panel and options.
- Added local versioned storage, migration and validation, serialized command writes.
- Added profiles, positive/negative rules, seven matching modes and conservative regex validation.
- Added DOM-preserving range highlights with live updates, cleanup and work limits.
- Added global/profile switches and highlight color preferences.
- Added provider-neutral connection and suggestion contracts without integrations.
- Added unit/DOM tests, reproducible build, architecture docs and manual browser checklist.
- Preserved original implementation brief in prompt history.

## Publication preparation — 2026-09-17

- Saved Prompt 002 and publication review notes in `docs/prompts/002-push-to-github.md`.
- Verified the existing implementation: 12 tests, syntax checks and production build passed; no application changes were required.
- Documented missing workflow files, pending native browser validation and unavailable GitHub API authentication; publication uses the existing SSH configuration on `main`.

## Feature documentation — 2026-09-17

- Adapted the supplied Spot a Dog guide into Plug Inu feature requirements and linked it from the README and current feature guide.
- Documented target profile editing, keyword colors/criteria, reviewed AI discovery, local counts, Auto Scroll/pagination, visit and popup histories, location filtering and ad skipping.
- Distinguished implemented capabilities from planned work, removed inherited implementation claims, and recorded missing match-type/import/visit specifications. Retained Plug Inu's current highlight treatment, matching safety limits, 180 ms debounce and credential boundary.
- Included the pending prompt-processing documentation changes and preserved the existing removal of the historical publication prompt file. Its original contents remain in Git history.
- No application code, dependencies or permissions changed.

## 2026-09-17 — Domain skills

Added exact-domain skill loading, bundled X instructions, locally saved overrides, action merging/disablement, JSON editing and Markdown export across extension interfaces. Storage version 2 preserves existing settings and adds local domain definitions. Actions are descriptive; automatic execution is not implemented.

## 2026-09-17 — Skills management screen

Added a dedicated Manage skills page, linked from popup, side panel and Settings. Includes persistent activation, search, load/unload, new-skill templates, review-before-save JSON/Markdown import, JSON export, local reset and deletion. Inactive skills cannot load. Storage version 3 preserves earlier local definitions and defaults existing skills to active.

## Documentation and publication review — 2026-09-17

Updated feature status, setup instructions, storage migration details and the native Chrome checklist to cover domain skills. Verified 20 automated tests, syntax checks and the production build before publication; native Chrome installation, rendering and downloads remain manual.

## 2026-09-17 — Plug Inu identity and temporary icon

- Added temporary lowercase p icons for the extension, pinned toolbar and extension-page favicons.
- Standardized “The most connected dog online” across the interface and current product documentation. Introduced copy about learning the tools, building connections and becoming self-reliant.
- Replaced inherited Spot/Skip the noise copy with Plug Inu wording and Highlight/Caution rule labels. Historical request records are preserved.


## 2026-09-17 — Executable X domain skill

Ported the supplied X Profile Scout 1.3.0 runtime into a portable skill with 14 action contracts and LLM/script routing. Added packaged script controls, isolated X storage/messages, exact-host/sender validation, deactivation stopping, explicit tab selection, portable ZIP/contract registry and an integrity-checking bot download CLI. Retained original simulated-page regression tests and added integration coverage. No live X actions or remote registry deployment were performed.
