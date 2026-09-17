import { parseSkillFile } from './model.js';
export function setupDomainSkills(root, reportError) {
  root.innerHTML = `<h2>Your site skills</h2>
    <p class="hint">Each skill holds instructions for a website. Activate the ones you want, then load their instructions to learn how to use that site. Loading a skill does not run its actions.</p>
    <div class="skill-toolbar"><button id="domain-new" type="button">New skill</button><label class="file-label">Import skill file<input id="domain-import" type="file" accept=".json,.md,application/json,text/markdown"></label></div>
    <p id="domain-status" role="status" aria-live="polite"></p>
    <label>Find a skill<input id="domain-search" type="search" placeholder="Search by name or domain"></label>
    <p id="domain-count" class="hint"></p><ul id="domain-catalog"></ul>
    <form id="domain-load"><label>Load by page URL<input name="url" type="url" value="https://x.com/" required></label><button>Load skill</button></form>
    <section id="domain-loaded" hidden><div class="section-heading"><h3 id="domain-loaded-title"></h3><button id="domain-unload" type="button">Unload</button></div>
    <pre id="domain-preview" tabindex="0" hidden></pre><div class="skill-toolbar"><button id="domain-export" type="button" hidden>Download SKILL.md</button><button id="domain-export-json" type="button">Download JSON</button></div></section>
    <details id="domain-editor"><summary>Edit local domain skill</summary><p class="hint">New domains need a complete definition. For bundled skills, enter only changed fields. Actions merge by ID; disabled: true removes an action. Saving replaces the previous local definition. Imported files appear here for review before saving.</p>
    <form id="domain-save"><label>Local definition (JSON)<textarea name="definition" rows="18" required spellcheck="false"></textarea></label><div class="skill-toolbar"><button class="primary">Save local definition</button><button id="domain-cancel" type="button">Close editor</button></div></form></details>`;
  const find = selector => root.querySelector(selector);
  const request = async (action, payload = {}) => {
    const result = await chrome.runtime.sendMessage({ action, ...payload });
    if (!result || result.error) throw new Error(result?.error || 'Could not update domain skills.');
    return result;
  };
  let loaded;
  let catalog = [];
  let loadGeneration = 0;
  let refreshGeneration = 0;
  const status = message => { find('#domain-status').textContent = message; };
  const clearPreview = () => {
    loadGeneration++;
    loaded = undefined;
    find('#domain-loaded').hidden = true; find('#domain-preview').hidden = true; find('#domain-export').hidden = true;
    find('#domain-preview').textContent = '';
  };
  const run = task => Promise.resolve().then(() => { reportError(''); return task(); }).catch(error => reportError(error.message));
  const edit = skill => {
    find('textarea').value = JSON.stringify(skill, null, 2);
    find('#domain-editor').open = true;
    find('textarea').focus();
  };
  const makeButton = (label, handler) => {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
    button.onclick = () => run(async () => { button.disabled = true; try { await handler(); } finally { button.disabled = false; } });
    return button;
  };
  const drawCatalog = () => {
    const query = find('#domain-search').value.trim().toLowerCase();
    const visible = catalog.filter(skill => `${skill.name} ${skill.domain}`.toLowerCase().includes(query));
    find('#domain-count').textContent = `${catalog.filter(skill => skill.active).length} active · ${catalog.length} installed`;
    const list = find('#domain-catalog'); list.replaceChildren();
    if (!visible.length) {
      const empty = document.createElement('li'); empty.textContent = catalog.length ? 'No matching skills.' : 'No skills installed. Create or import one to get started.'; list.append(empty);
    }
    for (const skill of visible) {
      const item = document.createElement('li'); item.className = 'skill-card';
      const heading = document.createElement('div'); heading.className = 'section-heading';
      const title = document.createElement('h4'); title.textContent = skill.name;
      const badge = document.createElement('span'); badge.className = 'skill-badge'; badge.textContent = skill.active ? 'Active' : 'Inactive';
      heading.append(title, badge);
      const detail = document.createElement('p'); detail.className = 'hint'; detail.textContent = `${skill.domain} · ${skill.source}`;
      const actions = document.createElement('div'); actions.className = 'skill-toolbar';
      const toggle = makeButton(skill.active ? 'Deactivate' : 'Activate', async () => {
        await request('setDomainSkillActive', { domain: skill.domain, active: !skill.active });
        if (loaded?.skill.domain === skill.domain) clearPreview();
        await refresh(); status(`${skill.domain} ${skill.active ? 'deactivated' : 'activated'}.`);
      });
      toggle.setAttribute('aria-pressed', String(skill.active)); toggle.setAttribute('aria-label', `Activate ${skill.domain}`);
      const load = makeButton('Load skill', async () => { find('#domain-load').elements.url.value = `https://${skill.domain}/`; await loadCurrent(); });
      load.disabled = !skill.active;
      actions.append(toggle, load, makeButton('Edit', async () => {
        const { state } = await request('read');
        edit(state.domainSkills.find(entry => entry.domain === skill.domain) ?? { domain: skill.domain });
      }));
      if (skill.source !== 'bundled') actions.append(makeButton(skill.source === 'local' ? 'Delete skill' : 'Reset local changes', async () => {
        await request('deleteDomainSkill', { domain: skill.domain }); clearPreview(); await refresh();
        status(skill.source === 'local' ? `${skill.domain} deleted.` : `${skill.domain} restored to bundled instructions.`);
      }));
      item.append(heading, detail, actions); list.append(item);
    }
  };
  const refresh = async () => {
    const generation = ++refreshGeneration;
    const { skills } = await request('listDomainSkills');
    if (generation !== refreshGeneration) return;
    catalog = skills; drawCatalog();
  };
  const loadCurrent = async () => {
    clearPreview();
    const generation = loadGeneration;
    const result = await request('loadDomainSkill', { url: find('#domain-load').elements.url.value });
    if (generation !== loadGeneration) return;
    loaded = result;
    find('#domain-loaded-title').textContent = `Loaded: ${loaded.skill.name}`;
    find('#domain-preview').textContent = loaded.markdown;
    find('#domain-loaded').hidden = false; find('#domain-preview').hidden = false; find('#domain-export').hidden = false;
    status(`${loaded.skill.domain} loaded. Instructions are ready to export.`);
  };
  find('#domain-search').oninput = drawCatalog;
  find('#domain-load').onsubmit = event => { event.preventDefault(); run(loadCurrent); };
  find('#domain-unload').onclick = () => { clearPreview(); status('Skill unloaded.'); };
  find('#domain-new').onclick = () => edit({ domain: 'example.com', name: 'My skill', description: 'Describe what this skill helps with.', urls: ['https://example.com/'], instructions: 'Describe how to use this domain.', inputs: [], outputs: [], actions: [] });
  find('#domain-cancel').onclick = () => { find('#domain-editor').open = false; };
  find('#domain-import').onchange = () => run(async () => {
    const file = find('#domain-import').files[0];
    try {
      if (!file) return;
      if (file.size > 1000000) throw new Error('Skill files must be smaller than 1 MB.');
      edit(parseSkillFile(await file.text())); status('File imported for review. Save the definition to install it.');
    } finally { find('#domain-import').value = ''; }
  });
  find('#domain-save').onsubmit = event => { event.preventDefault(); run(async () => {
    const skill = JSON.parse(find('textarea').value);
    await request('saveDomainSkill', { skill });
    clearPreview(); await refresh(); status(`${skill.domain} saved.`);
  }); };
  const download = (content, type, filename) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  find('#domain-export').onclick = () => { if (loaded) download(loaded.markdown, 'text/markdown', `${loaded.skill.domain}-SKILL.md`); };
  find('#domain-export-json').onclick = () => { if (loaded) download(JSON.stringify(loaded.skill, null, 2), 'application/json', `${loaded.skill.domain}.json`); };
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.plugInu) return;
    const { oldValue, newValue } = changes.plugInu;
    if (JSON.stringify(oldValue?.domainSkills) === JSON.stringify(newValue?.domainSkills) && JSON.stringify(oldValue?.disabledDomainSkills) === JSON.stringify(newValue?.disabledDomainSkills)) return;
    if (loaded) status('Skill settings changed. Load again for the latest instructions.');
    clearPreview(); run(refresh);
  });
  run(refresh);
}
