# Plug Inu feature requirements

**The most connected dog online. Learn the tools. Build your own connections.**

Plug Inu shares his tools and know-how to help people become connected, self-reliant individuals. His browser toolkit starts with highlighting words and phrases you choose and loading site instructions you control. This guide describes Plug Inu's browser extension and future connection architecture.

This is the **target product experience**, not a list of shipped functionality. The [current features and status](features.md) describe the implemented foundation. Controls and behaviors below are requirements unless that status table marks them available. This documentation update does not implement them. The original supplied brief is preserved in [prompt history](../prompts/history.md).

## Product controls and profiles

- **Plug Inu On/Off:** pause scanning and remove highlights without deleting profiles or changing individual profile switches. Resume with saved configuration. Closing the popup or panel must not stop scanning.
- **Popup and side panel:** offer the same profile, keyword, AI review and settings interface. A saved **Use sidebar** preference should control subsequent toolbar openings across tabs and browser sessions without changing scanning state.
- **Independent profiles:** organize topics, subjects, categories and interests into named reusable profiles. Create, rename, delete and independently enable each profile. Only enabled profiles scan while Plug Inu is on. Configuration remains editable while scanning is off.
- **Keyword rows:** add, activate/deactivate, edit, cancel and remove individual positive or negative keywords. Existing-profile **Save keyword** persists only that row; activity changes and confirmed removals save immediately. Profile Save/Cancel affects name and enabled state while preserving saved keywords and open keyword drafts. New-profile keywords save together with the profile. Failed writes preserve drafts for retry. Blank or duplicate terms show inline errors; missing activity flags in future migrations default to active.
- **Profile navigation:** a Profile dropdown shows saved details; Search keywords filters both lists immediately. Switching profiles resets search and confirms discarding changed drafts. Profile backups provides import/export; backup validation and version migration must be specified before implementation.
- **Word list tabs:** Positive Words and Negative Words switch lists in place and retain unsaved row edits. Rows use normal scrolling. Support arrow keys, Home/End and visible keyboard focus.

For example, an **AI Infrastructure** profile could highlight `GPU`, `inference` and `data center`, and mark `gaming` and `graphics settings` as negative terms. Other profiles can remain enabled independently.

## Matching and highlight colors

Positive and negative words or multi-word phrases highlight independently; a negative match does not require a nearby positive. Negative ranges take precedence where both match the same characters, regardless of chosen color.

Plug Inu currently uses seven modes: exact word, phrase, starts with, ends with, contains, word length and restricted advanced regex. Preserve their [documented semantics and safety limits](architecture.md). The source brief refers to 17 criteria but does not supply their definitions. Expanded word/phrase operations, length criteria and structural recognition remain a specification gap: define the full table, examples, validation, boundaries, whitespace and case rules before adding modes. Do not present 17 types as available.

Each keyword should own its criterion and, eventually, its own color. Offer Yellow, Red, Green, Blue, Purple, Orange and custom six-digit hex colors. Outline the selected preset and show its name and hex value. Saving a keyword should apply its color independently, with persistence across reloads and backups; migrated keywords retain group defaults. Choose black or white foreground text for contrast.

Plug Inu's current defaults are yellow positive highlights (`#ffe08a`) and red negative highlights (`#ff9f9f`), with negative underlining. Keep this established treatment; the source brief's positive-underlining default is not adopted. Current colors are global per polarity, not per keyword.

## Connections and reviewed AI discovery

Keep AI discovery behind Plug Inu's provider-neutral connection boundary so profiles and highlighting work without an account or API key. Future connections may serve websites, APIs, applications and local tools; this guide does not require speculative integrations beyond the described discovery providers.

For optional OpenAI and Anthropic connections, accept user-entered seeds and return synonyms, variations, related concepts and terminology. Each provider should remember its chosen model, support a curated model selector and permit a custom model ID. Model availability and provider contracts must be checked when implementing adapters.

Users choose a destination profile and positive/negative list, review candidates individually, select useful terms, dismiss individual or all unwanted candidates, and explicitly choose **Add selected**. Generation alone never changes profiles. Adding while a profile or Plug Inu is off must not enable scanning.

