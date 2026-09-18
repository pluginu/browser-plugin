# Architecture

## Responsibilities

- `background/`: MV3 service worker; sole settings writer, command validation via storage model.
- `storage/`: schema version 3, migrations, validation and serialized read/modify/write operations.
- `profiles/`: profile creation and effective rule selection.
- `matching/`: browser-independent rule validation, compilation and offset matching.
- `highlighting/`: eligible DOM text selection and CSS Custom Highlight range rendering.
- `content/`: storage subscriptions, debounced DOM observation, bounded scan scheduling.
- `shared/`: common UI for popup, side panel and options.
- `connections/`: adapter registry and isolated suggestion-provider boundary.
- `domains/`: bundled domain contracts, validated local overrides, on-demand merging, JSON/Markdown import/export and configuration screen.
- `types/`: JSDoc contracts for extension points.

The content script reads local storage; extension pages send explicit commands to the worker. Management commands from website content scripts are rejected. The X runtime accepts its own namespaced messages from authenticated top-frame x.com content scripts and packaged control pages; UI-only operations are rejected from content scripts. The worker applies commands against the latest settings and queues writes to prevent lost updates from multiple interfaces. Failures are returned to the UI, and rejected writes do not poison the queue. Chrome storage events update open interfaces and content scripts. UI refresh is deferred while a form has focus.

## Storage contract

The `plugInu` local-storage key contains `{version, enabled, profiles, preferences, connections, domainSkills, disabledDomainSkills}`. Each profile has an ID, name, enabled flag and rules. Each rule has an ID, mode, value, kind and caseSensitive flag. Preferences contain positiveColor and negativeColor, validated as hex colors. Connections is an empty configuration list reserved for future adapters, never secrets.

Missing data initializes defaults. The documented version-0 prototype shape (`version`, `enabled`, `profiles`) migrates to version 3 with default preferences and connections. Version 1 migrates to version 3 with an empty local domain-skill list. Version 2 preserves its local definitions and adds an empty disabled-domain list. Existing skills remain active during migration. Domain overrides are validated against bundled contracts before writes; see [merge rules](domain-skills.md). Future or corrupt schemas fail explicitly instead of being overwritten. Installation persists the normalized schema; reads migrate in memory and subsequent writes persist it.

## Highlighting decision

Use the [CSS Custom Highlight API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API) instead of injecting wrapper elements. Text and layout structure remain intact. Negative ranges have higher priority than positive ranges. Removing the two namespaced highlights and owned stylesheet reverses the effect. Range APIs and Chrome APIs remain outside the pure matcher.

The observer is disconnected while the renderer changes its stylesheet, avoiding a feedback loop. Mutations schedule a new scan after 180 ms; generation IDs cancel stale batches. Each batch visits up to 60 eligible text nodes, yielding between batches. Caps: 5,000 ranges, approximately one million characters per scan, 20,000 characters per individual node. Very long nodes are skipped. Limits trade complete coverage of huge documents for responsiveness. A continuously changing page can delay a scan. No observer runs when no rules are active.

## Regex decision

Arbitrary JavaScript regex can block the page thread. This foundation deliberately permits only a conservative subset: classes, anchors, alternatives and at most one optional marker. Groups, backreferences and repetition (`*`, `+`, `{}`) are rejected, including escaped instances of those symbols. Use literal matching modes for those characters. Full regex would need an isolated, cancellable executor or a linear-time engine. Patterns are limited to 200 characters. Empty matches are ignored.

## Extension points

Connection adapters expose `id`, `connect`, `disconnect`. Registration checks the interface and duplicate IDs; no adapter is installed by default. Future adapters own permission requests, credentials and lifecycle. Suggestion providers expose `suggest({subject, signal})`. The helper returns validated suggestions only and never writes rules. Any future suggestion UI must obtain explicit user approval before adding them.

## Build and browser support

esbuild bundles four entry points (worker, content, shared UI and skills configuration) so content scripts need no dynamic imports or web-accessible resources. jsdom is used only in tests. Chrome 120 is the baseline. The native [side-panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel) opens through a user action. Future browser support should replace browser-specific storage/runtime/panel boundaries and check highlight support; it is not claimed today.


## Executable domain packages

`skills/x-com/` is the portable skill: short SKILL.md, domain.json, workflow reference and original Scout runtime. `src/domains/packages.js` is the installed entrypoint allowlist; local contracts cannot extend it. The build adapts the preserved source through `scripts/scout-build.mjs` and `x-bridge.js` into `dist/domain-runtime/x-com/`. The adapter isolates storage under `domain:x.com:`, namespaces messages, restricts senders/hosts, handles domain deactivation and adds explicit target-tab selection to the embedded controls. The source scripts themselves remain independently runnable as a standalone extension.

The worker loads both management and Scout handlers; each ignores the other's message envelope. Scout serializes its own writes. The highlighting global switch affects highlighting only; X has its own Start/Stop and domain activation controls. Deactivation persists stopped/off state and preserves records/snippets. On startup inactive domains do not reattach their previous run.

The build also generates a ZIP and SHA-256 registry in `dist/domain-packages/`. The bot CLI resolves an exact hostname and task, verifies contract/archive hashes, and optionally downloads one domain package. It never evaluates downloaded JavaScript. LLM execution is a plan consumed by an external agent with browser tools; no embedded LLM service or remote execution bridge is installed.
