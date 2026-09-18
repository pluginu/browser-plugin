import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { loadAction, validateSkill } from '../src/domains/model.js';
import { bundledSkills } from '../src/domains/bundled.js';
import { scoutPlugin, integratedScout } from '../scripts/scout-build.mjs';
import { getDomainSkill } from '../scripts/get-domain-skill.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');

test('task routing selects scripts or LLM and respects exact hosts, overrides and activation', () => {
  assert.equal(loadAction('https://x.com/home', 'scan-profiles').mode, 'script');
  assert.equal(loadAction('https://x.com/home', 'scan-profiles', 'llm').script, undefined);
  assert.equal(loadAction('https://x.com/search', 'search').mode, 'llm');
  assert.throws(() => loadAction('https://x.com/search', 'search', 'script'), /support/);
  assert.throws(() => loadAction('https://www.x.com/', 'scan-profiles'), /No skill/);
  assert.throws(() => loadAction('https://x.com/', 'scan-profiles', 'auto', [], ['x.com']), /Activate/);
  assert.throws(() => loadAction('https://x.com/', 'scan-profiles', 'auto', [{ domain: 'x.com', actions: [{ id: 'scan-profiles', disabled: true }] }]), /disabled/);
  assert.equal(loadAction('https://x.com/', 'scan-profiles', 'llm', [{ domain: 'x.com', actions: [{ id: 'scan-profiles', instructions: 'Collect only.' }] }]).action.instructions, 'Collect only.');
  for (const entry of ['https://evil.test/run.js', 'scripts/../run.js', 'scripts//run.js']) {
    const skill = structuredClone(bundledSkills[0]); skill.actions[2].execution.script.entry = entry;
    assert.throws(() => validateSkill(skill));
  }
});

test('integrated runtime isolates storage and messages, authenticates senders and stops on deactivation', async () => {
  const { outputFiles } = await build({ entryPoints: ['src/background/index.js'], plugins: [scoutPlugin], bundle: true, write: false, format: 'iife' });
  const listeners = [], changes = []; const injections = [];
  const data = { unrelated: 'keep' };
  const tab = { id: 7, active: true, windowId: 1, url: 'https://x.com/home' };
  const chrome = {
    storage: { local: {
      get: async keys => structuredClone(keys === null ? data : Object.fromEntries((Array.isArray(keys) ? keys : [keys]).filter(key => key in data).map(key => [key, data[key]]))),
      set: async values => { const event = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { oldValue: data[key], newValue: structuredClone(value) }])); Object.assign(data, structuredClone(values)); changes.forEach(fn => fn(event, 'local')); },
      remove: async keys => (Array.isArray(keys) ? keys : [keys]).forEach(key => delete data[key]),
    }, onChanged: { addListener: fn => changes.push(fn) } },
    runtime: { id: 'test', getURL: path => `chrome-extension://test/${path}`, getManifest: () => ({ version: 'test' }), onInstalled: { addListener() {} }, onMessage: { addListener: fn => listeners.push(fn) } },
    tabs: { get: async () => tab, query: async () => [], onRemoved: { addListener() {} }, sendMessage: async (_id, message) => { assert.equal(message.namespace, 'x.com'); return { ready: true, version: 'test' }; } },
    scripting: { executeScript: async args => injections.push(args) }, windows: { get: async () => ({ focused: true }) },
  };
  vm.runInNewContext(outputFiles[0].text, { chrome, crypto: globalThis.crypto, console, URL, structuredClone });
  const ui = { id: 'test', url: 'chrome-extension://test/domain-runtime/x-com/popup.html', tab: { id: 9 } };
  const send = (message, sender = ui) => new Promise((resolve, reject) => {
    let handled = false;
    for (const fn of listeners) if (fn(message, sender, resolve)) handled = true;
    if (!handled) reject(new Error('No listener accepted this message.'));
  });
  const command = (type, payload = {}, sender = ui) => send({ namespace: 'x.com', type, ...payload }, sender);
  assert.equal((await command('status')).run.enabled, false);
  await assert.rejects(send({ type: 'start', tabId: 7 }), /No listener/);
  for (const sender of [{}, { id: 'other', url: ui.url }, { id: 'test', url: 'https://evil.test/', tab: { id: 7 }, frameId: 0 }, { id: 'test', url: 'https://x.com/', tab: { id: 7 }, frameId: 1 }]) {
    assert.equal((await command('start', { tabId: 7 }, sender)).ok, false);
  }
  assert.equal((await command('start', { tabId: 7 })).ok, true);
  assert.ok(injections[0].files.every(path => path.startsWith('domain-runtime/x-com/')));
  assert.equal(data['domain:x.com:run'].enabled, true); assert.equal(data.run, undefined);
  assert.equal((await command('snippetSave', { text: 'Reusable' })).ok, true);
  assert.equal(Object.keys(data).filter(key => key.startsWith('domain:x.com:snippet:')).length, 1);
  const manager = { id: 'test', url: 'chrome-extension://test/skills.html', tab: { id: 9 } };
  assert.equal((await send({ action: 'loadDomainAction', url: 'https://x.com/', actionId: 'scan-profiles', mode: 'script' }, manager)).plan.mode, 'script');
  await send({ action: 'setDomainSkillActive', domain: 'x.com', active: false }, manager);
  assert.equal((await command('start', { tabId: 7 })).ok, false);
  assert.equal((await command('status')).run.enabled, false);
  assert.equal(data.unrelated, 'keep');
  await send({ action: 'setDomainSkillActive', domain: 'x.com', active: true }, manager);
  tab.url = 'http://x.com/home'; assert.equal((await command('start', { tabId: 7 })).ok, false);
  tab.url = 'https://twitter.com/home'; assert.equal((await command('start', { tabId: 7 })).ok, false);
});