Settings should support separate credentials per provider. A blank field retains an existing credential; **Remove API key** deletes it. Credential storage requires a security design before implementation; the source brief's unencrypted local-key storage is not adopted by default. Do not place secrets in ordinary connection configuration, backups or content-script state. Plug Inu currently has no credential UI, authentication or live provider adapters.

## Privacy and local data

Scanning, matching, highlighting, keyword counts, URL histories and author checks must run locally. Plug Inu must not send browsing URLs, page content or derived counts/fingerprints to its developer, AI providers or other external parties. Local storage is not cloud synchronization.

Optional discovery may send only seeds the user explicitly enters and submits, along with the chosen provider's configuration and authentication. Never populate seeds from scanned pages. Text manually pasted and submitted is sent to that provider. The current extension makes no external requests; this paragraph defines the boundary for future AI functionality, not an existing integration.

Activating a website's pagination or ad controls can trigger that site's ordinary requests. This is distinct from exporting browsing information through Plug Inu. Keep future connection permissions and data flows explicit and isolated. See the current [permissions and privacy](../README.md#permissions-and-privacy) and [architecture](architecture.md); no completed privacy audit of these future features is claimed.

## Live keyword counts

**Track keyword occurrences** is a persistent global preference, initially off. Display counts beside saved keywords; leave profile editing to return to live counts. Tracking pauses with global highlighting. Disabled profiles and inactive keywords add no observations but retain history. Unsupported pages, pending analysis or failed storage show **Counts unavailable**.

Count valid matches before resolving highlight overlap, separately for each profile and positive/negative keyword. Use the same matching semantics as highlighting. Intended eligibility covers rendered DOM text, including below the fold, excluding scripts, styles, forms, code/preformatted text, editable/hidden content, non-text media, shadow DOM and frames. Phrases cannot cross text nodes. This tighter rendered-visibility policy needs implementation; current eligibility and scan caps remain documented in [architecture](architecture.md).

- **Repeated:** cumulative observed matches for a keyword at the exact page URL.
- **Unique in context:** distinct complete matching text-node contents after lowercasing, trimming and collapsing whitespace, with punctuation retained. This normalization deduplicates contexts; it does not change matching semantics.

For a case-insensitive `GPU` rule, nodes `GPU gpu` and ` GPU   GPU ` give four repeated matches and one unique context. Adding `GPU!` gives five and two. Inline markup can split contexts; punctuation differences create distinct contexts. This is deterministic text deduplication, not semantic AI analysis.

Cache unchanged-node contributions. Each normalized context retains its highest simultaneous observed match multiplicity across scans; sum those maxima for repeated totals. Reprocessing is idempotent. Hidden or removed content does not erase history. New contexts add matches, additional simultaneous copies increase multiplicity, and text edits create historical contexts. Identical contexts in disjoint batches are indistinguishable from reprocessing, so retain the maximum rather than inventing additional appearances.

DOM insertion, lazy loading, resizing and disclosure changes should refresh observations. Scrolling alone does not require rescanning already included text. Keep the existing 180 ms mutation debounce until measurement justifies changing it; the source project's 150 ms value is not a Plug Inu implementation fact. Reconciliation still traverses eligible content and must respect scan limits; stylesheet-only visibility changes need a defined refresh strategy.

Select history by exact URL, including query and fragment, on regular and client-side navigation. Returning or reloading restores history; retained page content is observed for the new URL. UI search and profile selection do not filter stored observations. Counts never enter backups or AI requests.

An open interface should read the active tab snapshot every 500 ms while tracking and highlighting are enabled, without triggering scans. Clear the display before querying a newly active tab. Disabling tracking clears active caches/listeners/polling but retains history and any highlighting observer still needed. Closing interfaces stops polling; reinjection disposes previous instances; global pause disconnects scanning.

Persist through serialized worker writes in a proposed separate `plugInu.counts.v1.<SHA-256 URL>` namespace. Hash normalized contexts in the worker and store maximum multiplicities per keyword identity (profile, polarity, text and criterion). Do not persist raw page text or URLs in count history; fingerprints are not encryption. Merge concurrent/out-of-order observations by context. Display only acknowledged totals; failed writes preserve data and retry on subsequent analysis. Existing installations begin with empty count history without altering profiles.

The source retention requirement is no automatic eviction: history lasts until extension data is cleared or uninstalled. Document quota limits and unavailable-count errors before shipping. Counts cannot reconstruct unseen content, source deletions or discarded observations.

## Auto Scroll and automatic pagination

Auto Scroll is optional, off by default and scoped to the active tab. New tabs start off. Offer 30–600 pixels per second, default 120, plus **Pause** and **Resume** for scrolling and pagination together. Controls are independent of highlighting and occurrence tracking, except keyword detection requires highlighting.

**Pause on positive keyword** is a separate off-by-default per-tab setting. A post containing a rendered positive match pauses when its top reaches the **eyeball level**, a global preference from 10% to 90% of viewport height, default 50%. Save changes across restarts and apply them to open pages. Recalculate geometry after resize/layout shifts. Pause immediately if a matching post already spans the level; skip posts entirely above it. If its top cannot reach the level, pause at the reachable document end.

**Auto-pause colors** filters positive pauses by exact normalized six-digit hex colors. Initially select all six presets; custom colors require explicit addition. Preserve an empty selection, which disables keyword-triggered pauses but retains navigation/end safeguards. Unselected colors still highlight. Changes save automatically, propagate across tabs and roll back visibly after failed writes. Eyeball and AI settings saves must not overwrite the palette. Legacy positives use their migrated default color. Color filtering does not affect slowdown or manual Resume.

**Slow down on positive keyword** is separately off by default per tab. While a matching post spans the reading level, use one-quarter of the selected speed, then restore it without changing the saved speed. Slowdown takes precedence if both modes are checked; retain both selections. Manual controls and navigation/end safeguards remain active.

Detect semantic articles, feed items, sections and standalone text blocks; internal layout divs must not fragment posts. A positive match anywhere in the post can qualify, even below the viewport. Negative-only matches and positives fully covered by negatives do not qualify. Resume skips the consumed post for automatic pausing; slowdown still follows current content.

At the bottom, wait at least four seconds without content changes before following a recognized next control; infinite-scroll additions reset the wait. Recognize `rel="next"`, accessible “Next page” labels and Next/Older/arrows inside pagination regions. Bring a pager above a long footer into view after consuming the document. Activate only rendered, enabled, unobstructed eligible controls in the viewport. Exclude downloads, new-tab, fragment-only, same-page and cross-origin links.

Successful authorized next-page navigation continues scrolling. For AJAX pagination, wait for settled content; appended content retains position, replacement content of equal or smaller height starts at the top. Pause preserves speed and browser position; Resume uses the actual current position, including manual adjustments or Back restoration. User navigation, history actions, reloads and unauthorized new documents pause. A paused detail-page/Back round trip remains paused.

Pause after twelve quiet seconds at the bottom without a next control or new content; cancel a pending next action after fifteen seconds. Busy indicators defer end detection. Resume retries from the current position. Run one loop and one pending action; repeated targets/content and a 200-action session limit stop loops. Switching off/on starts a fresh traversal.

Propose **Alt+Shift+R** (**Option+Shift+R** on Mac) as a native Resume shortcut, including while the UI is closed. It must use the same guarded action as the button, never toggle Pause, and do nothing when already running, off or unsupported. Display the actual assigned shortcut and direct users to `chrome://extensions/shortcuts` if unassigned or conflicting. No shortcut is registered in the current extension.

Tab state should use trusted session storage, survive worker suspension, and reset with the browser session or extension reload/disable/update. Clean closed-tab records and prune stale IDs on worker startup. Do not persist Y coordinates, runtime toggles or traversal state in local preferences or backups. Persist only global reading-level and color preferences.

Limits: document scrolling only; nested scrollers, shadow DOM, frames, virtualized feeds and unusual pagination can require manual control. Late-loading sites may need Resume. Unexpected redirects pause. Continuous mutation/busy state can defer completion; background scheduling can suspend progress.

### Proposed navigation implementation contract

These interfaces and paths are design proposals; they do not exist in the current foundation.

- Isolate pure transitions in a future `src/navigation/state.js`. Records include enabled, paused, speed, pauseAfterPositive, slowOnPositive, revision, documentId, URL, pending target/expiry, visited targets/content signatures and status reason.
- Trust `scroll.get`, `scroll.set` and `scroll.resume` only from extension UI with explicit tab IDs. Accept content-side hello/next/progress/pause only from this extension's active top-frame HTTP(S) document. Derive tab/document identity from Chrome's sender. Discard obsolete active-tab UI replies.
- Keep rendered ranges, colors, matching blocks and consumed DOM references inside the page's highlighter/navigation boundary. Custom colors never change polarity. Slowdown receives all positives; pausing receives the color-filtered set.
- Validate and serialize navigation settings via the existing storage repository boundary. Expose only safe settings in content-script projections; exclude credentials. Broadcast updates without resuming paused scrolling.
- Register the native resume command in the worker and guard enabled/paused transitions inside serialized tab mutations. Avoid page keyboard listeners.
- Reject stale document initialization and revisions. Store next authorization before activation, scoped to target and a fifteen-second deadline. History/reload cannot consume it as continuation. Same-document Pause cancels pending authorization.
- Address content updates to the correct tab/document and tag UI events with tab IDs. Cancel frames/observers on pause, disable, pagehide and disposal; reread on pageshow; dispose on reinjection.
- Add session support behind `src/storage/repository.js`, using a proposed `plugInu.scroll.v1.<tabId>` namespace. Worker wake must not clear live tab state. Do not import source-project storage helpers or namespaces as if they already exist here.

## URL visits and popup history

**Track URL visits** is optional, initially off and independent of highlighting. Count subsequent top-level HTTP/HTTPS visits. **Per session** and **All time** retain separate local histories. Show the current URL count and searchable history in popup and side panel. Disabling stops recording but preserves history; confirmed **Clear URL history** clears both modes. URLs and counts never enter AI requests or backups.

Also track browser popup/opener-tab navigations and detected visible website overlays, separately from Plug Inu's own toolbar popup. Record appearance counts and First seen/Seen before status. Prefer item identifiers or activating/destination URLs for identity; use the selected retention mode and clear alongside visits. Overlay detection is best effort.

Before implementation, define what constitutes a visit (including reloads, fragments, redirects and history restoration), overlay reappearance/deduplication, retention quotas and supported markup. The source brief references separate documents for these semantics but does not supply them; no exact behavior or storage limit is claimed here.

## Autoplay location checkbot

An optional local author-location check should filter positive keyword/color pauses using checked `accountBasedIn` records imported from version-1 X Profile Scout JSON and a user-selected target location. Unknown or nonmatching authors keep scrolling. This filters automatic pauses, not general highlighting.

Before implementation, specify the import schema, replacement and error behavior, supported author markup, location normalization and privacy limits. Imported records are user-supplied metadata, not verified physical location. No live account lookup or page-content upload is required. The foundation has no importer or author detector.

## Automatic ad skipping

Provide an off-by-default Settings toggle saved across tabs and restarts, independent of matching and Auto Scroll. For generic controls, require a prominent playing main video and nearby relevant player controls. Match ad-skip phrases and supported custom controls; exclude unrelated skips and countdowns. Activate visible, enabled, unobstructed controls once per observed clickable appearance. Observe DOM changes and periodically check dynamic controls; disabling cancels pending work.

Potential player adapters include MGP ad-roll controls that honor active-ad/skippable state and require mouseup activation, and overlay ads on a paused main player that require a ready skip control. Accept “Skip This Video” only on the identified ready ad control, excluding previews and unrelated navigation. Generic controls use click activation. Player behavior, labels and fixtures must be verified before shipping; no adapters or website compatibility are currently implemented or tested.

## Delivery and verification

Implement in dependency order: profile/rule editing and backups; per-keyword colors and expanded criteria; reviewed AI connections and credential handling; counting/history; navigation and its dependent author filters; isolated player adapters. Each change needs its own scope, storage migration decisions, tests and native-browser validation. Keep the [current status](features.md), [changelog](changelog.md) and [manual checklist](manual-testing.md) accurate as features ship.
