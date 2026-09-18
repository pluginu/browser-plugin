# Domain skills

Each exact hostname has an agent-readable contract describing its URLs, inputs, outputs and actions. Choose **Manage skills** in the popup, side panel or Settings to open the dedicated configuration screen. Search the catalog, activate a skill, then choose its **Load skill** button or enter a page URL. The effective definition is assembled on request from the bundled definition and this installation’s local override. Download it as `<domain>-SKILL.md` or `<domain>.json` to supply to an agent. Loading does not navigate or perform actions. Each task can advertise LLM instructions, a packaged script, or both. X includes working script controls; an external LLM/browser provider is not bundled.

X (`x.com`) includes 14 actions covering search/drafting plus all workflows from the supplied X Profile Scout app. Script sources live in `skills/x-com/scripts/`; the compact agent entrypoint is `skills/x-com/SKILL.md`. No account access occurs when loading a definition. Script controls use the signed-in X session after an explicit Start or feature toggle. Definitions are bundled in `src/domains/bundled.js`; local definitions persist under `plugInu.domainSkills` in Chrome local storage.

## Activation and loading

The catalog shows each skill’s name, domain, source and Active/Inactive status. **Activate** and **Deactivate** persist across browser restarts and are independent of the highlighting switch. Existing and newly created skills start active. Deactivated skills remain editable but cannot load through the UI or worker command. Deactivating X also stops its current scan and disables hover/snippet widgets while preserving records. Reactivating does not restart work; explicitly Start or toggle the features again. Resetting a bundled skill’s local changes preserves its activation preference. Deleting a local-only skill removes its activation preference too.

**Load skill** resolves the latest merged instructions into this screen’s preview. **Unload** clears that preview; it does not deactivate the skill. Loaded previews are temporary and must be loaded again after reopening the screen. Changes to skill definitions or activation invalidate the preview; unrelated highlighting changes do not. Loading never executes actions.

## Local definitions

Choose **Edit** beside an existing domain to edit its saved override. **New skill** opens a complete JSON template to customize. **Import skill file** accepts a JSON definition or a Plug Inu Markdown export and stages it in the editor for review. Save to install the staged definition; closing the editor does not save it. Arbitrary Markdown instructions without a Plug Inu JSON definition are not supported. Saving replaces that domain’s previous local override. **Reset local changes** restores bundled behavior; **Delete skill** removes a local-only domain entirely.

For a bundled domain, specify only fields you want to override:

```json
{
  "domain": "x.com",
  "instructions": "Use concise language. Ask before publishing.",
  "actions": [
    { "id": "search", "instructions": "Search the supplied query and retain source URLs." },
    { "id": "compose", "disabled": true }
  ]
}
```

For a new domain, supply the complete contract:

```json
{
  "domain": "example.com",
  "name": "Example",
  "description": "Read example pages.",
  "urls": ["https://example.com/"],
  "instructions": "Read the requested page and cite the source.",
  "inputs": [{ "name": "question", "type": "string", "description": "What to find." }],
  "outputs": [{ "name": "answer", "type": "string", "description": "Answer with source URL." }],
  "actions": [{
    "id": "read",
    "description": "Read the page.",
    "url": "https://example.com/",
    "inputs": [],
    "outputs": [{ "name": "text", "type": "string", "description": "Relevant visible text." }],
    "instructions": "Read visible content and return the relevant text."
  }]
}
```

## Merge and validation rules

- Domains are lowercase exact hostnames. `www.x.com` requires its own definition; paths and query strings do not change which skill loads.
- Local scalar fields and URLs replace their bundled values. Inputs and outputs replace their entire arrays; an empty array clears them.
- Actions merge by stable `id`, retaining unspecified bundled fields. New IDs add actions and `disabled: true` removes an action from the effective definition. An empty actions array adds no overrides; it does not remove bundled actions.
- New actions require URL, description, instructions, inputs and outputs. All URLs must use HTTP/HTTPS on the exact domain, without credentials.
- Input/output fields require unique names, descriptions and a type: `string`, `number`, `boolean`, `object` or `array`. These describe contracts; they are not an execution-time JSON Schema validator.
- Limits: 100 local domains, 50 actions per effective skill, 50 input/output fields per contract, 50 URLs per skill and one million serialized characters across local overrides. Invalid saves leave stored settings intact.
- Definitions contain instructions and optional execution descriptors, not executable code. Do not put credentials in them. Markdown/JSON export includes local customizations; the script ZIP is the bundled package, clearly labelled separately. Local JSON cannot add executable code to the extension.
- An action may include `execution: {modes: ["llm", "script"], script: {entry: "scripts/popup.html", operation: "start"}}`. Omitted execution defaults to LLM. Script entries must be relative paths below `scripts/`. Disabled actions are removed from plans; this is contract routing, not a per-operation permission system for the broader script control pages. The full execution descriptor replaces an inherited descriptor when overridden. Only entrypoints in the installed package registry get an Open script controls link.