test('integrated controls start the explicitly selected X tab and focus it', async () => {
  const { JSDOM } = await import('jsdom');
  const html = (await readFile('skills/x-com/scripts/popup.html', 'utf8')).replace('<form id="settings">', '<form id="settings"><select id="targetTab" required></select>');
  const dom = new JSDOM(html, { runScripts: 'outside-only' });
  const sent = [], focused = [];
  dom.window.XSkillChrome = { runtime: { sendMessage: async message => { sent.push(message); return { ok: true, settings: { rule: 'appstore', autoFollow: false, delaySeconds: 12, maxFollows: 20 }, run: { enabled: false, follows: 0, message: 'Ready' } }; } }, storage: { onChanged: { addListener() {} } }, tabs: { query: async () => [{ id: 7, title: 'Home / X' }, { id: 8, title: 'Other / X' }], get: async id => ({ id, windowId: 4 }), update: async id => focused.push(id) }, windows: { update: async id => focused.push(id) } };
  dom.window.eval(await readFile('skills/x-com/scripts/core.js', 'utf8'));
  dom.window.eval(integratedScout(await readFile('skills/x-com/scripts/popup.js', 'utf8'), 'popup.js'));
  await new Promise(resolve => setImmediate(resolve));
  dom.window.document.querySelector('#targetTab').value = '8';
  dom.window.document.querySelector('#settings').dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(sent.find(message => message.type === 'start').tabId, 8);
  assert.deepEqual(focused, [8, 4]);
  dom.window.close();
});

test('bot downloader verifies definition and archive, selects a task and never overwrites differing files', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'plug-inu-registry-'));
  try {
    const definition = JSON.stringify(bundledSkills[0]), archive = Buffer.from('test archive bytes');
    const index = { version: 1, packages: [{ domain: 'x.com', version: 'test', path: 'x-com.zip', definition: 'x-com.json', sha256: hash(archive), definitionSha256: hash(definition) }] };
    const registry = join(folder, 'index.json');
    await writeFile(registry, JSON.stringify(index)); await writeFile(join(folder, 'x-com.json'), definition); await writeFile(join(folder, 'x-com.zip'), archive);
    const options = { url: 'https://x.com/home', action: 'scan-profiles', mode: 'script', out: join(folder, 'download'), registry };
    const result = await getDomainSkill(options);
    assert.equal(result.executed, false); assert.equal(result.plan.mode, 'script'); assert.deepEqual(await readFile(result.archive), archive);
    await getDomainSkill(options);
    await assert.rejects(getDomainSkill({ ...options, url: 'https://x.com.evil.test/' }), /exact-domain/);
    await writeFile(result.archive, 'existing user file'); await assert.rejects(getDomainSkill(options), /EEXIST/);
    await writeFile(join(folder, 'x-com.zip'), 'tampered'); await assert.rejects(getDomainSkill(options), /checksum mismatch/);
    await writeFile(join(folder, 'x-com.json'), '{}'); await assert.rejects(getDomainSkill(options), /definition checksum/);
  } finally { await rm(folder, { recursive: true, force: true }); }
});

