import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { defaults } from '../src/storage/model.js';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
test('content script reacts to DOM mutations and settings without wrappers or reload', async () => {
 const { outputFiles } = await build({ entryPoints: ['src/content/index.js'], bundle: true, write: false, format: 'iife' });
 const dom = new JSDOM('<p>dog</p><div id="dynamic"></div>', { runScripts: 'outside-only' });
 try {
  const state = defaults(); state.profiles = [{ id: 'p', name: 'Pets', enabled: true, rules: [{ id: 'r', mode: 'word', value: 'dog', kind: 'positive', caseSensitive: false }] }];
  let changed; const registry = new Map();
  dom.window.CSS = { highlights: registry }; dom.window.Highlight = Set;
  dom.window.chrome = { storage: { local: { get: async () => ({ plugInu: state }) }, onChanged: { addListener: cb => { changed = cb; } } } };
  dom.window.eval(outputFiles[0].text); await wait(20);
  assert.equal(registry.get('plug-inu-positive').size, 1);
  dom.window.document.getElementById('dynamic').textContent = 'dog dog'; await wait(240);
  assert.equal(registry.get('plug-inu-positive').size, 3);
  state.enabled = false; changed({ plugInu: { newValue: state } }, 'local');
  assert.equal(registry.size, 0);
  state.enabled = true; changed({ plugInu: { newValue: state } }, 'local'); await wait(20);
  assert.equal(registry.get('plug-inu-positive').size, 3);
  dom.window.document.querySelector('p').setAttribute('contenteditable', 'true'); await wait(240);
  assert.equal(registry.get('plug-inu-positive').size, 2);
  assert.equal(dom.window.document.querySelectorAll('mark,span').length, 0);
  state.enabled = false; changed({ plugInu: { newValue: state } }, 'local');
 } finally { dom.window.close(); }
});