## Extension command interface

Trusted extension pages can send `listDomainSkills` for catalog metadata including `active`, `setDomainSkillActive` with `domain` and boolean `active` to persist availability, `loadDomainSkill` with `url` for `{skill, markdown}`, `saveDomainSkill` with `skill` for a replacement local override, and `deleteDomainSkill` with `domain`. Writes return `{state}`; failures return `{error}`. Website/content-script messages cannot issue these management commands; only the four exact packaged management page URLs are accepted, including pages opened in tabs. The separate X runtime authenticates its own extension pages and top-frame HTTPS x.com scripts, with UI-only controls blocked for content scripts. Loading uses the latest saved override and does not write storage. Installed definitions are bundled with the application. `loadDomainAction` takes `url`, `actionId` and `mode` (`auto`, `llm`, `script`) and returns `{plan}` with only the requested action and shared instructions. Automatic mode prefers scripts where supported. `loadDomainSkill` also returns installed package locations. Resolving a plan never executes it. Local instruction overrides do not alter script behavior.

## Manual verification

After rebuilding and reloading the extension, open **Manage skills** from popup, side panel and Settings. Verify each opens the configuration screen. Deactivate X, restart the browser and verify its inactive state persists and URL loading fails. Activate it and load `https://x.com/home`, edit its local instructions and reload the skill. Verify the preview and downloaded Markdown retain bundled actions and show local instructions. Disable `compose`, save and verify it disappears. Remove the override and verify bundled behavior returns. Add the complete `example.com` definition, restart the browser and verify it persists. Try an unrelated hostname and an off-domain action URL; verify clear errors and unchanged saved definitions. Search for a missing domain, import both export formats and verify they appear in the editor before saving. Unload a preview and verify exports disappear. Native Chrome and download behavior still require these manual checks.


## Script package and bot download

After `npm run build`, `dist/domain-packages/index.json` maps exact domains to versioned contract/ZIP files and SHA-256 checksums. Each ZIP contains a normal SKILL.md, action contracts, workflow reference and the complete standalone extension runtime. There is no remote registry deployment in this repository. A static HTTPS host can serve the generated directory; the CLI supports either that trusted registry URL or the local index.

```sh
# List just the actions for the page's exact domain.
node scripts/get-domain-skill.mjs --url https://x.com/home

# Select one task and download its domain package, without executing it.
node scripts/get-domain-skill.mjs --url https://x.com/home \
  --action scan-profiles --mode script --out /tmp/plug-inu-skills

# Use an LLM plan instead; no archive download is needed for the returned plan.
node scripts/get-domain-skill.mjs --url https://x.com/home \
  --action scan-profiles --mode llm
```

`--registry` accepts a local index.json path or an HTTPS URL. Checksums verify assets against that registry, not publisher identity; use a registry you trust. Remote redirects, off-directory asset paths, credentials, oversized downloads and checksum mismatches are rejected. Existing differing downloads are not overwritten. The CLI returns `executed: false` and never installs or evaluates the downloaded scripts. Bots with their own browser capability can follow the LLM plan or use the packaged extension UI. No external bot messaging bridge or model API integration is claimed.

In **Manage skills**, load X, choose a task/mode and click **Load task**. LLM plans appear as text. Script plans show **Open script controls**. Scanner controls list available X tabs; choose the intended tab before Start. The copied app defaults automatic following to checked, so turn it off for collection-only work. Script ZIP downloads retain the standalone app's original active-tab popup and optional twitter.com compatibility; Plug Inu itself allows script execution only on x.com.

## Copied feature coverage

| Source feature | Domain action(s) / entry |
| --- | --- |
| Country/source settings, delays, follow limits | configure-scout / popup |
| Home traversal, profile/About extraction, optional follows and persistent skip list | scan-profiles / popup |
| Stop, resume, reload recovery, focus/draft pauses and follow-limit collection | stop-scout, resume-scout, scan-profiles / popup |
| Saved-country hover cards independent of scanning | country-hover / popup |
| Confirmed-post save offer and cursor-aware reuse picker | save-reuse-text / popup |
| Add/search/copy/delete reusable text | manage-saved-text / library |
| Records search, pagination, current matches and deferred future follows | view-records / records |
| CSV and JSON export, newer-record merge on import | export-records, import-records / records |
| Manual retry of unavailable checks, protected uncertain follows | retry-unavailable / records |
| Confirmed profile/progress reset retaining settings/snippets | reset-profiles / records |

X data uses `domain:x.com:settings`, `domain:x.com:run`, `domain:x.com:profile:<handle>` and `domain:x.com:snippet:<id>`. Existing highlighting state remains in `plugInu`. The supplied app's existing Chrome storage belongs to its extension ID and is not copied automatically; transfer profile records with JSON export/import. Backups do not include snippets. Reloading preserves data; uninstalling or clearing storage removes it.
