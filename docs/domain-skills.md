# Domain skills

Each exact hostname has an agent-readable contract describing its URLs, inputs, outputs and actions. Choose **Manage skills** in the popup, side panel or Settings to open the dedicated configuration screen. Search the catalog, activate a skill, then choose its **Load skill** button or enter a page URL. The effective definition is assembled on request from the bundled definition and this installation’s local override. Download it as `<domain>-SKILL.md` or `<domain>.json` to supply to an agent. Loading does not navigate or perform actions, and there is no external agent integration or action executor yet.

X (`x.com`) ships with search and draft-composition instructions as an example. These are descriptive instructions, not verified selectors or an X API integration. No account access or network requests are involved in loading a skill. Definitions are bundled in `src/domains/bundled.js`; local definitions persist under `plugInu.domainSkills` in Chrome local storage.

## Activation and loading

The catalog shows each skill’s name, domain, source and Active/Inactive status. **Activate** and **Deactivate** persist across browser restarts and are independent of the highlighting switch. Existing and newly created skills start active. Deactivated skills remain editable but cannot load through the UI or worker command. Resetting a bundled skill’s local changes preserves its activation preference. Deleting a local-only skill removes its activation preference too.

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
- Definitions contain instructions, not executable code. Do not put credentials in them. Export includes local customizations.

## Extension command interface

Trusted extension pages can send `listDomainSkills` for catalog metadata including `active`, `setDomainSkillActive` with `domain` and boolean `active` to persist availability, `loadDomainSkill` with `url` for `{skill, markdown}`, `saveDomainSkill` with `skill` for a replacement local override, and `deleteDomainSkill` with `domain`. Writes return `{state}`; failures return `{error}`. Website and content-script messages remain rejected. Loading uses the latest saved override and does not write storage. Installed definitions are bundled with the application; on-demand loading refers to resolving an effective contract, not network or dynamic module loading.

## Manual verification

After rebuilding and reloading the extension, open **Manage skills** from popup, side panel and Settings. Verify each opens the configuration screen. Deactivate X, restart the browser and verify its inactive state persists and URL loading fails. Activate it and load `https://x.com/home`, edit its local instructions and reload the skill. Verify the preview and downloaded Markdown retain bundled actions and show local instructions. Disable `compose`, save and verify it disappears. Remove the override and verify bundled behavior returns. Add the complete `example.com` definition, restart the browser and verify it persists. Try an unrelated hostname and an off-domain action URL; verify clear errors and unchanged saved definitions. Search for a missing domain, import both export formats and verify they appear in the editor before saving. Unload a preview and verify exports disappear. Native Chrome and download behavior still require these manual checks.
