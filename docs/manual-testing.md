# Manual Chrome verification

Automated DOM tests use jsdom and a Highlight registry test double. They do not validate actual browser painting, extension installation, native panel behavior or website compatibility.

1. Build; load `dist/` unpacked in Chrome 120+. Confirm no extension errors and inspect the service worker console.
2. Pin the extension and confirm the temporary lowercase **p** icon appears in the toolbar. Open Settings and Skills in tabs, pin the tabs and confirm the same favicon appears. Check “The most connected dog online” and the learning/self-reliance copy in popup, side panel, Settings and Skills. Open popup. Add a Research profile with positive exact word `dog` and negative contains `noise`. Open the side panel with its button; check Settings opens an options tab.
3. Run `python3 -m http.server 8080 --directory public` and visit `http://localhost:8080/test-page.html`.
4. Confirm yellow positive / red underlined negative ranges; negative wins overlaps. Verify there are no wrapper elements around matches.
5. Toggle global and profile switches in either interface; confirm immediate removal/restoration without refresh and consistent state across interfaces.
6. Add/delete rules while the page is open. Verify changes. Add phrases, prefixes, suffixes, word lengths, case-sensitive terms and regex `d[oa]g`. Confirm invalid regex displays an error.
7. Click Add content on the test page; check new matches. Type in the textarea and editable region; ensure no highlighting interferes with input. Confirm hidden content is skipped.
8. Change highlight colors in Settings. Confirm colors update. Reload browser/extension and verify persistence (refresh website after extension reload).
9. Test news/search/feed sites for scrolling, layout, text selection, editable controls and dynamic updates. Try a huge document; expect capped coverage rather than total coverage.
10. Confirm internal Chrome pages and extension-store pages are unaffected. Restrict website access in Chrome extension settings and confirm that restriction is honored.

11. Open **Manage skills** from each interface. Follow the [domain skills manual checks](domain-skills.md#manual-verification) for activation persistence, loading, editing, validation, search, import/export, reset and deletion. Confirm changing highlighting preferences leaves a loaded skill preview intact.

Native load and visual QA remain pending until this checklist is run in an actual Chromium extension session.


## X domain scripts

1. Rebuild and reload the extension; accept its new scripting, unlimited local storage and exact x.com host permissions. Open English X Home and Manage skills.
2. Load X, load scan-profiles in script mode and open controls. Verify the X tab selector. Turn off automatic following, Start, and verify focus returns to that tab. Compare a few records against Joined → About this account. Confirm highlighting still works.
3. Stop, reload and resume; verify saved records/attempts/skip state survive. Check tab/window focus and draft pausing. Follow behavior requires a separately authorized live test; do not enable it just to validate collection.
4. Enable hover and saved text independently. Verify author vs quoted author, unknown fields and current filter matches. Manually send a test post only if authorized; confirm the save offer appears after success, save is optional, and reuse never sends. Check cursor insertion/fallback and library persistence after profile reset.
5. Test records search/pagination, deferred view, all-record CSV/JSON export and stopped-only import/retry/reset using disposable records. Transfer an old Scout JSON backup if wanted; data is not migrated from its extension ID automatically.
6. Deactivate X while it is running. Verify scan/widgets stop, other highlighting stays enabled, data remains and Start is rejected. Reactivate and explicitly re-enable the desired features.
7. Download the script ZIP and verify extraction contains x-com/SKILL.md and scripts/manifest.json. In a separate test Chrome profile, load scripts/ as an unpacked extension and confirm its active-tab popup workflow. This creates a separate data store.
