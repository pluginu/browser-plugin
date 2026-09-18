(() => {
  'use strict';
  globalThis.__scoutSnippets?.stop();
  let stopped = false, enabled = false, library = [], field = null, caret = null;
  let pending = null, offered = null, promptHost = null, pickerHost = null, pickerBody = null, pickerOpen = false;
  let configuration = 0, pendingTimer = null, offerRequest = 0;
  const editorSelector = '[data-testid^="tweetTextarea_"][contenteditable="true"], [data-testid^="tweetTextarea_"] [contenteditable="true"], textarea[data-testid^="tweetTextarea_"]';
  const sendButtons = '[data-testid="tweetButton"], [data-testid="tweetButtonInline"]';
  const toastSelector = '[data-testid="toast"], [role="alert"]';
  const textOf = node => node?.value ?? node?.innerText ?? node?.textContent ?? '';
  const duplicate = text => library.some(item => Scout.snippetKey(item.text) === Scout.snippetKey(text));
  async function send(type, extra = {}) {
    const result = await chrome.runtime.sendMessage({ type, ...extra });
    if (!result?.ok) throw new Error(result?.error || 'Saved text is unavailable.');
    return result;
  }
  function clearPending() { pending = null; clearTimeout(pendingTimer); }
  function closePrompt() { offerRequest++; promptHost?.remove(); promptHost = null; offered = null; }
  function closePicker() { pickerHost?.remove(); pickerHost = null; pickerBody = null; pickerOpen = false; }
  function widget(id, bottom = false) {
    const host = document.createElement('div'); host.id = id;
    host.style.cssText = 'position:fixed;z-index:2147483646;max-width:calc(100vw - 24px);' + (bottom ? 'bottom:18px;right:18px' : '');
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = ':host{all:initial}section{box-sizing:border-box;width:300px;max-width:calc(100vw - 24px);padding:12px;border:1px solid #77928a;border-radius:12px;background:#f5faf6;color:#173d32;box-shadow:0 5px 24px #0003;font:12px/1.5 system-ui}p{margin:0 0 8px}p.preview{white-space:pre-wrap;max-height:92px;overflow:auto;overflow-wrap:anywhere;color:#4a6158}button{cursor:pointer;font:600 12px system-ui;border:1px solid #bacdc2;border-radius:7px;padding:7px 10px;margin:3px;background:white;color:#173d32}button.primary{background:#173f36;color:#efffe8}button.item{display:block;width:100%;margin:5px 0;text-align:left;white-space:pre-wrap;overflow-wrap:anywhere;max-height:100px;overflow:auto}input{box-sizing:border-box;width:100%;font:12px system-ui;padding:7px;border:1px solid #bacdc2;border-radius:6px}button:focus-visible,input:focus-visible{outline:2px solid #358c58}section.compact{width:auto;padding:3px}div.list{max-height:220px;overflow:auto}';
    const body = document.createElement('section');
    body.addEventListener('mousedown', event => { if (event.target instanceof HTMLButtonElement) event.preventDefault(); });
    shadow.append(style, body); document.documentElement.append(host);
    return { host, body };
  }
  function button(label, handler, className = '') {
    const node = document.createElement('button'); node.type = 'button'; node.textContent = label; node.className = className;
    node.addEventListener('click', handler); return node;
  }
  function paragraph(value, className = '') {
    const p = document.createElement('p'); p.textContent = value; p.className = className; return p;
  }
  async function offer(text) {
    if (!enabled || stopped) return;
    const token = ++offerRequest;
    // Check the shared library again before asking: another tab may just have
    // saved the same text, or the initial library load may still be pending.
    try {
      const result = await send('snippetList');
      if (token !== offerRequest || !enabled || stopped) return;
      library = result.snippets;
    } catch { return; }
    if (duplicate(text)) return;
    closePrompt(); offered = text;
    const { host, body } = widget('scout-save-text', true); promptHost = host;
    body.setAttribute('role', 'dialog'); body.setAttribute('aria-label', 'Save sent text for reuse');
    body.append(paragraph('Save this text for reuse?'), paragraph(text, 'preview'));
    const save = button('Save text', async () => {
      save.disabled = true;
      try {
        const result = await send('snippetSave', { text });
        if (!library.some(item => item.id === result.snippet.id)) library.unshift(result.snippet);
        if (promptHost === host) closePrompt();
      } catch (error) {
        if (promptHost === host) { body.append(paragraph(error.message)); save.disabled = false; }
      }
    }, 'primary');
    body.append(save, button('Not now', closePrompt));
  }
  function visible(node) { return node && node.getClientRects().length > 0; }
  function composerFor(buttonNode) {
    for (let scope = buttonNode.parentElement; scope; scope = scope.parentElement) {
      const editors = [...scope.querySelectorAll(editorSelector)].filter(visible);
      if (editors.length) {
        // Threads with several editors have ambiguous completion signals. Do not
        // offer an arbitrary text from another editor.
        return editors.length === 1 ? editors[0] : null;
      }
    }
    return null;
  }
  function capture(editor, buttonNode) {
    if (!enabled || stopped || !editor || !visible(editor) || buttonNode?.disabled || buttonNode?.getAttribute('aria-disabled') === 'true') return;
    const text = Scout.snippetKey(textOf(editor));
    if (!text || text.length > 50000) return;
    clearPending();
    pending = { text, editor, toasts: new Map([...document.querySelectorAll(toastSelector)].map(node => [node, textOf(node)])) };
    pendingTimer = setTimeout(clearPending, 45000);
  }
  function clicked(event) {
    if (!enabled || !(event.target instanceof Element)) return;
    const node = event.target.closest(sendButtons);
    if (node) capture(composerFor(node), node);
  }
  function keyed(event) {
    if (event.key === 'Escape') { closePrompt(); closePicker(); return; }
    if (!enabled || event.key !== 'Enter' || (!event.ctrlKey && !event.metaKey)) return;
    const editor = event.target instanceof Element ? event.target.closest(editorSelector) : null;
    if (editor) capture(editor, null);
  }
  function inspect() {
    if (field && !field.isConnected) { field = null; caret = null; closePicker(); }
    if (!enabled || !pending) return;
    const changed = [...document.querySelectorAll(toastSelector)].filter(node => visible(node) && pending.toasts.get(node) !== textOf(node));
    if (changed.some(node => /(?:failed|unable|could not|couldn't|not sent|try again|went wrong|limit)/i.test(textOf(node)))) { clearPending(); return; }
    const sent = changed.some(node => /\b(?:your\s+)?(?:post|reply|tweet)\s+(?:(?:was|has been)\s+)?sent\b|\b(?:post|reply|tweet)\s+published\b/i.test(textOf(node)));
    if (!sent) return;
    // Require a fresh X success message plus the captured editor clearing or
    // closing. Clicking Post or closing a modal alone is not proof of success.
    if (pending.editor.isConnected && Scout.snippetKey(textOf(pending.editor)) !== '') return;
    const text = pending.text; clearPending(); offer(text);
  }
  function editable(target) {
    if (!(target instanceof Element)) return null;
    const node = target.closest('textarea, input[type="text"], input[type="search"], input:not([type]), [contenteditable="true"], [contenteditable="plaintext-only"]');
    if (!node || node.disabled || node.readOnly || node.getAttribute('aria-disabled') === 'true' || node.getAttribute('aria-readonly') === 'true') return null;
    return node;
  }
  function remember() {
    if (!field) return;
    if ('selectionStart' in field) caret = { start: field.selectionStart, end: field.selectionEnd };
    else {
      const selection = window.getSelection();
      if (selection?.rangeCount && field.contains(selection.anchorNode) && field.contains(selection.focusNode)) caret = { range: selection.getRangeAt(0).cloneRange() };
    }
  }
  function positionPicker() {
    if (!pickerHost || !field?.isConnected) return;
    const box = field.getBoundingClientRect();
    pickerHost.style.left = Math.max(8, Math.min(box.right - 300, window.innerWidth - 312)) + 'px';
    pickerHost.style.top = Math.max(8, Math.min(box.bottom + 4, window.innerHeight - (pickerOpen ? 330 : 48))) + 'px';
  }
  function reuse(text, resultNode) {
    if (!enabled || !field?.isConnected || !editable(field)) { closePicker(); return; }
    const target = field, selection = caret;
    target.focus();
    try {
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        const start = selection?.start ?? target.value.length, end = selection?.end ?? start;
        const next = target.value.slice(0, start) + text + target.value.slice(end);
        const proto = target instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(target, next);
        target.setSelectionRange(start + text.length, start + text.length);
        target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
      } else {
        const range = selection?.range && target.contains(selection.range.commonAncestorContainer) ? selection.range : document.createRange();
        if (range !== selection?.range) { range.selectNodeContents(target); range.collapse(false); }
        const selected = window.getSelection(); selected.removeAllRanges(); selected.addRange(range);
        // Native insertion lets X's rich editor maintain its state and undo
        // history. If unsupported, leave the draft alone and offer Copy.
        if (!document.execCommand?.('insertText', false, text)) throw new Error('Use Copy, then paste into this editor.');
      }
      closePicker();
    } catch (error) { resultNode.textContent = error.message; }
  }
  function renderPicker() {
    if (!pickerBody) return;
    const body = pickerBody; body.replaceChildren(); body.className = pickerOpen ? '' : 'compact';
    if (!pickerOpen) { body.append(button('Saved text', () => { remember(); pickerOpen = true; renderPicker(); })); positionPicker(); return; }
    body.append(paragraph('Choose saved text to insert'));
    const search = document.createElement('input'); search.type = 'search'; search.placeholder = 'Search saved text…'; search.setAttribute('aria-label', 'Search saved text');
    const current = Scout.snippetKey(textOf(field));
    search.value = current.length <= 200 && library.some(item => item.text.toLowerCase().includes(current.toLowerCase())) ? current : '';
    const list = document.createElement('div'); list.className = 'list';
    const feedback = paragraph(''); feedback.setAttribute('role', 'status');
    function draw() {
      list.replaceChildren();
      const items = library.filter(item => item.text.toLowerCase().includes(search.value.toLowerCase())).slice(0, 15);
      for (const item of items) {
        list.append(button(item.text, () => reuse(item.text, feedback), 'item'));
        list.append(button('Copy', async () => {
          try { await navigator.clipboard.writeText(item.text); feedback.textContent = 'Copied. Paste it into your text box.'; }
          catch { feedback.textContent = 'Copy unavailable. Open Saved text library to select and copy the text.'; }
        }));
      }
      if (!items.length) list.append(paragraph(library.length ? 'No matching saved text.' : 'Your saved text will appear here after you choose Save text.'));
    }
    search.addEventListener('input', draw); body.append(search, list, feedback, button('Close', closePicker)); draw(); positionPicker();
  }
  function focused(event) {
    if (!enabled) return;
    const next = editable(event.target);
    if (!next) { if (event.target !== pickerHost) closePicker(); return; }
    if (next === field && pickerHost) return;
    field = next; caret = null; remember(); closePicker();
    const widgetParts = widget('scout-text-picker'); pickerHost = widgetParts.host; pickerBody = widgetParts.body;
    renderPicker();
  }
  function selectionChanged(event) { if (event.target === field) remember(); }
  async function configure() {
    const token = ++configuration;
    try {
      const { settings } = await chrome.storage.local.get('settings');
      if (stopped || token !== configuration) return;
      enabled = settings?.snippetsEnabled === true;
      if (!enabled) { clearPending(); closePrompt(); closePicker(); library = []; return; }
      const result = await send('snippetList');
      if (stopped || token !== configuration) return;
      library = result.snippets;
      if (offered && duplicate(offered)) closePrompt();
      if (pickerBody) renderPicker();
    } catch { if (!stopped) { enabled = false; clearPending(); closePrompt(); closePicker(); } }
  }
  function changed(changes, area) {
    if (area === 'local' && (changes.settings || Object.keys(changes).some(key => key.startsWith('snippet:')))) void configure();
  }
  const ping = (message, sender, respond) => {
    if (message.type === 'snippetsPing') respond({ snippetsReady: !stopped, version: chrome.runtime.getManifest().version });
  };
  chrome.runtime.onMessage.addListener(ping);
  const observer = new MutationObserver(inspect);
  observer.observe(document.body || document.documentElement, { subtree: true, childList: true, characterData: true });
  document.addEventListener('click', clicked, true);
  document.addEventListener('keydown', keyed, true);
  document.addEventListener('focusin', focused);
  for (const name of ['input','keyup','pointerup']) document.addEventListener(name, selectionChanged);
  window.addEventListener('resize', positionPicker);
  document.addEventListener('scroll', closePicker, true);
  chrome.storage.onChanged.addListener(changed);
  globalThis.__scoutSnippets = { stop() {
    stopped = true; clearPending(); closePrompt(); closePicker(); observer.disconnect();
    document.removeEventListener('click', clicked, true);
    document.removeEventListener('keydown', keyed, true);
    document.removeEventListener('focusin', focused);
    for (const name of ['input','keyup','pointerup']) document.removeEventListener(name, selectionChanged);
    window.removeEventListener('resize', positionPicker);
    document.removeEventListener('scroll', closePicker, true);
    try { chrome.runtime.onMessage.removeListener(ping); chrome.storage.onChanged.removeListener(changed); } catch { /* Old extension context. */ }
  } };
  void configure();
})();