test('bridge masks stale enabled data after interrupted deactivation and preserves unrelated keys', async () => {
  const raw = { plugInu: { disabledDomainSkills: ['x.com'] }, 'domain:x.com:settings': { hoverEnabled: true, snippetsEnabled: true }, 'domain:x.com:run': { enabled: true, follows: 3 }, 'domain:other.test:run': { enabled: true } };
  const chrome = { storage: { local: { get: async () => structuredClone(raw) } }, runtime: { id: 'test' } };
  const context = vm.createContext({ chrome });
  vm.runInContext(await readFile('src/domains/x-bridge.js', 'utf8'), context);
  const state = await context.XSkillChrome.storage.local.get(['settings', 'run']);
  assert.equal(state.run.enabled, false); assert.equal(state.run.follows, 3);
  assert.equal(state.settings.hoverEnabled, false); assert.equal(state.settings.snippetsEnabled, false);
  assert.equal(raw['domain:x.com:run'].enabled, true);
  assert.equal(Object.keys(state).length, 2);
});

test('management UI exposes task plans and opens only registered script controls', async () => {
  const { JSDOM } = await import('jsdom');
  const { setupDomainSkills } = await import('../src/domains/ui.js');
  const { domainPackages } = await import('../src/domains/packages.js');
  const dom = new JSDOM('<section></section>');
  const previous = { document: globalThis.document, chrome: globalThis.chrome }; const errors = [];
  globalThis.document = dom.window.document;
  globalThis.chrome = { storage: { onChanged: { addListener() {} } }, runtime: {
    getURL: path => `chrome-extension://test/${path}`,
    sendMessage: async message => {
      if (message.action === 'listDomainSkills') return { skills: [{ domain: 'x.com', name: 'X', source: 'bundled', active: true }] };
      if (message.action === 'loadDomainSkill') return { skill: bundledSkills[0], markdown: 'X skill', package: domainPackages['x.com'] };
      if (message.action === 'loadDomainAction') return { plan: loadAction(message.url, message.actionId, message.mode) };
      throw new Error('Unexpected command.');
    },
  } };
  try {
    const settle = () => new Promise(resolve => setImmediate(resolve));
    setupDomainSkills(document.querySelector('section'), message => { if (message) errors.push(message); }); await settle();
    document.querySelector('#domain-load').dispatchEvent(new dom.window.Event('submit', { cancelable: true })); await settle();
    const card = [...document.querySelectorAll('#domain-actions .skill-card')].find(row => row.querySelector('select').getAttribute('aria-label').endsWith('scan-profiles'));
    card.querySelector('button').click(); await settle();
    assert.equal(JSON.parse(document.querySelector('#domain-plan').textContent).mode, 'script');
    assert.equal(document.querySelector('#domain-controls').hidden, false);
    assert.match(document.querySelector('#domain-controls').href, /domain-runtime\/x-com\/popup.html$/);
    card.querySelector('select').value = 'llm'; card.querySelector('button').click(); await settle();
    assert.equal(JSON.parse(document.querySelector('#domain-plan').textContent).mode, 'llm');
    assert.equal(document.querySelector('#domain-controls').hidden, true);
    assert.deepEqual(errors, []);
  } finally { globalThis.document = previous.document; globalThis.chrome = previous.chrome; dom.window.close(); }
});
