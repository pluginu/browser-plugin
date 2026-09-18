const $ = id => document.getElementById(id);
async function send(type, data = {}) {
  const response = await chrome.runtime.sendMessage({ type, ...data });
  if (!response.ok) throw new Error(response.error);
  return response;
}
async function refresh(fill = false) {
  const { settings, run } = await send('status');
  if (fill) {
    const filters = Scout.filterSettings(settings);
    $('rule').value = filters.countryField;
    $('countries').value = filters.countries.join('\n');
    document.querySelectorAll('[name="source"]').forEach(input => { input.checked = filters.sources.includes(input.value); });
    $('autoFollow').checked = settings.autoFollow;
    $('delay').value = settings.delaySeconds; $('limit').value = settings.maxFollows;
  }
  $('snippetsEnabled').checked = settings.snippetsEnabled === true;
  $('hoverEnabled').checked = settings.hoverEnabled === true;
  $('badge').textContent = run.enabled ? 'Enabled' : 'Stopped';
  $('badge').classList.toggle('running', run.enabled);
  $('status').textContent = run.message;
  $('progress').textContent = `${run.follows} follow attempts this run · ${run.enabled && (run.followBlocked || run.follows >= settings.maxFollows) ? 'Collecting only; matches saved for later' : 'Progress saved on this device'}`;
  $('start').hidden = run.enabled; $('stop').hidden = !run.enabled;
  for (const id of ['rule','countries','sources','autoFollow','delay','limit']) $(id).disabled = run.enabled;
}
async function action(fn) {
  $('error').textContent = '';
  try { await fn(); await refresh(); } catch (error) { $('error').textContent = error.message; }
}
$('settings').addEventListener('submit', event => {
  event.preventDefault();
  void action(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await send('settings', { settings: { rule: 'custom', countryField: $('rule').value, countries: $('countries').value.split(/[,\n]/).map(c => c.trim()).filter(Boolean), sources: [...document.querySelectorAll('[name="source"]:checked')].map(input => input.value), autoFollow: $('autoFollow').checked, delaySeconds: Number($('delay').value), maxFollows: Number($('limit').value) } });
    await send('start', { tabId: tab.id });
    window.close();
  });
});
$('snippetsEnabled').addEventListener('change', () => action(() => send('snippetsSetting', { enabled: $('snippetsEnabled').checked })));
$('library').addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('library.html') }));
$('hoverEnabled').addEventListener('change', () => action(() => send('hoverSetting', { enabled: $('hoverEnabled').checked })));
$('stop').addEventListener('click', () => action(() => send('stop')));
$('records').addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('records.html') }));
chrome.storage.onChanged.addListener(() => { refresh().catch(error => { $('error').textContent = error.message; }); });
refresh(true).catch(error => { $('error').textContent = error.message; });
