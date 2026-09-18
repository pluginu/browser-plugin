import test from 'node:test';
import assert from 'node:assert/strict';
import { bundledSkills } from '../src/domains/bundled.js';
import { mergeSkill, loadSkill, validateLocalSkills, skillMarkdown, listSkills, parseSkillFile } from '../src/domains/model.js';
import { migrate, defaults } from '../src/storage/model.js';
test('local overrides merge by action ID, preserve defaults and disable actions without changing bundle', () => {
 const base = structuredClone(bundledSkills[0]);
 const merged = mergeSkill(base, { domain: 'x.com', inputs: [], actions: [{ id: 'search', instructions: 'Search carefully.' }, { id: 'compose', disabled: true }] });
 assert.equal(merged.actions.length, base.actions.length - 1);
 assert.equal(merged.actions[0].url, 'https://x.com/search');
 assert.equal(merged.actions[0].instructions, 'Search carefully.');
 assert.deepEqual(merged.inputs, []);
 assert.deepEqual(base, bundledSkills[0]);
 assert.match(skillMarkdown(merged), /Search carefully/);
});
test('exact host resolution rejects lookalikes, subdomains, credentials and non-web URLs', () => {
 assert.equal(loadSkill('https://X.com/search?q=test').domain, 'x.com');
 for (const url of ['https://x.com.evil.test/', 'https://www.x.com/', 'file://x.com/', 'https://user:pass@x.com/']) assert.throws(() => loadSkill(url));
});
test('local-only domains require complete contracts and invalid overlays are rejected', () => {
 const custom = { ...structuredClone(bundledSkills[0]), domain: 'example.com', urls: ['https://example.com/'], actions: [] };
 validateLocalSkills([custom]);
 assert.equal(loadSkill('https://example.com/path', [custom]).domain, 'example.com');
 for (const overrides of [
  [{ domain: 'example.com' }],
  [{ domain: 'x.com', actions: [{ id: 'new' }] }],
  [{ domain: 'x.com', actions: [{ id: 'search', url: 'https://evil.test/' }] }],
  [{ domain: 'x.com', inputs: null }],
  [{ domain: 'x.com' }, { domain: 'x.com' }],
  [{ domain: 'x.com', actions: [{ id: 'search' }, { id: 'search' }] }],
 ]) assert.throws(() => validateLocalSkills(overrides));
});
test('version 1 storage migrates without losing settings', () => {
 const old = defaults(); old.version = 1; delete old.domainSkills; old.enabled = false;
 const migrated = migrate(old);
 assert.equal(migrated.version, 3); assert.equal(migrated.enabled, false); assert.deepEqual(migrated.domainSkills, []);
 assert.equal(old.version, 1); assert.equal(old.domainSkills, undefined);
});
test('domain UI loads a skill and saves an override through worker commands', async () => {
 const { JSDOM } = await import('jsdom');
 const { setupDomainSkills } = await import('../src/domains/ui.js');
 const dom = new JSDOM('<section></section>');
 const previous = { document: globalThis.document, chrome: globalThis.chrome };
 const messages = []; const errors = [];
 globalThis.document = dom.window.document;
 globalThis.chrome = { runtime: { sendMessage: async message => {
  messages.push(message);
  if (message.action === 'listDomainSkills') return { skills: [{ name: 'X', domain: 'x.com', source: 'bundled', active: true }] };
  if (message.action === 'loadDomainSkill') return { skill: bundledSkills[0], markdown: skillMarkdown(bundledSkills[0]) };
  return { state: defaults() };
 } }, storage: { onChanged: { addListener() {} } } };
 try {
  setupDomainSkills(document.querySelector('section'), error => { if (error) errors.push(error); });
  const settle = () => new Promise(resolve => setTimeout(resolve, 0));
  await settle();
  document.querySelector('#domain-load').dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
  await settle();
  assert.match(document.querySelector('#domain-preview').textContent, /https:\/\/x.com\/search/);
  assert.equal(document.querySelector('#domain-preview').hidden, false);
  document.querySelector('textarea').value = '{"domain":"x.com","name":"Personal X"}';
  document.querySelector('#domain-save').dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
  await settle();
  assert.equal(messages.find(message => message.action === 'saveDomainSkill').skill.name, 'Personal X');
  assert.equal(document.querySelector('#domain-preview').hidden, true);
  assert.deepEqual(errors, []);
 } finally { globalThis.document = previous.document; globalThis.chrome = previous.chrome; dom.window.close(); }
});
test('activation controls loading and version 2 migration preserves local overrides', () => {
 const local = [{ domain: 'x.com', name: 'Personal X' }];
 assert.equal(listSkills(local, ['x.com'])[0].active, false);
 assert.throws(() => loadSkill('https://x.com/', local, ['x.com']), /Activate/);
 assert.equal(loadSkill('https://x.com/', local, []).name, 'Personal X');
 const old = { ...defaults(), version: 2, domainSkills: local }; delete old.disabledDomainSkills;
 const current = migrate(old);
 assert.deepEqual(current.domainSkills, local);
 assert.deepEqual(current.disabledDomainSkills, []);
 assert.equal(current.version, 3);
});
test('skill files round-trip as JSON and Markdown and reject invalid imports', () => {
 const skill = bundledSkills[0];
 assert.deepEqual(parseSkillFile(JSON.stringify(skill)), skill);
 assert.deepEqual(parseSkillFile(skillMarkdown(skill)), skill);
 assert.deepEqual(parseSkillFile('{"domain":"x.com","name":"My X"}'), { domain: 'x.com', name: 'My X' });
 for (const content of ['# Arbitrary instructions', '{}', '{"domain":"unknown.test"}', 'a'.repeat(1000001)]) assert.throws(() => parseSkillFile(content));
});
test('management screen activates, filters, unloads and stages imports without saving', async () => {
 const { JSDOM } = await import('jsdom');
 const { setupDomainSkills } = await import('../src/domains/ui.js');
 const dom = new JSDOM('<section></section>');
 const previous = { document: globalThis.document, chrome: globalThis.chrome };
 const messages = []; const errors = []; let active = false;
 globalThis.document = dom.window.document;
 globalThis.chrome = { runtime: { sendMessage: async message => {
  messages.push(message);
  if (message.action === 'listDomainSkills') return { skills: [{ name: 'X', domain: 'x.com', source: 'bundled', active }] };
  if (message.action === 'setDomainSkillActive') { active = message.active; return { state: defaults() }; }
  if (message.action === 'loadDomainSkill') return { skill: bundledSkills[0], markdown: skillMarkdown(bundledSkills[0]) };
  return { state: defaults() };
 } }, storage: { onChanged: { addListener() {} } } };
 try {
  setupDomainSkills(document.querySelector('section'), error => { if (error) errors.push(error); });
  const settle = () => new Promise(resolve => setTimeout(resolve, 0));
  const buttons = () => [...document.querySelectorAll('#domain-catalog button')];
  await settle();
  assert.equal(buttons().find(button => button.textContent === 'Load skill').disabled, true);
  buttons().find(button => button.textContent === 'Activate').click(); await settle();
  assert.equal(active, true);
  buttons().find(button => button.textContent === 'Load skill').click(); await settle();
  assert.equal(document.querySelector('#domain-loaded').hidden, false);
  document.querySelector('#domain-unload').click();
  assert.equal(document.querySelector('#domain-loaded').hidden, true);
  const search = document.querySelector('#domain-search'); search.value = 'missing'; search.dispatchEvent(new dom.window.Event('input'));
  assert.match(document.querySelector('#domain-catalog').textContent, /No matching skills/);
  const input = document.querySelector('#domain-import');
  Object.defineProperty(input, 'files', { value: [{ size: 100, text: async () => JSON.stringify(bundledSkills[0]) }] });
  input.dispatchEvent(new dom.window.Event('change')); await settle();
  assert.equal(JSON.parse(document.querySelector('textarea').value).domain, 'x.com');
  assert.equal(messages.some(message => message.action === 'saveDomainSkill'), false);
  assert.equal(document.querySelector('#domain-editor').open, true);
  assert.deepEqual(errors, []);
 } finally { globalThis.document = previous.document; globalThis.chrome = previous.chrome; dom.window.close(); }
});
