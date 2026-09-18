const $ = id => document.getElementById(id);
let snippets = [];
async function send(type, extra = {}) {
  const result = await chrome.runtime.sendMessage({ type, ...extra });
  if (!result?.ok) throw new Error(result?.error || 'Saved text could not be loaded.');
  return result;
}
async function action(fn) {
  try { await fn(); } catch (error) { $('notice').textContent = error.message; }
}
function render() {
  $('count').textContent = `${snippets.length} saved`;
  $('items').replaceChildren();
  const shown = snippets.filter(item => item.text.toLowerCase().includes($('search').value.toLowerCase()));
  for (const item of shown) {
    const card = document.createElement('section'); card.className = 'status';
    const text = document.createElement('textarea'); text.readOnly = true; text.rows = 3; text.value = item.text; text.setAttribute('aria-label', 'Saved text');
    const copy = document.createElement('button'); copy.textContent = 'Copy';
    copy.onclick = () => action(async () => {
      try { await navigator.clipboard.writeText(item.text); $('notice').textContent = 'Copied.'; }
      catch { text.focus(); text.select(); $('notice').textContent = 'Text selected. Press Ctrl+C or ⌘C to copy.'; }
    });
    const remove = document.createElement('button'); remove.textContent = 'Delete';
    remove.onclick = () => action(async () => { await send('snippetDelete', { id: item.id }); await refresh(); });
    card.append(text, copy, remove); $('items').append(card);
  }
  if (!shown.length) $('items').textContent = snippets.length ? 'No matching saved text.' : 'No saved text yet.';
}
async function refresh() { snippets = (await send('snippetList')).snippets; render(); }
$('add').onsubmit = event => {
  event.preventDefault();
  void action(async () => {
    const result = await send('snippetSave', { text: $('text').value });
    $('notice').textContent = result.duplicate ? 'This text is already saved.' : 'Text saved.';
    $('text').value = ''; await refresh();
  });
};
$('search').oninput = render;
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && Object.keys(changes).some(key => key.startsWith('snippet:'))) void action(refresh);
});
void action(refresh);
