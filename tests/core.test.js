import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { compileRules, matchText, validateRule } from '../src/matching/engine.js';
import { defaults, migrate, validateState, STORAGE_KEY } from '../src/storage/model.js';
import { createRepository } from '../src/storage/repository.js';
import { createProfile, activeRules } from '../src/profiles/model.js';
import { createRenderer, eligible } from '../src/highlighting/renderer.js';
import { createConnectionRegistry, suggestKeywords } from '../src/connections/registry.js';
const rule = (mode, value, extra = {}) => ({ id: 'r', mode, value, kind: 'positive', caseSensitive: false, ...extra });
const matches = (text, r) => matchText(text, compileRules([r])).map(m => text.slice(m.start, m.end));
test('word boundaries, Unicode and case sensitivity', () => {
 assert.deepEqual(matches('dog dogma DOG hotdog', rule('word', 'dog')), ['dog', 'DOG']);
 assert.deepEqual(matches('café décafé café', rule('word', 'café')), ['café', 'café']);
 assert.deepEqual(matches('DOG dog', rule('word', 'dog', { caseSensitive: true })), ['dog']);
});
test('phrases, contains, prefixes, suffixes and literal regex characters', () => {
 assert.deepEqual(matches('a good dog here', rule('phrase', 'good dog')), ['good dog']);
 assert.equal(matches('dog dogma hotdog', rule('contains', 'dog')).length, 3);
 assert.equal(matches('dog dogma hotdog', rule('startsWith', 'dog')).length, 2);
 assert.equal(matches('dog dogma hotdog', rule('endsWith', 'dog')).length, 2);
 assert.deepEqual(matches('a.b axb', rule('contains', 'a.b')), ['a.b']);
});
test('word length and advanced regex', () => {
 assert.deepEqual(matches('one four two café', rule('length', '3')), ['one', 'two']);
 assert.deepEqual(matches('cat cot cut', rule('regex', 'c[ao]t')), ['cat', 'cot']);
 assert.deepEqual(matches('abc', rule('regex', '^')), []);
 assert.throws(() => validateRule(rule('regex', '[')));
 assert.throws(() => validateRule(rule('regex', '(a+)+$')));
 assert.throws(() => validateRule(rule('length', '0')));
});
test('positive and negative overlap retained; match cap enforced', () => {
 const found = matchText('dog dog', compileRules([rule('word', 'dog'), rule('word', 'dog', { kind: 'negative' })]));
 assert.deepEqual(found.map(m => m.kind), ['positive', 'positive', 'negative', 'negative']);
 assert.equal(matchText('dog dog', compileRules([rule('word', 'dog')]), 1).length, 1);
});
test('global and profile enablement', () => {
 const state = defaults(); const p = createProfile('Research'); p.rules.push(rule('word', 'dog')); state.profiles.push(p);
 assert.equal(activeRules(state).length, 1); p.enabled = false; assert.equal(activeRules(state).length, 0);
 p.enabled = true; state.enabled = false; assert.equal(activeRules(state).length, 0);
 assert.throws(() => createProfile(' '));
});
test('storage defaults, migration, validation and future versions', () => {
 assert.deepEqual(migrate(undefined), defaults());
 assert.equal(migrate({ version: 0, enabled: false, profiles: [] }).enabled, false);
 assert.throws(() => migrate({ version: 4 })); assert.throws(() => migrate({ version: 1 }));
 const state = defaults(); state.preferences.positiveColor = 'red;bad'; assert.throws(() => validateState(state));
});
test('repository serializes concurrent writes and recovers after rejection', async () => {
 let data = {}; const area = { get: async () => structuredClone(data), set: async value => { data = structuredClone(value); } };
 const repo = createRepository(area); await repo.initialize();
 await Promise.all([repo.update(s => s.profiles.push(createProfile('A'))), repo.update(s => s.profiles.push(createProfile('B')))]);
 assert.equal((await repo.read()).profiles.length, 2);
 await assert.rejects(repo.update(s => { s.enabled = 'invalid'; }));
 await repo.update(s => { s.enabled = false; }); assert.equal(data[STORAGE_KEY].enabled, false);
});
test('highlight eligibility excludes editable, hidden and interactive content', () => {
 const dom = new JSDOM('<p>dog</p><script>dog</script><style>dog</style><textarea>dog</textarea><button>dog</button><div contenteditable><b>dog</b></div><div hidden>dog</div><input value="dog">');
 const walker = dom.window.document.createTreeWalker(dom.window.document.body, 4); let node; const selected = [];
 while ((node = walker.nextNode())) if (eligible(node)) selected.push(node);
 assert.equal(selected.length, 1); assert.equal(selected[0].parentElement.tagName, 'P');
});
test('range highlights preserve DOM, prioritize negative and clean up', () => {
 const dom = new JSDOM('<p>dog dog</p>'); const document = dom.window.document; const original = document.body.innerHTML;
 const registry = new Map(); const renderer = createRenderer(document, registry, Set);
 renderer.configure(defaults().preferences);
 renderer.add(document.querySelector('p').firstChild, [{ start: 0, end: 3, kind: 'positive' }, { start: 4, end: 7, kind: 'negative' }]);
 assert.equal(document.body.innerHTML, original); assert.equal(registry.get('plug-inu-negative').priority, 1);
 assert.equal([...registry.get('plug-inu-positive')][0].toString(), 'dog');
 renderer.clear(); assert.equal(registry.size, 0); assert.equal(document.querySelector('style'), null);
 renderer.configure(defaults().preferences); assert.equal(registry.get('plug-inu-positive').size, 0);
});
test('connections validate adapters; suggestions are deduplicated without storage writes', async () => {
 const registry = createConnectionRegistry(); const adapter = { id: 'test', connect() {}, disconnect() {} };
 registry.register(adapter); assert.equal(registry.get('test'), adapter); assert.deepEqual(registry.list(), ['test']);
 assert.throws(() => registry.register(adapter)); assert.throws(() => registry.register({ id: 'bad' }));
 assert.deepEqual(await suggestKeywords({ suggest: async () => [' dog ', 'dog', 'cat'] }, 'pets'), ['dog', 'cat']);
 await assert.rejects(suggestKeywords({ suggest: async () => [123] }, 'pets'));
});
