# Plug Inu features and scope

Plug Inu helps you learn the tools to build your own connections. The current toolkit highlights words you choose and lets you manage site skills. This page describes the current implementation. The [feature requirements](feature-requirements.md) adapt the supplied feature guide into the target product experience.

| Capability | Initial behavior |
| --- | --- |
| Global switch | Stops highlighting scans and clears highlights immediately; X has separate controls |
| Profiles | Create, delete and independently enable; up to 50 |
| Rules | Positive or negative; create/delete; up to 200 total |
| Matching | Case insensitive by default; optional case sensitivity |
| Exact word | Unicode letter/number/underscore boundaries |
| Phrase / contains | Literal substring within one text node |
| Starts / ends with | Match substring at start/end of a word |
| Character length | Words of 1–1,000 Unicode code points; not grapheme clusters |
| Regex | Advanced bounded syntax; see architecture |
| Preferences | Positive/negative colors; negatives also underlined |
| UI | Popup, persistent native side panel, options page and dedicated skills configuration |
| Domain skills | Exact-domain contracts; bundled X workflows plus local overrides |
| Skills management | Persistent activation, search, load/unload, create/edit/reset/delete and JSON/Markdown import/export |
| Storage | Local only, versioned, migrated and validated |
| Connections / AI | Interfaces only; no providers or keys |

Excluded text includes scripts, styles, form controls, buttons, editable elements, hidden/aria-hidden subtrees, and non-HTML text. CSS visibility alone is not inspected. Shadow roots, iframes, canvas, PDF viewers and browser-protected pages are not scanned. Phrases split by HTML tags do not match. Regex anchors refer to individual text nodes. Matching has documented large-page limits and does not perform semantic search. No remote model services, syncing, highlighting-profile backups, profile renaming or in-place rule editing are included. Domain skills have their own [configuration and import/export](domain-skills.md); X actions offer LLM instructions or bundled script controls; downloads and task loading never execute. External agent/model integration remains separate.

## Expanded feature status

“Planned” means documented requirements, with no shipping date implied.

| Feature | Current status |
| --- | --- |
| Global switch, independent profiles, positive/negative highlights | Available in the foundation; native browser validation remains pending |
| Domain skills and management screen | Available; activation, local merging, import/export and UI behavior covered by automated tests; native Chrome checks pending |
| Popup, side panel and settings | Available; persistent toolbar/sidebar preference planned |
| Profile rename, row editing/activity, search, word-list tabs, backups | Planned; current rules use delete/recreate |
| Matching criteria | Seven modes available; the source brief's 17-type catalog needs definitions |
| Highlight colors | Global positive/negative colors available; per-keyword presets/custom colors planned |
| AI discovery and human approval UI | Provider-neutral interfaces only; OpenAI/Anthropic adapters, credentials and review UI planned |
| Live unique/repeated keyword counts | Planned; no counting or count history today |
| Auto Scroll, pagination, positive pause/slowdown, color filters and Resume shortcut | Planned |
| URL visit and popup/overlay history | Planned; detailed visit semantics still need specification |
| X account-country scout | Available through the X domain skill: matching, optional follows, saved-country hover and CSV/JSON profile records; live X verification pending |
| Automatic ad skipping and player adapters | Planned; no player compatibility claims |

See the [full target behaviors, privacy boundaries and implementation gaps](feature-requirements.md). Documentation does not enable new controls or grant new permissions.
