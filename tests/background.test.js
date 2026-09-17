import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';
test('worker command flow persists profiles and rules; rejects website senders and invalid writes', async () => {
 const { outputFiles } = await build({ entryPoints: ['src/background/index.js'], bundle: true, write: false, format: 'iife' });
 let listener; let data = {};
 const chrome = {
  storage: { local: { get: async () => structuredClone(data), set: async value => { data = structuredClone(value); } } },
  runtime: { id: 'test', getURL: path => `chrome-extension://test/${path}`, onInstalled: { addListener() {} }, onMessage: { addListener: cb => { listener = cb; } } },
 };
 vm.runInNewContext(outputFiles[0].text, { chrome, crypto: globalThis.crypto, console });
 const sender = { id: 'test', url: 'chrome-extension://test/popup.html' };
 const command = message => new Promise(resolve => listener(message, sender, resolve));
 assert.equal(listener({ action: 'toggleGlobal' }, { ...sender, tab: { id: 1 } }, () => assert.fail('Content scripts may not write settings')), undefined);
 assert.equal((await command({ action: 'read' })).state.enabled, true);
 const added = await command({ action: 'addProfile', name: 'Research' });
 const profileId = added.state.profiles[0].id;
 const validRule = { mode: 'word', value: 'dog', kind: 'negative', caseSensitive: false };
 const result = await command({ action: 'addRule', profileId, rule: validRule });
 assert.equal(result.state.profiles[0].rules[0].kind, 'negative');
 assert.ok((await command({ action: 'addRule', profileId, rule: { ...validRule, value: '' } })).error);
 assert.equal((await command({ action: 'read' })).state.profiles[0].rules.length, 1);
 assert.equal((await command({ action: 'toggleProfile', profileId })).state.profiles[0].enabled, false);
 assert.equal((await command({ action: 'toggleGlobal' })).state.enabled, false);
 assert.equal((await command({ action: 'deleteProfile', profileId })).state.profiles.length, 0);
});
