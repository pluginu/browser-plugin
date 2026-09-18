# Implementation prompt history

Current procedure: follow [Prompt processing flow](../docs/prompt-processing-flow.md) for every user prompt. The entries below are historical records; their original workflow instructions do not replace the current procedure.

## 2026-09-16 — Initial foundation

User context: “this is a new project”

Original attached brief follows verbatim.

# Plug Inu Browser Plugin

You are building the initial version of the **Plug Inu browser plugin**.

Repository:

`pluginu/browser-plugin`

## Product Identity

**Name:** Plug Inu

**Core idea:** Plug Inu is the most connected dog on the internet.

This is a **browser plugin**, not a literal electrical-plug product. The word "Plug" represents being connected.

The central concept is:

**DOG → CONNECTED → BROWSER**

Plug Inu connects the user to the things that matter while browsing.

The browser plugin should eventually become the main browser-side component of a larger Plug Inu ecosystem that can connect users, websites, tools, services, data, and other applications.

Core messaging:

**Everything you need to get connected.**

Another useful positioning statement:

**The most connected dog on the internet.**

## Mascot

The mascot is a dog called **Plug Inu**.

The original visual concept experimented with a dog combined with an electrical plug. That was useful for establishing the "plugged in" idea, but the brand has evolved.

Do **not** treat Plug Inu primarily as a literal electrical plug.

Plug Inu should instead look like a dog that is extremely connected.

Think of him almost like a well-connected boss. He knows everyone, knows what's happening, and has connections everywhere.

The connection metaphor can appear visually through things such as:

* browser connections
* extension/plugin symbols
* networks
* cables
* connected devices
* services
* applications
* communication
* the web

A useful visual concept is a collar, leash, cable, or other connection flowing from the dog into a browser/plugin symbol.

The important idea is:

**The dog is connected.**

Not:

**The dog is an electrical plug.**

## Origin of the Product

Plug Inu evolves from the original **Spot a Dog / Spot** browser-plugin concept.

The original problem was simple:

People spend too much time reading pages, search results, posts, feeds, and captions trying to find the small amount of information they actually care about.

The original plugin solved this by allowing users to specify what they were looking for and then highlighting those words, phrases, subjects, or concepts directly on webpages.

Instead of searching and then manually reading everything:

**Spot what matters. Skip the noise.**

That capability should remain part of the DNA of Plug Inu.

Plug Inu expands the concept from simply "spotting" information into a broader browser connection platform.

## Initial Product Philosophy

Keep the first implementation small.

Do not try to build the entire future Plug Inu ecosystem at once.

The initial repository should establish a clean browser-plugin foundation that can grow without requiring a rewrite.

Prefer:

* simple components
* clear responsibilities
* minimal dependencies
* readable code
* modular architecture
* testable functionality
* straightforward browser APIs
* documented interfaces

Avoid unnecessary frameworks, abstraction layers, infrastructure, or dependencies.

Do not overengineer.

## Browser Plugin

Use modern browser-extension architecture.

Chrome/Chromium should be the initial target.

Use **Manifest V3**.

The architecture should account for:

* manifest
* background/service worker
* content scripts
* popup
* side panel
* options/settings
* browser storage
* page scanning
* text matching
* highlighting
* profiles
* connection management

Structure the project so additional browsers can potentially be supported later without rewriting the core functionality.

## Spotting / Highlighting Engine

The original Spot capability should be implemented as a core module.

Users should be able to create multiple profiles representing things they want to spot.

Example conceptual profiles:

`Crypto`

`People`

`Companies`

`News`

`Research`

A profile contains rules describing what the user wants or does not want to see.

Each profile can be independently enabled or disabled.

Support:

### Positive keywords

Highlight things the user wants to find.

### Negative keywords

Identify things the user specifically does not want.

Negative matches should have a clearly different visual treatment from positive matches.

The original design used red for negative matches.

## Matching

Design the matching engine so it can support:

* exact words
* phrases
* starts with
* ends with
* contains
* character length
* regular expressions

Regular expressions should remain an advanced feature.

The normal UI should stay understandable to someone who does not know regex.

## Page Processing

The content script should scan webpage text without unnecessarily modifying the site's structure.

Important requirements:

* avoid breaking page layouts
* avoid changing form inputs
* avoid processing script/style elements
* avoid recursively highlighting already processed content
* handle dynamically loaded content
* minimize performance impact
* allow highlights to be removed cleanly
* allow profiles/rules to update without requiring a page reload whenever practical

Modern sites frequently update their DOM dynamically, so design page observation accordingly.

## User Controls

Users need simple global controls.

At minimum account for:

* Plug Inu ON/OFF
* profile ON/OFF
* positive rules
* negative rules
* highlight preferences
* popup interface
* side-panel interface
* settings/options

The user should be able to quickly understand whether Plug Inu is currently connected and active.

## Side Panel

Plug Inu should support being used as a browser side panel.

The side panel will eventually become particularly important because Plug Inu is intended to do more than highlighting.

Architect it as a first-class interface rather than an afterthought.

