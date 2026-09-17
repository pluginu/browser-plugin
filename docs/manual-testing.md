# Manual Chrome verification

Automated DOM tests use jsdom and a Highlight registry test double. They do not validate actual browser painting, extension installation, native panel behavior or website compatibility.

1. Build; load `dist/` unpacked in Chrome 120+. Confirm no extension errors and inspect the service worker console.
2. Open popup. Add a Research profile with positive exact word `dog` and negative contains `noise`. Open the side panel with its button; check Settings opens an options tab.
3. Run `python3 -m http.server 8080 --directory public` and visit `http://localhost:8080/test-page.html`.
4. Confirm yellow positive / red underlined negative ranges; negative wins overlaps. Verify there are no wrapper elements around matches.
5. Toggle global and profile switches in either interface; confirm immediate removal/restoration without refresh and consistent state across interfaces.
6. Add/delete rules while the page is open. Verify changes. Add phrases, prefixes, suffixes, word lengths, case-sensitive terms and regex `d[oa]g`. Confirm invalid regex displays an error.
7. Click Add content on the test page; check new matches. Type in the textarea and editable region; ensure no highlighting interferes with input. Confirm hidden content is skipped.
8. Change highlight colors in Settings. Confirm colors update. Reload browser/extension and verify persistence (refresh website after extension reload).
9. Test news/search/feed sites for scrolling, layout, text selection, editable controls and dynamic updates. Try a huge document; expect capped coverage rather than total coverage.
10. Confirm internal Chrome pages and extension-store pages are unaffected. Restrict website access in Chrome extension settings and confirm that restriction is honored.

Native load and visual QA remain pending until this checklist is run in an actual Chromium extension session.
