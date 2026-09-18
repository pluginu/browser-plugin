---
name: x-com
description: Scout X timeline profiles by account country and connection source, optionally follow matches, show saved-country hover cards, reuse text, and manage profile backups. Also search visible posts and prepare drafts on x.com.
---

# X domain skill

Use the signed-in session on exact `x.com`. Choose only the requested action from [domain.json](domain.json); it contains inputs, outputs, execution modes and action-specific instructions. Read [references/workflows.md](references/workflows.md) for script setup, state handling or record/library operations.

Choose **script** for the deterministic Scout workflows; choose **LLM** for visual reading, search, drafting or layout changes. Script entries are packaged Chrome extension pages, not shell programs. An LLM needs an existing browser tool; this package does not create a model connection. Loading or downloading never starts a task.

| Task | Action IDs | Script entry |
| --- | --- | --- |
| Search or prepare a draft | search, compose | LLM only |
| Set filters and run limits | configure-scout | scripts/popup.html |
| Scan, stop or recover | scan-profiles, stop-scout, resume-scout | scripts/popup.html |
| Saved-country cards | country-hover | scripts/popup.html |
| Save confirmed sent text and reuse it | save-reuse-text | scripts/popup.html |
| Add, search, copy or delete text | manage-saved-text | scripts/library.html |
| Search records and deferred matches | view-records | scripts/records.html |
| Export or import backups | export-records, import-records | scripts/records.html |
| Retry failed checks or reset profiles | retry-unavailable, reset-profiles | scripts/records.html |

For scripts inside Plug Inu, activate X in Manage skills, load the task and open its script controls. Select an X tab. For standalone use, extract this package and load `scripts/` as an unpacked Chrome extension; its popup runs on the active X Home tab. The standalone copy and Plug Inu store data separately. Use a profile JSON backup for transfers. Imported instruction overrides cannot add executable code to Plug Inu.

Keep the user's scope: follow or publish only if requested; do not infer publishing authorization from drafting. For collection-only work turn off the source app's visibly checked automatic-follow setting before Start. The scanner starts stopped, saves visits before navigation and follow intent before clicking, and does not retry uncertain follows. Preserve these rules when operating through an LLM too.

Country fields are X's visible account metadata, not citizenship or biography location. Missing fields remain unknown. Scripts assume English X. Pause on drafts, verification prompts, general rate limits or navigation failure; report inability to verify rather than claiming success. Profile resets retain snippets/settings and do not unfollow real accounts. Listing deferred matches does not authorize following them.
