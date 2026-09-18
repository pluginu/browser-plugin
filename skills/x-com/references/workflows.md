# X workflow and script execution

## Choose an execution mode

The domain contract (`domain.json`) lists each action's inputs, outputs, instructions and supported execution modes. Request only the action needed. `llm` means an agent uses its existing browser tools and reads visible X state; it is not a built-in model endpoint. `script` means the included deterministic Chrome extension runtime. There is no Node CLI for browser actions and no external bot/HTTP bridge in Plug Inu.

For scripts inside Plug Inu, open Manage skills → load X → choose an action → Open script controls. Choose the X tab in the scanner controls before Start. Merely opening controls does not start scanning. Scripts are bundled with the extension; arbitrary imported instructions cannot install executable code.

For a downloaded package, extract it and read SKILL.md plus domain.json. Load the `scripts/` folder as an unpacked Chrome extension, then use its toolbar popup on a signed-in `https://x.com/home` tab. This standalone copy also supports twitter.com for compatibility with the source app. Plug Inu itself routes and grants script access only to exact x.com. Keep the same installation directory to retain storage across updates. The standalone installation has separate storage from Plug Inu. Transfer profile data explicitly with JSON export/import; snippets are not included in profile backups.

Use Chrome extension-page `chrome.runtime.sendMessage({type, ...payload})` only inside the standalone extension context. Replies are `{ok, ...result}` or `{ok:false,error}`. Plug Inu's integrated context namespaces messages with `namespace:'x.com'` and authenticates its packaged pages and top-frame X content scripts. Do not send these messages from page JavaScript or pretend they are available to an external bot. The script entry paths in domain.json identify UI entrypoints; `operation` describes their internal commands, not shell commands.

## Setup and run controls

`settings`: `{settings:{rule:'custom', countries:['United States'], countryField:'connection', sources:['appstore'], autoFollow:false, delaySeconds:12, maxFollows:20}}`. Country field is `connection`, `account`, or `either`; sources allow `appstore`, `android`, `web`, or `any`. The source app's default autoFollow is true, visibly checked in the controls: explicitly turn it off for collection-only work. Saving settings requires a stopped run and never clears saved handles.

`start`: `{tabId}`; `stop` and `status` need no additional fields. Installation starts stopped. The selected tab must be active in a focused window. Home aliases and query parameters are accepted; For you and Following are supported. Drafts and focused editors pause scanning. Profile delay is 1–120 seconds; follow attempts are 1–100 per run. A stopped unfinished visit may resume in the original tab; explicit Start at Home begins a new run. Reload reconnects an enabled run without resetting attempts. Missing/replaced tabs preserve progress and report reconnection failure.

## Persistent state machine

Phases are scan → profile → about → follow → return → scan (see scripts/content.js). Persist the handle before navigation and follow intent before clicking. Failed/interrupted visits remain on the skip list until explicit retry/reset. Pending or uncertain follows are never automatically attempted again. Already-following accounts remain unchanged. Follow-specific restrictions or the run limit switch to collection only; later matches are `deferred`. General rate limits, challenges and stalled timelines stop scanning. No challenge solving or limit evasion. Returning to a refreshed feed restores scroll only as best effort.

About fields come from Joined → About this account; biography location does not substitute for Account based in. Preserve original Connected via. Recognize App Store, Android App, Google Play / Google Play Store and Web; unknown labels fail restricted source matching. A Web label alone supplies no country. Normalize US aliases, case and whitespace only; don't translate or infer citizenship/region membership.

## Hover and reusable text

`hoverSetting` and `snippetsSetting`: `{enabled:boolean}`, independent of scanning. Hover uses local records only and excludes quoted authors. The country highlight and full country-plus-source match are separate.

The snippet controller observes manual click and keyboard submission, requiring a fresh success toast plus composer closure/clearing before asking to save. It expires unconfirmed attempts at 45 seconds, rejects ambiguous multi-editor threads, and never posts automatically. Saving requires choosing Save text. It inserts at the cursor/selection via native rich-editor insertion or offers copy/paste without changing the draft when insertion fails. Password/read-only inputs are excluded.

Library operations: `snippetList`; `snippetSave` with `{text}`; `snippetDelete` with `{id}`. NFC/line endings/outer whitespace are normalized for deduplication; internal spacing and case are preserved. Clipboard writes occur only on a Copy click. Storage survives profile reset.

## Records and backups

`all` returns all records. UI search and pagination do not constrain exports. Future follows searches `deferred`; it is not a follow queue. CSV uses Scout.csv, including formula neutralization. JSON is `{version:1, exportedAt, records}`. Records contain handle, profileUrl, checkedAt, accountBasedIn, connectedVia, dateJoined, status, followStatus and note.

`import`: `{data:backup}` while stopped; validate at most 100,000 records (file UI limit 50 MB), merge normalized handles using newer checkedAt, and retain all unrelated storage. `retry` removes only unavailable/error checks without pending/uncertain/followed/requested status. `reset` clears saved profiles and progress while retaining settings, snippets and real follows; records UI asks for confirmation. JSON profile backups do not contain snippets, authentication, settings or run progress.

## Source and verification

Ported from the supplied x_us_user_follow app, version 1.3.0. Canonical scripts are preserved in scripts/; Plug Inu's build adapts storage, message routing, sender checks, exact hostname and tab selection. Original simulated-page tests are retained under tests/x-scout in the Plug Inu repository. These tests do not establish live compatibility with X. English labels and current selectors require testing in the user's signed-in session before enabling following. When a selector or success signal cannot be verified, report the failure instead of claiming an action succeeded.
