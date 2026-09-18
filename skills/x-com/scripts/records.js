const $ = id => document.getElementById(id);
let records = [], rule = 'appstore', page = 0;
async function send(type, data = {}) {
  const result = await chrome.runtime.sendMessage({ type, ...data });
  if (!result.ok) throw new Error(result.error);
  return result;
}
async function refresh() {
  const [result, state] = await Promise.all([send('all'), send('status')]);
  records = result.records;
  rule = state.settings;
  records.sort((a,b) => b.checkedAt.localeCompare(a.checkedAt));
  $('total').textContent = records.length;
  $('matches').textContent = records.filter(r => Scout.matches(r, rule)).length;
  $('followed').textContent = records.filter(r => r.followStatus === 'followed').length;
  render();
}
function render() {
  const search = $('search').value.toLowerCase();
  const filtered = records.filter(r => [r.handle,r.accountBasedIn,r.connectedVia,r.followStatus,r.note].some(value => String(value).toLowerCase().includes(search)));
  page = Math.max(0, Math.min(page, Math.ceil(filtered.length / 100) - 1));
  $('rows').replaceChildren();
  for (const record of filtered.slice(page * 100, (page + 1) * 100)) {
    const row = document.createElement('tr');
    const cell = document.createElement('td'), link = document.createElement('a');
    link.href = 'https://x.com/' + record.handle; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = '@' + record.handle;
    cell.append(link); row.append(cell);
    for (const value of [record.accountBasedIn || 'Unknown', record.connectedVia || 'Unknown', record.followStatus, record.checkedAt ? new Date(record.checkedAt).toLocaleString() : '—', record.note]) {
      const td = document.createElement('td'); td.textContent = value || '—'; row.append(td);
    }
    $('rows').append(row);
  }
  $('empty').hidden = filtered.length > 0;
  $('empty').textContent = records.length ? 'No records match your search.' : 'No saved profiles yet. Open your X timeline and start Scout.';
  $('page').textContent = `${filtered.length ? page + 1 : 0} / ${Math.ceil(filtered.length / 100)}`;
  $('prev').disabled = page === 0; $('next').disabled = (page + 1) * 100 >= filtered.length;
}
function download(content, extension, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a'); anchor.href = url;
  anchor.download = `x-profile-scout-${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`;
  anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
}
async function action(fn) {
  try { await fn(); } catch (error) { $('notice').textContent = error.message; }
}
$('deferred').onclick = () => { $('search').value = 'deferred'; page = 0; render(); };
$('csv').onclick = () => action(async () => { await refresh(); download(Scout.csv(records), 'csv', 'text/csv;charset=utf-8'); });
$('json').onclick = () => action(async () => { await refresh(); download(JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), records }, null, 2), 'json', 'application/json'); });
$('import').onclick = () => $('file').click();
$('file').onchange = () => action(async () => {
  const file = $('file').files[0]; if (!file) return;
  try {
    if (file.size > 50 * 1024 * 1024) throw new Error('Backup must be smaller than 50 MB.');
    const data = JSON.parse(await file.text()); Scout.validateRecords(data);
    const result = await send('import', { data });
    $('notice').textContent = `Imported ${result.imported} new or newer records.`; await refresh();
  } finally { $('file').value = ''; }
});
$('retry').onclick = () => action(async () => { const result = await send('retry'); $('notice').textContent = `${result.count} unavailable records will be checked again when encountered.`; await refresh(); });
$('reset').onclick = () => action(async () => {
  if (!confirm('Delete all saved profiles and scan progress? Profiles can be visited again. Settings and your X follows are unchanged. Export a backup first if needed.')) return;
  const result = await send('reset');
  $('notice').textContent = `Reset ${result.count} saved profiles. Settings retained.`;
  await refresh();
});
$('search').oninput = () => { page = 0; render(); };
$('prev').onclick = () => { page--; render(); }; $('next').onclick = () => { page++; render(); };
let timer;
chrome.storage.onChanged.addListener(() => { clearTimeout(timer); timer = setTimeout(() => action(refresh), 300); });
void action(refresh);