## Connection Architecture

Create a clean abstraction for future **connections**.

A connection represents something Plug Inu can communicate with or use.

Future connections could include:

* websites
* APIs
* AI services
* applications
* local tools
* Plug Inu services
* user-defined integrations

Do not implement speculative integrations yet.

Create only enough architecture that adding connections later will not require restructuring the entire plugin.

## AI

The architecture should leave room for AI-assisted functionality.

The earlier Spot concept included AI-assisted keyword discovery where a user could provide a subject and receive suggested related words or phrases.

Suggestions must be presented to the user for approval rather than silently becoming rules.

Keep AI functionality isolated behind an interface so the rest of the browser plugin does not depend on one AI provider.

Never hard-code API keys.

## Storage

Create a versioned storage model.

Store things such as:

* plugin settings
* profiles
* profile rules
* enabled state
* UI preferences
* connection configuration

Design migrations from the beginning so storage structures can evolve.

Do not store secrets in ordinary extension storage without considering the security implications.

## Repository Structure

Use a structure similar to:

```text
browser-plugin/
├── src/
│   ├── background/
│   ├── content/
│   ├── popup/
│   ├── sidepanel/
│   ├── options/
│   ├── highlighting/
│   ├── matching/
│   ├── profiles/
│   ├── connections/
│   ├── storage/
│   ├── shared/
│   └── types/
├── tests/
├── docs/
├── prompts/
├── public/
├── manifest.json
├── package.json
└── README.md
```

Modify this structure when technically justified, but preserve clear separation of responsibilities.

## Larger Plug Inu Ecosystem

Do not put every future Plug Inu component into this repository.

The intended ecosystem can eventually contain separate repositories such as:

```text
pluginu/
├── browser-plugin
├── website
├── shared-sdk
├── cli
└── docs
```

A repository should represent something that can reasonably be developed, versioned, released, deployed, or reused independently.

Do not create separate repositories for internal browser-plugin components such as popup, highlighting, storage, or content scripts.

Those belong in `browser-plugin`.

## Development Rules

Before implementing a feature:

1. Understand its dependencies.
2. Identify the smallest useful implementation.
3. Implement lower-level dependencies first.
4. Add unit tests.
5. Run existing tests.
6. Verify the build.
7. Update relevant documentation.

Do not rewrite working code merely to make it stylistically different.

Do not add dependencies when a small amount of straightforward code can accomplish the same thing.

Do not introduce large architectural changes without documenting why they are necessary.

## Testing

Unit tests are required.

Prioritize tests around:

* matching
* positive rules
* negative rules
* regex
* profile behavior
* storage
* migrations
* highlighting
* connection interfaces

Browser behavior that cannot reasonably be covered by unit tests should be documented for manual testing.

The user will perform live browser testing and provide feedback.

## Documentation

Maintain documentation as development progresses.

At minimum maintain:

`README.md`

`docs/architecture.md`

`docs/features.md`

`docs/changelog.md`

Document important architectural decisions.

## Prompt History

Create:

`prompts/`

Maintain a prompt-history document inside it.

Whenever a substantial implementation prompt is provided, append the prompt to the prompt history so development instructions remain reproducible.

Do not overwrite previous prompts.

## Git Workflow

Before making changes, inspect:

* current branch
* git status
* repository structure
* existing documentation
* package configuration
* existing tests

Do not assume the repository is empty.

Preserve existing working functionality.

After completing a logical unit of work:

1. Run unit tests.
2. Run lint/type checking if configured.
3. Run the production build.
4. Review `git diff`.
5. Update documentation and changelog.
6. Report exactly what changed.
7. Report tests performed and their results.
8. Report anything that still requires manual browser testing.

Do not claim something works unless it was actually tested at the appropriate level.

## First Task

Inspect the repository and establish the initial Plug Inu browser-plugin foundation.

If the repository is empty or nearly empty:

1. Create the project structure.
2. Configure Manifest V3.
3. Establish the service worker.
4. Establish the content-script system.
5. Create the popup foundation.
6. Create the side-panel foundation.
7. Create settings/options foundation.
8. Implement versioned storage.
9. Implement the profile data model.
10. Implement the initial matching engine.
11. Implement positive and negative highlighting.
12. Add global and profile enable/disable controls.
13. Add unit tests.
14. Create the initial documentation.
15. Create prompt history.
16. Verify that the plugin builds and can be loaded as an unpacked Chromium extension.

Keep the UI simple for this first pass.

The objective is not to make Plug Inu feature-complete.

The objective is to create a **small, working, tested foundation for the most connected dog on the internet.**

## 2026-09-17 — Publish current implementation

The publication prompt and its implementation/review notes were saved in `docs/prompts/002-push-to-github.md`. That file is no longer present in the working tree; its historical contents remain available in Git history.

## 2026-09-17 — Save every prompt before starting work

### User prompt (verbatim)

> if there is any docs about prompts being saved  and being use in githhub commits o nwhat was asked by user in comments change that to reflect a processthatis documented in docs to save all prompts before starrting do to do t hework

