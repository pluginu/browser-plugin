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
