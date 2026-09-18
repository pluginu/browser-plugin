(() => {
  'use strict';
  globalThis.__scoutHover?.stop();
  let stopped = false, enabled = false, settings = {}, post = null, handle = null;
  let host = null, panel = null, request = 0, cursor = { x: 0, y: 0 }, configuration = 0;
  const author = node => {
    const selectors = '[data-testid="User-Name"] a[href], [data-testid^="UserAvatar-Container"] a[href], [data-testid="Tweet-User-Avatar"] a[href]';
    for (const anchor of node.querySelectorAll(selectors)) {
      if (anchor.closest('article, [data-testid="tweet"]') !== node) continue;
      if (anchor.closest('[data-testid="quoteTweet"]')) continue;
      const candidate = Scout.handleFromUrl(anchor.href);
      if (candidate) return candidate;
    }
    return null;
  };
  function hide() {
    request++;
    post = null; handle = null;
    host?.remove(); host = null; panel = null;
  }
  function position() {
    if (!host) return;
    const box = host.getBoundingClientRect();
    const left = Math.max(8, Math.min(cursor.x + 16, window.innerWidth - box.width - 8));
    const top = Math.max(8, Math.min(cursor.y + 16, window.innerHeight - box.height - 8));
    host.style.left = left + 'px'; host.style.top = top + 'px';
  }
  function show(lines, match = false) {
    if (!host) {
      host = document.createElement('div');
      host.id = 'scout-profile-hover';
      host.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;max-width:calc(100vw - 16px)';
      const shadow = host.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = ':host{all:initial}div{box-sizing:border-box;width:280px;max-width:calc(100vw - 16px);border:1px solid #6a797e;border-radius:12px;padding:13px 15px;background:#152129;color:#edf2f4;box-shadow:0 6px 24px #0005;font:12px/1.5 system-ui;overflow-wrap:anywhere}div.match{border:2px solid #79cc92;background:#123a27}p{margin:4px 0}p:first-child{font-weight:700;font-size:13px}';
      panel = document.createElement('div'); panel.setAttribute('role', 'tooltip');
      shadow.append(style, panel); document.documentElement.append(host);
    }
    panel.classList.toggle('match', match);
    panel.replaceChildren(...lines.map(value => {
      const line = document.createElement('p'); line.textContent = value; return line;
    }));
    position();
  }
  async function lookup() {
    const token = ++request, target = post, user = handle;
    show(['@' + user, 'Looking up saved country…']);
    try {
      const key = 'profile:' + user;
      const data = await chrome.storage.local.get(key);
      if (stopped || !enabled || token !== request || post !== target || !target?.isConnected || !Scout.isTimeline(location.href)) return;
      // X reuses timeline nodes; do not show the previous author's data.
      if (author(target) !== user) { hide(); return; }
      const record = data[key];
      if (!record) { show(['@' + user, 'No saved country — profile not checked yet.']); return; }
      const via = Scout.connection(record.connectedVia);
      const hasCountry = Boolean(record.accountBasedIn || via.country);
      const filters = Scout.filterSettings(settings);
      const countryMatch = Scout.matches(record, { rule: 'custom', ...filters, sources: ['any'] });
      const fullMatch = Scout.matches(record, settings);
      const lines = ['@' + user,
        hasCountry ? (countryMatch ? '✓ Country matches your selection' : 'Country does not match your selection') : 'No country saved for this profile',
        'Account based in: ' + (record.accountBasedIn || 'Unknown'),
        'Connected via: ' + (record.connectedVia || 'Unknown')];
      if (hasCountry) lines.push(fullMatch ? 'Matches your country + source filters' : 'Does not match all follow filters');
      if (record.status === 'visiting') lines.push('Profile check is in progress or was interrupted.');
      show(lines, countryMatch);
    } catch {
      if (token === request && !stopped) show(['@' + user, 'Saved data could not be read. Reopen the extension.']);
    }
  }
  function move(event) {
    if (!enabled || !Scout.isTimeline(location.href)) { hide(); return; }
    const target = event.target instanceof Element ? event.target.closest('article, [data-testid="tweet"]') : null;
    if (!target || !target.closest('main, [role="main"], [data-testid="primaryColumn"]')) { hide(); return; }
    const nextHandle = author(target);
    if (!nextHandle) { hide(); return; }
    cursor = { x: event.clientX, y: event.clientY };
    if (target === post && nextHandle === handle) { position(); return; }
    post = target; handle = nextHandle; void lookup();
  }
  async function configure() {
    const token = ++configuration;
    try {
      const data = await chrome.storage.local.get('settings');
      if (stopped || token !== configuration) return;
      settings = data.settings || {}; enabled = settings.hoverEnabled === true;
      if (!enabled) hide();
      else if (post) void lookup();
    } catch { if (!stopped) hide(); }
  }
  function changed(changes, area) {
    if (area !== 'local') return;
    if (changes.settings) void configure();
    else if (handle && changes['profile:' + handle]) void lookup();
  }
  const leave = event => { if (!event.relatedTarget) hide(); };
  const observer = new MutationObserver(() => {
    if (post && (!post.isConnected || !Scout.isTimeline(location.href) || author(post) !== handle)) hide();
  });
  observer.observe(document.body || document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
  document.addEventListener('pointermove', move, { passive: true });
  document.addEventListener('pointerout', leave);
  document.addEventListener('scroll', hide, true);
  window.addEventListener('blur', hide);
  chrome.storage.onChanged.addListener(changed);
  globalThis.__scoutHover = { stop() {
    stopped = true; hide(); observer.disconnect();
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerout', leave);
    document.removeEventListener('scroll', hide, true);
    window.removeEventListener('blur', hide);
    try { chrome.storage.onChanged.removeListener(changed); } catch { /* Extension reloaded. */ }
  } };
  void configure();
})();