### Processing notes

- Saved this prompt after locating and reading the existing documentation, before changing the workflow documentation.
- Added `docs/prompt-processing-flow.md` requiring every prompt to be saved before its requested work begins, including follow-ups and corrections.
- Linked the procedure from the README and clarified that GitHub commit messages and comments may reference the saved prompt but do not replace it.
- Preserved the existing deletion of the earlier publication prompt file and updated its history reference to avoid a broken link.
- Validation: `git diff --check` passed. Application tests were not run because only documentation changed.

## 2026-09-17 — Adapt the feature guide for Plug Inu and publish

### User prompt (verbatim)

> updated these features to fit plug inu  and add to docs and run gith hub process

### Supplied feature guide (verbatim)

# Spot a Dog features

Spot a Dog helps you quickly scan webpages by highlighting words and phrases related to subjects you care about. This guide describes the required product experience. See the [requirements](requirements.md) for precise behavior and the [README](../README.md#capabilities) for what the current extension implements.

| Feature | Required user experience |
| --- | --- |
| Spot a Dog On/Off | Pause all page scanning and remove highlights without deleting profiles or changing their individual switches. Resume with your saved configuration. |
| Popup | With sidebar mode off, the toolbar opens a popup with full profile/keyword management, AI review, and settings access. |
| Sidebar / Side Panel | Enable **Use sidebar** for the same interface beside the webpage. The saved preference controls later toolbar openings across tabs and browser sessions. |
| Keyword Profiles | Organize topics, subjects, categories, keyword types, or interests into named reusable profiles; create, edit, or delete them; add, activate/deactivate, edit, save and remove each keyword in its own row. |
| Positive Keywords | Highlight important or desirable words and multi-word phrases in a distinct positive color, initially yellow with an underline. |
| Negative Keywords | Highlight negative words and phrases in red by default so they are easy to distinguish, including when no positive terms appear nearby. |
| Keyword Match Criteria | Select and configure all [17 match types](keyword-match-criteria.md), including word/phrase operations, lengths, structural recognition and advanced regex, for positive or negative highlights. |
| Live Keyword Counts | Optionally enable **Track keyword occurrences** to see separate unique-in-context and repeated counts beside each saved keyword, updated for the current page. Disabled by default. |
| Independent Profiles | Switch each profile on or off without changing other profiles. Only enabled profiles scan when Spot a Dog is globally on. |
| AI Keyword Discovery | Enter seed words or phrases and ask an OpenAI or Anthropic model for synonyms, variations, associated concepts, and related terminology. |
| Human Approval | Review candidates individually, select useful terms, reject or dismiss unwanted ones, choose the profile and positive or negative list, then explicitly add your selection. |

## Privacy and data handling

Browsing information and page content accessed by Spot a Dog stay on your machine, within your browser. Scanning, matching, highlighting and keyword counts are processed locally without sending browsing data, page URLs, content or derived counts/fingerprints to external servers. The plugin developer, third parties and other external parties do not receive this information. Local storage is not synchronized to a cloud service.

Optional AI discovery sends only the seeds you explicitly submit as user content to your chosen provider, with its model configuration and authentication. Seeds are never populated from browsed pages. Text you manually copy into that field and submit is sent to the provider. See [Storage and privacy](../README.md#storage-and-privacy) for the full guarantee and [the architecture audit](privacy-architecture.md) for implementation evidence.

## Everyday use

Manage profiles and keywords in either the popup or side panel, with no API key required. **Use sidebar** selects the display location and does not change your profiles or scanning state. Both views share your saved global and profile states and link to settings. Closing either view does not turn Spot a Dog off; use the global switch to stop scanning. You can manage configuration even while scanning is off. Save profile edits before closing the editor if you want to keep them.

Choose a profile from the **Profile** dropdown to view its read-only details. Type in **Search keywords** to filter its positive and negative terms immediately. Choose the profile **Edit** action to change its name and enabled state. Keyword Edit and activity controls remain available independently. Switching profiles resets search, with confirmation before discarding changed drafts. Import/export actions live in **Profile backups** at the bottom.

Use **Add Keyword** to enter one term and **Save keyword** to persist that row independently for an existing profile. Each row has an activity checkbox (checked = active, unchecked = inactive), **Edit**, **Cancel**, and confirmed **Remove** action. Activity changes and removals save immediately. Profile Save/Cancel affect only name and enabled state; they preserve keyword saves and open keyword drafts. Failed writes retain the row for retry. Initial new-profile keywords are created together with its name using Save profile. Missing activity on legacy keywords defaults to active. Blank or duplicate terms show an inline error.

For example, a profile named **AI Infrastructure** could contain positive terms `GPU`, `inference`, and `data center`, and negative terms `gaming` and `graphics settings`. Default colors are yellow for positives and red for negatives. Each keyword can use one of six presets or any custom color. If the same characters match both kinds, the negative keyword takes precedence regardless of color. You can enable this profile alongside other interests or disable it independently.

Open **Settings** to save your own API key and model configuration. A blank key field retains the saved key; **Remove API key** deletes it. The key is stored locally, unencrypted, for use in a trusted browser profile. Only explicitly entered discovery seeds are sent as user content to OpenAI or Anthropic; scanned webpage text is never attached. No API key is needed to create profiles or highlight pages. See [credential requirements](requirements.md#r8--ai-configuration-and-credentials) for handling and privacy rules.

To expand a profile, select its destination, enter seeds, and click **Get suggestions**. Review the results, select terms you want, choose the positive or negative list, and click **Add selected**. Generation alone never changes your profile. Adding terms while the profile or global switch is off stores them for later use without turning scanning on.

## Keyword highlight colors

Add or edit a keyword to choose Yellow, Red, Green, Blue, Purple, Orange, or a custom color. The selected preset has an outline; the selected name and hex value are shown beside the custom picker. Save keyword persists and applies the color independently for existing profiles. Colors survive reload, reopening, and profile backups. Legacy keywords keep their group defaults. Custom highlights choose black or white foreground text for contrast.

## Availability and limits

Independent red negative highlights, red overlap precedence, individual candidate dismissal, and dismissal of all candidates are implemented. See the [implementation log](implementation-log.md) for automated validation and remaining manual checks.

Scanning covers supported webpage text, including dynamically added content. Browser-internal pages and other excluded content remain outside the current scope; see [matching decisions and limits](../README.md#matching-decisions-and-limits). Profiles and settings persist across browser restarts. The [functional requirements and acceptance checks](requirements.md) define the implementation contract for future changes.

## Keyword matching criteria

Use **Add Keyword** or **Edit** on a keyword, enter its text and optionally select **Keyword matching criteria**. Each keyword owns its criterion; its group determines highlight color. Choose Save keyword to apply it independently for an existing profile. Default retains literal matching. Criteria are included in profile backups. The [complete match-type table, examples, validation and semantics](keyword-match-criteria.md) describe every supported option.

## AI model choices

Settings offers separate OpenAI and Anthropic credentials and predefined model dropdowns. Custom IDs remain available, and each provider remembers its last model. Both providers support the same reviewed keyword suggestions. See [provider setup](../README.md#ai-providers-and-model-selection).

## Live keyword counts

Turn **Track keyword occurrences** on or off in the popup or sidebar. This global preference persists locally and defaults to off for existing and new installations. Counts appear beside each keyword while viewing a saved profile; choose Save profile or Cancel to return from editing to live counts. Tracking pauses with **Highlight pages**. Inactive keywords and disabled profiles record no new appearances; their saved history remains available. Unsupported pages or pending page analysis show **Counts unavailable**.

Analysis covers the same rendered DOM text nodes as highlighting, including text below the fold. Scripts, styles, forms, code/preformatted text, editable and hidden content, non-text media, shadow DOM and iframes remain excluded. Phrases cannot cross text-node boundaries. The existing per-keyword criteria, capitalization rules, flexible whitespace and Unicode boundaries determine valid matches; regex keeps its existing case-sensitive behavior.

**Repeated** is the cumulative observed total for that keyword on the exact current page URL, before highlight overlap/color resolution. Five valid matches give a repeated count of five. Counts are independent per profile and positive/negative keyword, even when another keyword matches the same characters.

**Unique in context** is the number of distinct complete matching text-node contents containing a valid occurrence. Context normalization lowercases text, trims it and collapses whitespace; punctuation is retained. Two nodes containing `GPU gpu` and ` GPU   GPU ` produce four repeated occurrences and one unique context. Adding a node containing `GPU!` yields five repeated occurrences and two unique contexts. This is deterministic text-context deduplication, not semantic AI analysis: inline markup can split contexts, and punctuation differences distinguish them. Context normalization does not change which occurrences match.

The existing scanner batches relevant DOM mutations over 150 ms and caches matches and count contributions for unchanged text nodes. Lazy-loaded and inserted content adds observations. Hidden, removed or temporarily absent content does not erase recorded appearances. Each normalized context retains its highest observed repeated count across scans; totals sum those context counts. Reprocessing the same content is idempotent. A new context adds its matches; additional simultaneous copies of an existing context increase its recorded multiplicity. Editing a context creates a distinct historical context. Scrolling alone needs no rescan because rendered text below the fold is already included; DOM changes caused by scrolling use the same observer. Resizes and disclosure toggles also refresh visibility. Navigation selects the history for the new exact URL (including query and fragment), including client-side routes; content retained by the website is observed for that URL. Returning to a URL or reloading restores its history. URL changes deliberately select separate histories rather than combine different pages. UI search and profile selection do not filter the stored observations. Counts are not exported or sent to AI services.

An open interface reads the active tab's latest snapshot every 500 ms while tracking and global scanning are enabled; these reads do not scan the page. Switching tabs clears the displayed result before querying the new page. Disabling tracking clears the active snapshot/cache and removes route listeners and UI polling while retaining persisted history; the existing highlighting observer remains if highlighting is enabled. Global pause disconnects scanning. Closed interfaces stop polling, and reinjection disposes the previous scanner. Mutation-driven passes still traverse the rendered DOM to reconcile visibility and removals, so very large dynamic pages retain the scanner's existing scaling limits. Stylesheet-only visibility changes without observed mutations retain the existing resize/refresh limitation.

Historical counts are stored locally through the worker’s serialized storage adapter, separately from version-1 profiles, under `spotadog.counts.v1.<SHA-256 URL>`. Each keyword identity (profile, positive/negative kind, text and criterion) maps hashed normalized contexts to their maximum observed multiplicities. The content script passes observations locally to the extension worker for hashing; raw URLs and page text are not stored, although fingerprints are not encryption. Concurrent and out-of-order observations merge by context rather than replace a total. Only acknowledged persisted totals are displayed; storage errors show Counts unavailable and a subsequent scan retries. Old installations have no persisted counts to migrate: history begins with the first scan after this update, without modifying profiles or preferences.

There are no stable source-record IDs in arbitrary DOM text. Identical contexts shown in disjoint batches are indistinguishable from reprocessing and therefore retain the largest observed multiplicity, not a sum of batches. Text edits form new contexts, and markup changes can change text-node boundaries. This conservative context-based history avoids inventing duplicate appearances, but cannot reconstruct unseen content or previously discarded counts. Removal from the DOM is not treated as an explicit source deletion. History has no automatic eviction; it remains until extension data is cleared or the extension is uninstalled. Very large histories can reach Chrome local-storage limits; failed writes preserve existing data and show Counts unavailable.

## Word list tabs

In both popup and sidebar, **Positive Words** and **Negative Words** switch lists in place. Only the active list appears and all its rows expand with normal page scrolling. Tabs support arrow keys, Home/End, and visible keyboard focus. Search applies to both lists, and switching tabs preserves unsaved keyword edits.

## Auto Scroll and automatic pagination

**Pause on positive keyword** is off by default and applies only to the active tab. With it enabled, a post containing a rendered positive match pauses when its top reaches the configured **eyeball level**. **Settings → Auto Scroll configuration** adjusts that level from 10% to 90% of the visible page height, measured from the top; the default is 50% (halfway down). The level is a global preference saved across restarts and applies to open pages after saving. Viewport resizing and layout shifts use the current geometry. If the matching post already spans the level when enabled, it pauses immediately without scrolling backward; posts entirely above the level are skipped. A post whose top cannot reach the level before the document ends pauses at the reachable end instead.

**Auto-pause colors**, in the same Settings section, limits automatic keyword pauses to positive keywords with one of the checked colors. Choose any of the six presets or add a custom color; comparisons use exact normalized six-digit hex values. All six presets are selected on first use, while custom colors must be added explicitly. Legacy positive keywords without an assigned color use yellow. Unchecked colors remain highlighted but do not trigger auto-pause. Selecting no colors disables keyword-triggered pauses; end-of-content and other navigation safeguards still apply. Checkbox changes and custom-color additions save automatically, apply to open tabs, and persist across restarts. Newly opened Settings views check exactly the saved colors, including an empty selection. Failed saves show an error and restore the last confirmed selection. Save scrolling settings updates the eyeball level independently; AI settings saves do not reset or overwrite the palette. The filter applies only to automatic pausing, not slowdown or manual Resume.

**Slow down on positive keyword** is a separate, off-by-default per-tab toggle. It uses one-quarter of the selected Scroll speed while a matching post spans the eyeball level and restores the selected speed when that level no longer intersects matching content. It does not alter the saved speed. Slowdown takes precedence over automatic keyword pausing if both toggles are checked, without changing either selection. Manual Pause/Resume and navigation/end-of-content safeguards still apply.

Content detection uses article posts, individual divs inside feed sections, sections, and standalone text blocks. Internal layout divs do not split semantic posts. The keyword itself may be farther down the post and outside the viewport; its containing post determines the reading position. Negative-only highlights and positives fully covered by negative matches do not trigger either mode. Resume skips the consumed post for automatic pausing, but slowdown still responds to current content. Highlight pages must be enabled for keyword detection. Unusual layouts and nested scrollers retain the document-scrolling limitation. This reading-level behavior supersedes the earlier pause-after-content-boundary behavior in prompts 029–030.

The shared popup/sidebar includes an optional **Auto Scroll** toggle for the active webpage tab. When enabled, **Scroll speed** selects 30–600 pixels per second (default 120), and **Pause** / **Resume** controls scrolling and pagination together. These controls are independent of Highlight pages and keyword tracking. Switching tabs displays that tab's own state; new tabs start off.

Auto Scroll moves through the document, including pagination initially below the viewport. At the bottom it allows at least four seconds without content changes before following a supported next control. Infinite-scroll additions reset this grace period. Recognized controls include `rel="next"`, an accessible “Next page” label, and Next/Older/arrows within a pagination region. A pager displaced above the viewport by a long footer is brought back into view after consuming the document. Only rendered controls in the viewport are eligible for activation; disabled, hidden, download, new-tab, fragment-only, same-page and cross-origin links are excluded. The extension activates the site's control, which can make the site's ordinary navigation requests; browsing content is never sent to an extension server or AI provider.

**Resume shortcut:** press **Alt+Shift+R** (**Option+Shift+R** on Mac) while Chrome is focused to resume Auto Scroll in the active tab, including when the popup/sidebar is closed. It uses the same Resume action and current position, retaining speed and keyword mode settings. It does nothing when Auto Scroll is already running or switched off, or the page is unsupported. Repeated presses never toggle Pause. The shared controls display the currently assigned shortcut; change or assign it at `chrome://extensions/shortcuts`. Chrome may leave conflicting shortcuts unassigned. See [Chrome commands](https://developer.chrome.com/docs/extensions/reference/api/commands).

A successful automatic page navigation continues scrolling. AJAX pagination resumes after changed page content settles; appended content keeps position, while a replacement page of the same or smaller height starts at the top. Pausing preserves speed and the browser's position. Resume always uses the actual current position, including manual adjustments or Back restoration. User link/button interaction, history navigation, and new documents outside an authorized next-page action pause the feature. A paused detail-page / Back round trip stays paused. Reloading a page also pauses an enabled session.

With no next control or new content after twelve quiet seconds at the bottom, the feature pauses at the end. A canceled next action pauses after fifteen seconds. Resume explicitly retries from the current position. Busy indicators (`aria-busy="true"`) defer end detection. Only one loop and one pending pagination action run at a time; repeated page targets/content and a 200-action session limit prevent loops. Turning Auto Scroll off and on starts a new traversal.

State is scoped to browser tab IDs in trusted `chrome.storage.session`, behind the existing storage adapter. It survives service-worker suspension, but Chrome clears it on browser restart and extension disable/reload/update. Closed/new-tab events remove associated records; worker startup prunes records for tabs that no longer exist. Runtime toggles and scrolling state are not written to persistent local preferences or profile backups. Only the global eyeball-level and auto-pause color preferences are persistent.

Limitations: the document's main scroll area is supported; nested scroll containers, shadow DOM, frames, virtualized content without normal document scrolling, and unusual/unlabeled pagination may require manual navigation. Sites loading after the end grace period require Resume. Pagination recognition is deliberately conservative; redirects to an unexpected URL pause. A page continuously changing its content or declaring itself busy can keep the feature waiting. Browser scheduling may suspend background-tab animation frames.

### Auto Scroll developer contract

- `src/navigation/state.js` contains the pure state transitions. Records contain enabled, paused, speed, pauseAfterPositive and slowOnPositive (both default false), revision, documentId, URL, pending target/expiry, visited targets/content signatures, and status reason. No Y coordinate is persisted.
- `scroll.get` / `scroll.set` / `scroll.resume` are trusted extension-UI messages with an explicit tabId. UI generation guards discard obsolete active-tab replies. `scroll.hello`, `scroll.next`, `scroll.progress`, and `scroll.pause` are accepted only from this extension's active top-frame HTTP(S) content scripts; tabId and documentId come from Chrome's sender, never page-supplied payloads.
- Rendered positive ranges stay local in the highlighter and feed `navigation/positive-pause.js`; matching content and consumed blocks are document-local DOM references, never stored or sent in messages. Custom colors do not change polarity. The highlighter retains a local range-to-color map to filter positive ranges before pause detection; slowdown receives all positive ranges.
- `navigation.settings` is a trusted settings-page mutation validated and serialized by the existing storage adapter. The public scanning projection includes the safe numeric `eyeballLevel` and normalized `autoPauseColors` list; state broadcasts update the controller without exposing credentials or restarting paused scrolling.
- The worker registers `resume-auto-scroll` synchronously with `chrome.commands.onCommand`. Native command events call the same trusted `scroll.resume` path as the Resume button. The enabled/paused guard and existing resume transition run inside the serialized tab mutation; no page keyboard listener or new permission is needed.
- Content transitions carry a revision. A current-frame instance probe inside the serialized hello mutation rejects delayed initialization from a departed document. Old documents and stale next/progress requests cannot mutate a newer lifecycle. Pause can cancel a concurrently authorized next action from the same document. Next authorization is stored before clicking, scoped to a target and a fifteen-second deadline. History/reload cannot consume it as automatic continuation.
- `scroll.changed` is sent to the specific tab/document; `scroll.ui.changed` includes the tab ID. The content controller rejects stale revisions, cancels frames/observers on pause, disable, pagehide and disposal, and rereads state on pageshow. Reinjection disposes the old controller alongside the existing scanner.
- Tab state uses the `spotadog.scroll.v1.<tabId>` session namespace through `createTabStore` in `src/storage/store.js`. Session storage itself supplies the fresh-browser boundary; worker wake must not clear live tab state. See [Chrome session storage lifecycle](https://developer.chrome.com/docs/extensions/reference/api/storage) and [tab/document messaging](https://developer.chrome.com/docs/extensions/reference/api/tabs).

## URL visit tracking

Optional **Track URL visits**, off by default, counts subsequent top-level HTTP/HTTPS visits independently of highlighting. **Per session** keeps browser-session history; **All time** persists until cleared. Modes retain separate histories. Both popup and sidebar show the current URL count and a searchable URL history. Turning tracking off stops recording and retains history; **Clear URL history** clears both modes after confirmation. Readable URLs and counts stay local and never enter AI requests or profile backups. See [URL visit tracking](../README.md#url-visit-tracking) for exact visit semantics and storage limits.

### Popup history

URL tracking also records browser popup/opener-tab navigations and detected visible website overlays, with separate appearance counts and First seen/Seen before status. Popup identity prefers an item identifier or activating/destination URL. Both histories use the selected session/all-time mode and are cleared together. Detection is best effort; see [popup semantics and limits](../README.md#popup-seen-history).

## Autoplay location checkbot

Settings accepts version-1 X Profile Scout JSON and a target account location. An optional local author check filters positive keyword/color pauses using checked `accountBasedIn` records. Unknown/nonmatching authors keep scrolling. Upload replacement, validation, privacy, supported author markup and limits are documented in [README](../README.md#autoplay-location-checkbot).

## Automatic ad skipping

An off-by-default Settings toggle automatically saves across all tabs and restarts. When enabled, a prominent main video must be playing before nearby player controls are considered. Broader ad-skip phrases and supported custom controls are matched; unrelated skips and countdowns are excluded. Visible, enabled and unobstructed controls are clicked once per observed clickable appearance. DOM observation and periodic checks cover dynamic buttons; disabling cancels pending work. Independent of matching and Auto Scroll. See [README](../README.md#automatically-skip-ads) for labels, lifecycle and supported-page limits.

The MGP ad-roll adapter (prompt 041) honors the player's skippable/active-ad state and uses its mouseup activation, across sites sharing that player, without hostname checks. Generic controls retain click activation.

The overlay-ad adapter (prompt 044) recognizes an active ad layer over the same paused main player and waits for its skip control's skippable state. “Skip This Video” is accepted only on that ready ad control; unrelated video navigation and previews remain excluded.

### Processing notes

- Saved the full request and supplied attachment after locating the repository's prompt procedure and before editing feature documentation.
- Added `docs/feature-requirements.md`, adapted to Plug Inu's identity and connection architecture; linked it from README and `docs/features.md`, with an explicit implemented/planned status table.
- Covered every supplied feature family and documented unresolved source specifications. Replaced inherited project paths/namespaces with clearly proposed Plug Inu interfaces; retained current matching limits, color defaults, debounce and credential policy. No application implementation or new permissions are claimed.
- Preserved and included the pending README/prompt-procedure changes and existing deletion of `docs/prompts/002-push-to-github.md`. Updated the changelog.
- Validation: all 12 tests passed; JavaScript syntax checks and production build passed; local Markdown links and anchors passed across README and six docs. Removed a trailing blank line found by the initial whitespace check; final diff validation follows before commit. Native Chrome checks remain pending; no new runtime features were implemented.
- Publication follows the existing current-branch SSH workflow on `main` to `origin` (`pluginu/browser-plugin`). Review notes are included here and in the commit description. This request authorizes commit/push; no separate GitHub comment was requested.

## 2026-09-17 — Domain agent skills

**Prompt**

> lets add a feature where each domain is like an agent skill it can be loaded and used as neededthe skill dile for that domain is merge rof what is thre andwht is local to tht install exactle x domain should have following features specifing url and input out and actios ...

**Processing notes**

- Added exact-domain skills with URLs, typed input/output descriptions and action instructions; included a bundled X example.
- Added validated installation-local overrides, action-ID merging and disablement, worker commands, shared editor/catalog/preview and Markdown export. Migrated storage to version 2 while preserving old settings.
- Documented contracts, merge rules, extension command interface and manual checks. Actions are descriptive; no browser automation or external agent integration is implemented.
- Validation: all 17 tests passed, including merge, hostname isolation, validation, migration, worker commands and UI load/save coverage; syntax checks and production build passed. Native Chrome visual/download testing remains manual.

## 2026-09-17 — Skills management configuration

**Prompt**

> let's have a config screen where usercanacticate and load skills ... all that skills management

**Processing notes**

- Added a dedicated skills configuration screen, accessible through Manage skills in popup, side panel and Settings.
- Added persistent activation enforced by the worker, search, load/unload, a new-skill template, staged file import, JSON/Markdown export, editing, reset and deletion. Storage version 3 preserves local definitions and existing settings.
- Added migration, activation, import round-trip, management UI and worker lifecycle coverage. All 20 tests, syntax checks, production build and whitespace checks passed. Native Chrome visual/download behavior remains to be checked manually.

## 2026-09-17 — GitHub flow and documentation

**Prompt**

> run github flow ad documents

**Processing notes**

- Reviewed the complete domain skills and management-screen changes for publication. Updated README setup/verification, feature availability and limits, architecture migrations, manual Chrome checks and changelog; included the detailed domain-skills guide and all saved prompts.
- Validation: all 20 tests, JavaScript syntax checks and production build passed. Fetched origin and verified main had no remote divergence before commit. Native Chrome visual/installation/download checks remain pending.
- Publishing the reviewed changes using the established current-branch SSH workflow: commit on main and push to origin/main. No separate GitHub comment or pull request is part of this workflow. Publication outcome is reported after verifying the remote commit.

## 2026-09-17 — Plug Inu lore and UI voice

**Prompt**

> &#x20;the lore of this is plug inu i highly connected most connected dog he want to teach his customer to be conncetd giving them to tools to be self relianent conncected individual not a peraon who know as person who is connectde  say make sujre ui has that lore, and remove any reference or keywords used by other app like spot ..

**Processing notes**

- Updated popup, side panel, settings and skills copy around Plug Inu teaching customers to build their own connections and become self-reliant. Kept labels specific to the implemented highlighting and skill-instruction features.
- Removed inherited Spot/Skip the noise wording from active UI, extension metadata, the demo page and current product documentation. Historical prompts and changelog entries remain as records.
- Validation: production build, JavaScript syntax checks and all 20 existing tests passed. Native Chrome visual validation was not performed.

## 2026-09-17 — Most connected dog online

**Prompt**

> it's the most connecte dog online update the contenct an dui acccordingly

**Processing notes**

- Standardized the identity to “The most connected dog online” in popup, side panel, settings, skills, extension/package descriptions, README and current feature requirements.
- Rebuilt the extension successfully; whitespace validation passed.

## 2026-09-17 — Publish branding and documentation

**Prompt**

> run githbu flow on doc in rep

**Processing notes**

- Reviewed the pending branding, favicon, icon and documentation changes for the established current-branch SSH publication workflow on main. Fixed duplicated wording in README, documented the temporary icon, and extended the manual Chrome checklist and changelog.
- Fetched origin; main had no remote divergence. Native Chrome installation and visual checks remain pending.

### Earlier icon prompts recorded retrospectively

These requests were implemented earlier in this session but were not saved at that time; recorded here without altering prior history.

> let's add logo to the pluging it's temp just say p

> this is for the browser tab when pinned

- Added 16, 32, 48 and 128 pixel p icons, manifest toolbar/extension references, and favicons on all four extension pages. Retained the dog mascot in app headers. Build passed during implementation.

### Publication validation

- All 20 tests, JavaScript syntax checks, production build and whitespace checks passed. Verified generated icon dimensions and favicon references for all extension pages.
- Publishing the reviewed changes on main to origin/main using SSH; the remote commit and clean working tree will be verified after push.


## 2026-09-17 — Convert X Profile Scout into domain skills

### User prompt

look at.  app in this path /Users/armenmerikyan/Desktop/wd/spotadog/x\_us\_user\_follow and copy all feature covertting tem to skills best solution we have. proposed for domains so bot downloads skills per down they can either use llm or scriptsto execute tsak

### Processing notes

- Initial repository discovery preceded finding the prompt-history instruction; the prompt was recorded as soon as that instruction was read.
- Preserved the supplied Profile Scout runtime in `skills/x-com/scripts/` and converted its workflows into 14 action contracts, a concise SKILL.md and a detailed workflow reference. Original source app files were not changed.
- Added LLM/script task selection, installed-script entrypoint links, an integrated X runtime with namespaced storage/messages, exact-host/sender checks, target-tab selection and domain deactivation handling. Existing highlighting controls/data remain independent.
- Added standalone domain ZIP generation, a contract/checksum registry, and a bot CLI supporting exact-domain lookup, per-task plans, local or HTTPS registries and verified downloads without executing code. No registry was deployed and no external bot/model service was connected.
- Retained the original Scout regression tests, fixed their teardown to stop observers before closing simulated pages, and added routing, UI, authentication, storage isolation, deactivation and download-integrity tests.
- Validation: 104 automated tests passed; JavaScript/CJS syntax checks, production build, skill validation, ZIP CRC/content validation and whitespace checks passed. Exercised the bot downloader against the built registry and verified `executed: false`.
- Live Chrome/X selector behavior and signed-in actions were not tested. No follows, posts, source-app data migration, commits or publication occurred. Existing source-app profile data can be transferred explicitly through JSON export/import; snippet data is separate.


## 2026-09-18 — Execute GitHub flow

### User prompt

execurte github flow

### Processing notes

- Reviewed the X domain-skill implementation, portable runtime, bot downloader, tests, permissions and documentation for publication using the established current-branch SSH workflow on main.
- Fetched origin and verified main had no remote divergence before committing.
- Validation: all 104 automated tests, JavaScript/CJS syntax checks, production build and whitespace checks passed. Live signed-in Chrome/X behavior remains unverified; no follows or posts were performed.
- Publishing the reviewed changes to origin/main with the implementation prompts and processing notes included. The remote commit and clean working tree will be verified after the push. This workflow does not create a separate pull request or GitHub comment.
