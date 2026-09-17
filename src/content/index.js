import { migrate, STORAGE_KEY } from '../storage/model.js';
import { activeRules } from '../profiles/model.js';
import { compileRules, matchText } from '../matching/engine.js';
import { createRenderer, eligible } from '../highlighting/renderer.js';
if (CSS.highlights && globalThis.Highlight) start();
function start() {
  const renderer = createRenderer(document, CSS.highlights, Highlight);
  let state, generation = 0, timer;
  const observer = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(scan, 180); });
  const observe = () => observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['contenteditable', 'hidden', 'aria-hidden'] });
  function scan() {
    const current = ++generation;
    observer.disconnect(); renderer.clear();
    const rules = state ? compileRules(activeRules(state)) : [];
    if (!rules.length) return;
    renderer.configure(state.preferences); observe();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: n => eligible(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
    let count = 0, characters = 0;
    function batch() {
      if (current !== generation) return;
      let node;
      for (let i = 0; i < 60 && (node = walker.nextNode()); i++) {
        if (!node.isConnected || !eligible(node)) continue;
        // Bound work on pathological pages; never truncate a text node and create false boundaries.
        if (node.length > 20000) continue;
        characters += node.length;
        const matches = matchText(node.nodeValue, rules, 5000 - count);
        renderer.add(node, matches); count += matches.length;
        if (count >= 5000 || characters >= 1000000) return;
      }
      if (node) setTimeout(batch, 0);
    }
    batch();
  }
  let revision = 0;
  function apply(raw) {
    try { state = migrate(raw); scan(); } catch (error) { state = undefined; ++generation; observer.disconnect(); renderer.clear(); console.warn('Plug Inu:', error.message); }
  }
  chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes[STORAGE_KEY]) { revision++; apply(changes[STORAGE_KEY].newValue); } });
  const initialRevision = revision;
  chrome.storage.local.get(STORAGE_KEY).then(data => { if (revision === initialRevision) apply(data[STORAGE_KEY]); }).catch(console.error);
}
