import { MODES } from '../profiles/model.js';
const $ = selector => document.querySelector(selector);
const labels = { word: 'Exact word', phrase: 'Phrase', startsWith: 'Word starts with', endsWith: 'Word ends with', contains: 'Contains', length: 'Word length', regex: 'Regex (advanced)' };
const error = message => { $('#error').textContent = message; $('#error').hidden = !message; };
let state;
async function send(action, payload = {}) {
  error('');
  const result = await chrome.runtime.sendMessage({ action, ...payload });
  if (!result || result.error) throw new Error(result?.error || 'Plug Inu could not save this change.');
  state = result.state; render();
}
function perform(action, payload) { return send(action, payload).catch(e => error(e.message)); }
function el(tag, text, className) { const node = document.createElement(tag); if (text) node.textContent = text; if (className) node.className = className; return node; }
function button(text, handler, className) { const node = el('button', text, className); node.type = 'button'; node.onclick = handler; return node; }
function render() {
  $('#global').disabled = false;
  $('#global').textContent = state.enabled ? '● On' : '○ Off';
  $('#global').setAttribute('aria-pressed', String(state.enabled));
  $('#count').textContent = `${state.profiles.filter(p => p.enabled).length} enabled`;
  const container = $('#profiles'); container.replaceChildren();
  if (!state.profiles.length) container.append(el('p', 'Your first connection starts here. Add a profile, then add the words you care about.', 'empty'));
  for (const profile of state.profiles) {
    const card = el('article', '', 'profile');
    const heading = el('div', '', 'section-heading'); heading.append(el('h4', profile.name));
    const toggle = button(profile.enabled ? 'On' : 'Off', () => perform('toggleProfile', { profileId: profile.id }), 'small'); toggle.setAttribute('aria-pressed', String(profile.enabled)); toggle.setAttribute('aria-label', `Enable ${profile.name}`);
    heading.append(toggle); card.append(heading);
    const list = el('ul', '', 'rules');
    for (const rule of profile.rules) {
      const item = el('li', '', rule.kind); const detail = el('div'); detail.append(el('strong', rule.value), el('small', `${rule.kind === 'positive' ? 'Spot' : 'Avoid'} · ${labels[rule.mode]}${rule.caseSensitive ? ' · Case sensitive' : ''}`));
      const remove = button('×', () => perform('deleteRule', { profileId: profile.id, ruleId: rule.id }), 'remove'); remove.setAttribute('aria-label', `Remove ${rule.value}`); item.append(detail, remove); list.append(item);
    }
    card.append(list);
    const details = el('details'); details.append(el('summary', '+ Add a rule'));
    const form = el('form'); const valueLabel = el('label', 'Word, phrase, length, or pattern'); const input = el('input'); input.name = 'value'; input.required = true; input.maxLength = 200; valueLabel.append(input);
    const row = el('div', '', 'inline');
    for (const [name, entries] of [['kind', [['positive', 'Spot · positive'], ['negative', 'Avoid · negative']]], ['mode', MODES.map(m => [m, labels[m]])]]) {
      const label = el('label', name === 'kind' ? 'Treatment' : 'Match'); const select = el('select'); select.name = name;
      for (const [key, text] of entries) { const option = el('option', text); option.value = key; select.append(option); }
      label.append(select); row.append(label);
    }
    const caseLabel = el('label', '', 'checkbox'); const checkbox = el('input'); checkbox.type = 'checkbox'; checkbox.name = 'caseSensitive'; caseLabel.append(checkbox, document.createTextNode(' Match case'));
    const hint = el('p', 'Advanced regex: classes, anchors, alternatives and one ? are supported. Groups and repetition (* + {}) are excluded.', 'hint');
    const submit = el('button', 'Save rule', 'primary'); form.append(valueLabel, row, caseLabel, hint, submit);
    form.onsubmit = async event => { event.preventDefault(); submit.disabled = true; const data = new FormData(form); try { await send('addRule', { profileId: profile.id, rule: { value: data.get('value').trim(), kind: data.get('kind'), mode: data.get('mode'), caseSensitive: data.has('caseSensitive') } }); } catch (e) { error(e.message); submit.disabled = false; } };
    details.append(form); card.append(details);
    card.append(button('Delete profile', () => { if (confirm(`Delete “${profile.name}” and its rules?`)) perform('deleteProfile', { profileId: profile.id }); }, 'delete'));
    container.append(card);
  }
  for (const key of ['positiveColor', 'negativeColor']) $('#colors').elements[key].value = state.preferences[key];
}
$('#global').onclick = () => perform('toggleGlobal');
$('#new-profile').onsubmit = async event => { event.preventDefault(); try { await send('addProfile', { name: $('#profile-name').value }); $('#new-profile').reset(); } catch (e) { error(e.message); } };
$('#colors').onsubmit = event => { event.preventDefault(); perform('preferences', { preferences: Object.fromEntries(new FormData(event.target)) }); };
$('#settings').onclick = () => chrome.runtime.openOptionsPage().catch(e => error(e.message));
$('#panel').onclick = () => { chrome.windows.getCurrent().then(window => chrome.sidePanel.open({ windowId: window.id })).catch(e => error(e.message)); };
const page = document.body.dataset.page;
$('#panel').hidden = page === 'sidepanel'; $('#settings').hidden = page === 'options'; $('#preferences').hidden = page !== 'options';
// Preserve in-progress forms on external updates; refresh after the user leaves the form.
let refreshPending = false;
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.plugInu) return;
  if (document.activeElement?.closest('form')) refreshPending = true;
  else perform('read');
});
document.addEventListener('focusout', () => setTimeout(() => { if (refreshPending && !document.activeElement?.closest('form')) { refreshPending = false; perform('read'); } }, 0));
perform('read');

const manageSkills = button('Manage skills', () => chrome.tabs.create({ url: chrome.runtime.getURL('skills.html') }).catch(e => error(e.message)));
document.querySelector('nav').append(manageSkills);
