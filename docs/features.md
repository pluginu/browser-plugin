# Features and scope

| Capability | Initial behavior |
| --- | --- |
| Global switch | Stops scans and clears highlights immediately |
| Profiles | Create, delete and independently enable; up to 50 |
| Rules | Positive or negative; create/delete; up to 200 total |
| Matching | Case insensitive by default; optional case sensitivity |
| Exact word | Unicode letter/number/underscore boundaries |
| Phrase / contains | Literal substring within one text node |
| Starts / ends with | Match substring at start/end of a word |
| Character length | Words of 1–1,000 Unicode code points; not grapheme clusters |
| Regex | Advanced bounded syntax; see architecture |
| Preferences | Positive/negative colors; negatives also underlined |
| UI | Popup, persistent native side panel, options page |
| Storage | Local only, versioned, migrated and validated |
| Connections / AI | Interfaces only; no providers or keys |

Excluded text includes scripts, styles, form controls, buttons, editable elements, hidden/aria-hidden subtrees, and non-HTML text. CSS visibility alone is not inspected. Shadow roots, iframes, canvas, PDF viewers and browser-protected pages are not scanned. Phrases split by HTML tags do not match. Regex anchors refer to individual text nodes. Matching has documented large-page limits and does not perform semantic search. No remote services, syncing, import/export, per-site UI, profile renaming or in-place rule editing are included.
