importScripts('core.js');
const defaults = { rule: 'appstore', autoFollow: true, delaySeconds: 12, maxFollows: 20, hoverEnabled: false, snippetsEnabled: false };
const idle = { enabled: false, tabId: null, phase: 'scan', current: null, follows: 0, followBlocked: false, timelineScrollY: 0, message: 'Ready to scan your timeline.' };
let queue = Promise.resolve();
const recordKey = handle => 'profile:' + handle;
async function load() {
  const data = await chrome.storage.local.get(['settings', 'run']);
  return { settings: { ...defaults, ...data.settings }, run: { ...idle, ...data.run } };
}
async function saveRun(run) { await chrome.storage.local.set({ run }); }
async function active(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    const win = await chrome.windows.get(tab.windowId);
    return tab.active && win.focused;
  } catch { return false; }
}
async function ensureScanner(tabId, force = false) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: 'scoutPing' }, { frameId: 0 });
    if (response?.ready && response.version === chrome.runtime.getManifest().version && !force) return;
  } catch { /* An already-open tab may not have the content script yet. */ }
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['core.js', 'content.js', 'hover.js', 'snippets.js'] });
    const response = await chrome.tabs.sendMessage(tabId, { type: 'scoutPing' }, { frameId: 0 });
    if (!response?.ready || response.version !== chrome.runtime.getManifest().version) throw new Error('Scanner did not respond with the current version.');
  } catch {
    throw new Error('Cannot connect to the X tab. Allow this extension access to x.com, refresh the tab, and start again.');
  }
}
async function ensureSnippets(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: 'snippetsPing' }, { frameId: 0 });
    if (response?.snippetsReady && response.version === chrome.runtime.getManifest().version) return;
  } catch { /* No current saved-text controller in this tab. */ }
  await chrome.scripting.executeScript({ target: { tabId }, files: ['core.js', 'snippets.js'] });
}
async function handle(message, sender) {
  const { settings, run } = await load();
  // Extension pages opened in tabs also have sender.tab. Authenticate their
  // extension ID and exact URL instead of treating every tab as an X script.
  const extensionPage = Boolean(sender.id && sender.id === chrome.runtime.id &&
    ['popup.html', 'records.html', 'library.html'].some(path => sender.url === chrome.runtime.getURL(path)));
  const fromPage = Boolean(sender.tab) && !extensionPage;
  const uiOnly = new Set(['start','stop','settings','all','import','retry','reset','hoverSetting','snippetsSetting','snippetDelete']);
  if (fromPage && uiOnly.has(message.type)) throw new Error('This action is available only in the extension.');
  if (message.type === 'status') return { settings, run };
  if (['snippetList','snippetSave','snippetDelete'].includes(message.type)) {
    if (fromPage) {
      let trusted = false;
      try { const url = new URL(sender.url); trusted = sender.id === chrome.runtime.id && url.protocol === 'https:' && ['x.com','twitter.com'].includes(url.hostname); } catch { /* Invalid sender URL. */ }
      if (!trusted || !settings.snippetsEnabled) throw new Error('Enable Save & reuse text on X first.');
    }
    const data = await chrome.storage.local.get(null);
    const entries = Object.entries(data).filter(([key]) => key.startsWith('snippet:'));
    if (message.type === 'snippetList') return { snippets: entries.map(([,value]) => value).sort((a,b) => b.createdAt.localeCompare(a.createdAt)) };
    if (message.type === 'snippetDelete') {
      const key = 'snippet:' + String(message.id);
      if (!entries.some(([entry]) => entry === key)) throw new Error('Saved text not found.');
      await chrome.storage.local.remove(key); return { deleted: true };
    }
    const text = Scout.snippetKey(message.text);
    if (!text || text.length > 50000) throw new Error('Saved text must contain 1–50,000 characters.');
    const duplicate = entries.find(([,value]) => Scout.snippetKey(value.text) === text);
    if (duplicate) return { snippet: duplicate[1], duplicate: true };
    const snippet = { id: crypto.randomUUID(), text, createdAt: new Date().toISOString() };
    await chrome.storage.local.set({ ['snippet:' + snippet.id]: snippet });
    return { snippet, duplicate: false };
  }
  if (message.type === 'snippetsSetting') {
    const next = { ...settings, snippetsEnabled: Boolean(message.enabled) };
    await chrome.storage.local.set({ settings: next });
    if (next.snippetsEnabled) {
      const tabs = await chrome.tabs.query({ url: ['https://x.com/*', 'https://twitter.com/*'] });
      const results = await Promise.allSettled(tabs.map(tab => ensureSnippets(tab.id)));
      if (results.some(r => r.status === 'rejected')) throw new Error('Setting saved. Refresh any X tab where Save & reuse text did not appear.');
    }
    return next;
  }
  if (message.type === 'hoverSetting') {
    const next = { ...settings, hoverEnabled: Boolean(message.enabled) };
    await chrome.storage.local.set({ settings: next });
    // Hover is independent of scanning and can be enabled while stopped.
    if (next.hoverEnabled) {
      const tabs = await chrome.tabs.query({ url: ['https://x.com/*', 'https://twitter.com/*'] });
      const results = await Promise.allSettled(tabs.map(tab => chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['core.js', 'hover.js'] })));
      if (results.some(r => r.status === 'rejected')) throw new Error('Hover saved, but some X tabs could not connect. Refresh those tabs to enable hover.');
    }
    return next;
  }
  if (message.type === 'settings') {
    if (run.enabled) throw new Error('Stop scanning before changing settings.');
    const s = message.settings;
    if (!['appstore','account','either','custom'].includes(s.rule)) throw new Error('Invalid matching rule.');
    const next = { snippetsEnabled: settings.snippetsEnabled, hoverEnabled: settings.hoverEnabled, rule: s.rule, autoFollow: Boolean(s.autoFollow), delaySeconds: Math.max(1, Math.min(120, Number(s.delaySeconds) || 12)), maxFollows: Math.max(1, Math.min(100, Number(s.maxFollows) || 20)) };
    if (s.rule === 'custom') Object.assign(next, Scout.validateFilters(s));
    await chrome.storage.local.set({ settings: next });
    return next;
  }
  if (message.type === 'start') {
    const tab = await chrome.tabs.get(message.tabId);
    const url = new URL(tab.url);
    if (!['x.com', 'twitter.com'].includes(url.hostname)) throw new Error('Open your X timeline first.');
    // Resume a paused in-flight visit only in its original tab.
    if (run.tabId === tab.id && run.current && !Scout.isTimeline(tab.url)) {
      if (run.follows >= settings.maxFollows) run.follows = 0;
      run.enabled = true;
      run.message = 'Resuming the saved profile visit.';
      run.phaseStarted = Date.now();
    } else {
      if (!Scout.isTimeline(tab.url)) throw new Error('Open x.com/home, then start scanning.');
      Object.assign(run, idle, { enabled: true, tabId: tab.id, timelineUrl: url.href, phaseStarted: Date.now(), message: 'Scanning timeline…' });
    }
    await ensureScanner(tab.id, true);
    await saveRun(run);
    return run;
  }
  if (message.type === 'stop') {
    run.enabled = false; run.message = 'Stopped. Progress is saved.';
    await saveRun(run); return run;
  }
  if (message.type === 'all') {
    const data = await chrome.storage.local.get(null);
    return { records: Object.entries(data).filter(([key]) => key.startsWith('profile:')).map(([, value]) => value) };
  }
  if (message.type === 'import') {
    if (run.enabled) throw new Error('Stop scanning before importing.');
    const records = Scout.validateRecords(message.data);
    const existing = await chrome.storage.local.get(records.map(r => recordKey(r.handle)));
    const updates = {};
    for (const record of records) {
      const key = recordKey(record.handle);
      if (!existing[key] || record.checkedAt > existing[key].checkedAt) updates[key] = record;
    }
    await chrome.storage.local.set(updates);
    return { imported: Object.keys(updates).length };
  }
  if (message.type === 'reset') {
    if (run.enabled) throw new Error('Stop scanning before resetting saved profiles.');
    const data = await chrome.storage.local.get(null);
    const keys = Object.keys(data).filter(key => key.startsWith('profile:'));
    // Reset progress first so a worker interruption cannot resume an old visit.
    await saveRun({ ...idle, message: 'Saved profiles reset manually. Settings retained.' });
    await chrome.storage.local.remove(keys);
    return { count: keys.length };
  }
  if (message.type === 'retry') {
    if (run.enabled) throw new Error('Stop scanning before retrying unavailable profiles.');
    const data = await chrome.storage.local.get(null);
    const keys = Object.keys(data).filter(key => key.startsWith('profile:') && ['unavailable','error'].includes(data[key].status) && !['pending','uncertain','followed','requested'].includes(data[key].followStatus));
    await chrome.storage.local.remove(keys);
    return { count: keys.length };
  }
  if (message.type === 'tick' && fromPage) {
    if (sender.tab.id !== run.tabId) return { allowed: false, pauseReason: run.enabled ? 'Scanning is assigned to another X tab.' : run.message };
    if (!run.enabled) return { allowed: false, pauseReason: run.message };
    const allowed = await active(run.tabId);
    return { allowed, settings, run, pauseReason: allowed ? '' : 'Waiting for this X tab to be active. Resumes automatically when you return.' };
  }
  if (!fromPage || sender.tab.id !== run.tabId || !run.enabled) return { allowed: false };
  const allowed = await active(run.tabId);
  if (!allowed) return { allowed: false };
  if (message.type === 'checkpoint') {
    if (run.phase !== 'scan') return { allowed: false };
    run.timelineScrollY = Math.max(0, Number(message.scrollY) || 0);
    await saveRun(run);
    return { allowed: true };
  }
  if (message.type === 'known') {
    const keys = message.handles.filter(h => Scout.handleFromUrl('/' + h) === h).map(recordKey);
    const data = await chrome.storage.local.get(keys);
    return { allowed: true, known: Object.keys(data).map(k => k.slice(8)) };
  }
  if (message.type === 'transition') {
    // Reject a stale content-script tick after navigation or a stop.
    if (message.from !== run.phase || (message.handle && message.handle !== run.current?.handle)) return { allowed: false };
    const legal = { scan: ['profile'], profile: ['about','return'], about: ['follow','return'], follow: ['return'], return: ['scan'] };
    if (!legal[run.phase]?.includes(message.phase)) throw new Error('Invalid scan transition.');
    if (message.phase === 'profile') {
      const c = message.current;
      if (!c || Scout.handleFromUrl('/' + c.handle) !== c.handle) throw new Error('Invalid profile.');
      const existing = (await chrome.storage.local.get(recordKey(c.handle)))[recordKey(c.handle)];
      if (existing) return { allowed: false };
      run.current = { handle: c.handle, scrollY: Math.max(0, Number(c.scrollY) || 0) };
      run.timelineScrollY = run.current.scrollY;
    }
    if (message.phase === 'scan') run.current = null;
    run.phase = message.phase; run.phaseStarted = Date.now(); run.message = String(message.message || '').slice(0, 250);
    if (message.phase === 'profile') {
      // Reserve the visit before the page click. Even an interrupted or failed
      // visit remains on the persistent skip list until explicitly reset.
      const record = { handle: run.current.handle, profileUrl: 'https://x.com/' + run.current.handle,
        checkedAt: new Date().toISOString(), status: 'visiting', followStatus: 'unexamined',
        note: 'Visit started; account details not yet collected.' };
      await chrome.storage.local.set({ run, [recordKey(record.handle)]: record });
    } else await saveRun(run);
    return { allowed: true, run };
  }
  if (message.type === 'record') {
    if (message.record.handle !== run.current?.handle) return { allowed: false };
    const key = recordKey(run.current.handle);
    const previous = (await chrome.storage.local.get(key))[key] || {};
    const record = { ...previous, ...message.record, profileUrl: 'https://x.com/' + run.current.handle, checkedAt: new Date().toISOString() };
    await chrome.storage.local.set({ [key]: record });
    return { allowed: true, record };
  }
  if (message.type === 'followBlocked') {
    run.followBlocked = true;
    run.message = 'X limited following. Continuing to collect profiles.';
    const updates = { run };
    if (run.current) {
      const key = recordKey(run.current.handle);
      const record = (await chrome.storage.local.get(key))[key];
      if (record?.followStatus === 'pending') updates[key] = { ...record, followStatus: 'uncertain', note: 'X reported a follow restriction after the attempt. Review manually; not retried automatically.' };
    }
    await chrome.storage.local.set(updates);
    return { allowed: true };
  }
  if (message.type === 'followPermit') {
    if (run.phase !== 'follow' || run.current?.handle !== message.handle || !settings.autoFollow) return { allowed: false };
    const key = recordKey(message.handle);
    const record = (await chrome.storage.local.get(key))[key];
    if (!record || !Scout.matches(record, settings) || record.followStatus !== 'eligible') return { allowed: false };
    if (run.followBlocked || run.follows >= settings.maxFollows) {
      record.followStatus = 'deferred';
      record.note = 'Saved for future following; current follow allowance is unavailable.';
      run.message = 'Collecting profiles; matching accounts are saved for future following.';
      await chrome.storage.local.set({ [key]: record, run });
      return { allowed: false, deferred: true };
    }
    // Persist intent BEFORE clicking; never repeat an uncertain follow after a crash.
    record.followStatus = 'pending';
    run.follows++; run.lastFollowAt = Date.now();
    await chrome.storage.local.set({ [key]: record, run });
    return { allowed: true };
  }
  if (message.type === 'currentRecord') return { allowed: true, record: (await chrome.storage.local.get(recordKey(run.current.handle)))[recordKey(run.current.handle)] };
  if (message.type === 'pause') {
    run.enabled = false; run.message = String(message.reason).slice(0, 300);
    await saveRun(run); return { allowed: true };
  }
  throw new Error('Unknown request.');
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const task = queue.then(() => handle(message, sender));
  queue = task.catch(() => {});
  task.then(result => sendResponse({ ok: true, ...result }), error => sendResponse({ ok: false, error: error.message }));
  return true;
});
chrome.tabs.onRemoved.addListener(tabId => {
  queue = queue.then(async () => {
    const { run } = await load();
    if (run.tabId === tabId) await saveRun({ ...idle, message: 'Scanner tab closed. Saved profiles will be skipped next time.' });
  }).catch(console.error);
});

// Reloading an unpacked extension invalidates its old content scripts. Reattach
// from the persisted run without clearing profiles, settings, phase or limits.
// This also runs after service-worker suspension; the ping prevents duplicates.
queue = queue.then(async () => {
  const { run } = await load();
  const { settings } = await load();
  if (settings.hoverEnabled) {
    const tabs = await chrome.tabs.query({ url: ['https://x.com/*', 'https://twitter.com/*'] });
    await Promise.allSettled(tabs.map(tab => chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['core.js', 'hover.js'] })));
  }
  if (settings.snippetsEnabled) {
    const tabs = await chrome.tabs.query({ url: ['https://x.com/*', 'https://twitter.com/*'] });
    await Promise.allSettled(tabs.map(tab => ensureSnippets(tab.id)));
  }
  if (!run.enabled || run.tabId == null) return;
  try {
    const tab = await chrome.tabs.get(run.tabId);
    if (!['x.com', 'twitter.com'].includes(new URL(tab.url).hostname)) throw new Error('Saved tab is no longer on X.');
    await ensureScanner(run.tabId);
  } catch {
    await saveRun({ ...run, enabled: false, message: 'Progress preserved. Reopen the saved X tab and click Start to resume.' });
  }
}).catch(console.error);
