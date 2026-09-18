(() => {
  'use strict';
  // A boolean left by an invalidated script can survive an extension reload.
  // Replace the controller, including a stalled loop, on explicit Start.
  globalThis.__scoutController?.stop();
  let stopped = false, timer = null;
  const onMessage = (message, sender, respond) => {
    if (message.type === 'scoutPing') respond({ ready: !stopped, version: chrome.runtime.getManifest().version });
  };
  function stop() {
    stopped = true;
    clearInterval(timer);
    try { chrome.runtime.onMessage.removeListener(onMessage); } catch { /* Invalidated context. */ }
    indicator?.remove();
  }
  globalThis.__scoutController = { stop };
  chrome.runtime.onMessage.addListener(onMessage);
  let busy = false, phaseKey = '', elapsed = 0, lastTick = Date.now(), lastAction = 0;
  let restoredScroll = false;
  let scrollStalls = 0, previousHeight = 0, previousScroll = -1;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const visible = node => node && node.getClientRects().length > 0;
  const text = node => node?.innerText || node?.textContent || '';
  const main = () => $('[data-testid="primaryColumn"]') || $('main') || $('[role="main"]');
  const timeline = () => Scout.isTimeline(location.href);
  function scrollRoot() {
    const column = main();
    const article = column && $('article, [data-testid="tweet"]', column);
    for (let node = article?.parentElement || column; node && node !== document.body; node = node.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight) return node;
    }
    return document.scrollingElement || document.documentElement;
  }
  function scrollPosition() {
    const root = scrollRoot();
    return root === document.scrollingElement || root === document.documentElement ? window.scrollY : root.scrollTop;
  }
  function scrollFeed(top, relative = false) {
    const root = scrollRoot();
    const page = root === document.scrollingElement || root === document.documentElement;
    const target = page ? window : root;
    if (relative) target.scrollBy({ top, behavior: 'instant' });
    else target.scrollTo({ top, behavior: 'instant' });
  }
  let indicator;
  function showStatus(message) {
    if (!indicator?.isConnected) {
      indicator = document.createElement('div');
      indicator.id = 'us-profile-scout-status';
      indicator.style.cssText = 'position:fixed;bottom:18px;left:18px;z-index:2147483647;max-width:320px;padding:12px 16px;border:1px solid #6d927b;border-radius:12px;background:#173f36;color:#e6ffd4;font:13px/1.5 system-ui;box-shadow:0 4px 20px #0003;pointer-events:none';
      document.documentElement.append(indicator);
    }
    indicator.textContent = 'Scout · ' + message;
  }
  const profilePath = handle => location.pathname.replace(/\/$/, '').toLowerCase() === '/' + handle;
  const aboutPath = handle => location.pathname.replace(/\/$/, '').toLowerCase() === '/' + handle + '/about';
  async function send(type, payload = {}) {
    if (stopped) throw new Error('Scout controller replaced');
    const reply = await chrome.runtime.sendMessage({ type, ...payload });
    if (stopped) throw new Error('Scout controller replaced');
    if (!reply?.ok) throw new Error(reply?.error || 'Extension did not respond.');
    return reply;
  }
  async function permit() {
    if (document.visibilityState !== 'visible') return false;
    return (await send('tick')).allowed === true;
  }
  async function click(node) {
    if (!visible(node) || node.disabled || node.getAttribute('aria-disabled') === 'true' || !await permit()) return false;
    node.click(); lastAction = Date.now(); return true;
  }
  async function transition(run, phase, message, extra = {}) {
    return send('transition', { from: run.phase, handle: run.current?.handle, phase, message, ...extra });
  }
  async function record(run, fields) {
    return send('record', { record: { handle: run.current.handle, ...fields } });
  }
  async function fail(run, note) {
    const saved = await send('currentRecord');
    const attempted = ['pending', 'uncertain', 'followed', 'requested'].includes(saved.record?.followStatus);
    await record(run, { status: 'unavailable', followStatus: attempted ? (saved.record.followStatus === 'pending' ? 'uncertain' : saved.record.followStatus) : 'skipped', note });
    await transition(run, 'return', note);
  }
  function aboutPanel(handle) {
    const dialog = $$('[role="dialog"]').find(node => visible(node) && /About this account/i.test(text(node)));
    if (dialog) return dialog;
    if (aboutPath(handle) && /About this account/i.test(text(main()))) return main();
    return null;
  }
  function profileHeader() {
    const column = main();
    const name = column && $('[data-testid="UserName"]', column);
    if (!name || name.closest('article')) return null;
    return column;
  }
  function followButton(header, kind) {
    // Scope to profile controls, excluding tweets and recommendation cards.
    return $$(`[data-testid$="-${kind}"]`, header).find(node => visible(node) && !node.closest('article, [data-testid="UserCell"]'));
  }
  async function tick() {
    if (busy || stopped) return;
    busy = true;
    try {
      const now = Date.now(), dt = Math.min(1500, now - lastTick); lastTick = now;
      if (document.visibilityState !== 'visible') return;
      const state = await send('tick');
      if (!state.allowed) {
        if (indicator) showStatus(state.pauseReason || 'Waiting for scanner status…');
        return;
      }
      const { run, settings } = state;
      const editorFocused = document.activeElement?.closest('textarea, input, [contenteditable="true"]');
      const composing = $$('[data-testid^="tweetTextarea_"][contenteditable="true"], textarea[data-testid^="tweetTextarea_"]').some(node => visible(node) && (node.value || text(node)).trim());
      if (editorFocused || composing) {
        showStatus('Paused while you write. Resumes when the editor is clear and unfocused.'); return;
      }
      showStatus(run.message);
      const key = `${run.phase}:${run.current?.handle || ''}:${run.phaseStarted}`;
      if (key !== phaseKey) { phaseKey = key; elapsed = 0; }
      elapsed += dt;
      const handle = run.current?.handle;
      const column = main();
      if (!column) {
        if (elapsed > 30000) await send('pause', { reason: 'X did not load. Check your connection and signed-in session, then resume.' });
        return;
      }
      const notices = $$('[role="alert"], [role="dialog"], [data-testid="toast"]').filter(visible);
      const followLimit = node => /unable to follow|(?:follow|following).{0,80}(?:limit|too many)|(?:limit|too many).{0,80}(?:follow|following)|can't follow|cannot follow/i.test(text(node));
      const limited = notices.find(followLimit);
      if (limited) {
        if (!run.followBlocked) await send('followBlocked');
        run.followBlocked = true;
        if (limited.getAttribute('role') === 'dialog') {
          const close = $('[data-testid="app-bar-close"], [aria-label="Close"]', limited);
          if (close) { await click(close); return; }
          await send('pause', { reason: 'Dismiss the X follow-limit dialog, then resume. Collection progress is saved.' }); return;
        }
      }
      const interruption = notices.some(node => !followLimit(node) && /rate limit|try again later|unusual activity|verify your|authenticate|temporarily restricted|limit reached/i.test(text(node)));
      if (interruption || /\/account\/access|\/i\/flow\/login/.test(location.pathname)) {
        await send('pause', { reason: 'X displayed a restriction or verification prompt. Resolve it before resuming.' }); return;
      }
      if (document.documentElement.lang && !document.documentElement.lang.toLowerCase().startsWith('en')) {
        await send('pause', { reason: 'Use X in English so account labels and follow controls can be read reliably.' }); return;
      }
      if (run.phase === 'scan') {
        if (!timeline()) { await send('pause', { reason: 'Timeline navigation changed. Return to Home and start again.' }); return; }
        if (!restoredScroll) {
          restoredScroll = true;
          // On extension reload, the page normally retains its scroll offset.
          // Restore a saved offset only if the document itself returned to top.
          if (scrollPosition() === 0 && run.timelineScrollY > 0 && await permit()) scrollFeed(run.timelineScrollY);
        }
        if (elapsed < settings.delaySeconds * 1000) {
          showStatus(`Home timeline · next check in ${Math.ceil(settings.delaySeconds - elapsed / 1000)}s`);
          return;
        }
        const candidates = new Map();
        for (const anchor of $$('article [data-testid="User-Name"] a[href], article [data-testid^="UserAvatar-Container"] a[href], article [data-testid="Tweet-User-Avatar"] a[href], [data-testid="tweet"] [data-testid="User-Name"] a[href]', column)) {
          const h = Scout.handleFromUrl(anchor.href);
          if (h && visible(anchor)) candidates.set(h, anchor);
        }
        // Handle markup variants without relying exclusively on author test IDs.
        if (!candidates.size) {
          for (const anchor of $$('article a[href], [data-testid="tweet"] a[href]', column)) {
            const h = Scout.handleFromUrl(anchor.href);
            if (h && visible(anchor)) candidates.set(h, anchor);
          }
        }
        const own = Scout.handleFromUrl($('a[data-testid="AppTabBar_Profile_Link"]')?.href);
        candidates.delete(own);
        const result = await send('known', { handles: [...candidates.keys()] });
        if (!result.allowed) return;
        const known = new Set(result.known);
        const next = [...candidates].find(([h]) => !known.has(h));
        if (next) {
          const [h, anchor] = next;
          const moved = await transition(run, 'profile', `Checking @${h}…`, { current: { handle: h, scrollY: scrollPosition() } });
          if (moved.allowed) await click(anchor);
          scrollStalls = 0;
        } else if (await permit()) {
          const height = scrollRoot().scrollHeight;
          const position = scrollPosition();
          if (previousScroll === position && previousHeight === height) scrollStalls++;
          else scrollStalls = 0;
          previousScroll = position; previousHeight = height;
          showStatus(`Home timeline · scrolling · ${candidates.size} profiles already checked`);
          scrollFeed(Math.round(window.innerHeight * 0.75), true);
          await send('checkpoint', { scrollY: scrollPosition() });
          elapsed = Math.max(0, settings.delaySeconds * 1000 - 2500);
          if (scrollStalls >= 8) await send('pause', { reason: 'No more timeline posts loaded. Refresh Home, then resume.' });
        }
      } else if (run.phase === 'profile') {
        if (aboutPanel(handle)) {
          await transition(run, 'about', `Resuming account details for @${handle}…`); return;
        }
        if (timeline()) {
          const anchor = $$('article a[href]', column).find(a => Scout.handleFromUrl(a.href) === handle);
          if (Date.now() - lastAction > 3000 && anchor) await click(anchor);
          if (elapsed > 30000) await fail(run, 'Profile navigation did not complete.');
          return;
        }
        if (!profilePath(handle)) { await send('pause', { reason: 'Navigation changed during a profile visit. Return to the saved profile to resume.' }); return; }
        const header = profileHeader();
        if (header) {
          const join = $('[data-testid="UserJoinDate"]', header);
          const aboutLink = $$('a[href]', header).find(a => a.pathname?.toLowerCase() === '/' + handle + '/about');
          const target = aboutLink || join?.closest('a, button, [role="button"]') || join;
          if (visible(target)) {
            await record(run, { dateJoined: text(join).replace(/^Joined\s*/i, ''), status: 'checked', followStatus: 'unexamined', note: '' });
            const moved = await transition(run, 'about', `Reading account details for @${handle}…`);
            if (moved.allowed) await click(target);
            return;
          }
        }
        if (elapsed > 20000) await fail(run, 'Joined date / About this account is unavailable.');
      } else if (run.phase === 'about') {
        const panel = aboutPanel(handle);
        if (panel) {
          const details = Scout.parseAbout(text(panel));
          // Allow asynchronously loaded fields to settle; absent data never qualifies.
          if (elapsed < 3500 || (!details.accountBasedIn && !details.connectedVia && elapsed < 18000)) return;
          const existing = await send('currentRecord');
          if (!existing.allowed) return;
          if (!details.dateJoined) details.dateJoined = existing.record?.dateJoined || '';
          const match = Scout.matches(details, settings);
          const deferred = match && settings.autoFollow && (run.followBlocked || run.follows >= settings.maxFollows);
          await record(run, { ...details, status: details.accountBasedIn || details.connectedVia ? 'checked' : 'unavailable', followStatus: deferred ? 'deferred' : match && settings.autoFollow ? 'eligible' : 'skipped', note: deferred ? 'Saved for future following; collection continues after follow limit.' : match ? (settings.autoFollow ? 'Matches selected country and source filters.' : 'Matches; automatic following is off.') : 'Does not match selected country/source filters, or data is unavailable.' });
          await transition(run, match && settings.autoFollow && !deferred ? 'follow' : 'return', match ? `Match: @${handle}` : `Saved @${handle}; returning to timeline…`);
          return;
        }
        if (!profilePath(handle) && !aboutPath(handle)) { await send('pause', { reason: 'Navigation changed while reading account details.' }); return; }
        // A reload can occur after persisting the phase but before the Joined
        // click. Retry that read-only navigation once in the new content script.
        if (profilePath(handle) && elapsed >= 3000 && elapsed < 4500) {
          const header = profileHeader();
          if (header) {
            const join = $('[data-testid="UserJoinDate"]', header);
            const link = $$('a[href]', header).find(a => a.pathname?.toLowerCase() === '/' + handle + '/about');
            await click(link || join?.closest('a, button, [role="button"]') || join);
          }
        }
        if (elapsed > 20000) await fail(run, 'About this account did not open or its labels were not recognized.');
      } else if (run.phase === 'follow') {
        const panel = aboutPanel(handle);
        if (panel) { await leaveAbout(panel, handle); return; }
        if (!profilePath(handle)) { await send('pause', { reason: 'Return to the saved profile before continuing the follow step.' }); return; }
        const header = profileHeader();
        if (!header) { if (elapsed > 25000) await fail(run, 'Profile controls did not load.'); return; }
        const existing = await send('currentRecord');
        if (!existing.allowed) return;
        if (existing.record?.followStatus === 'deferred') {
          await transition(run, 'return', 'Saved for future following; continuing collection…'); return;
        }
        const following = followButton(header, 'unfollow');
        if (following) {
          await record(run, { followStatus: /pending|requested/i.test(text(following)) ? 'requested' : (existing.record.followStatus === 'pending' ? 'followed' : 'already-following') });
          await transition(run, 'return', `Saved follow status for @${handle}.`); return;
        }
        if (['pending','uncertain'].includes(existing.record.followStatus)) {
          if (elapsed < 10000) return;
          await record(run, { followStatus: 'uncertain', note: 'Follow was attempted but could not be confirmed. Check manually; it will not be clicked again.' });
          await transition(run, 'return', 'Follow result unconfirmed; saved for review.'); return;
        }
        if (!settings.autoFollow || !Scout.matches(existing.record, settings)) {
          await record(run, { followStatus: 'skipped', note: 'Following disabled or matching rule changed while paused.' });
          await transition(run, 'return', 'Settings changed; returning to timeline…'); return;
        }
        const button = followButton(header, 'follow');
        if (button && /^Follow(?:\s|$)/i.test(text(button).trim())) {
          if (elapsed < 2500 || Date.now() - (run.lastFollowAt || 0) < settings.delaySeconds * 1000) return;
          const permission = await send('followPermit', { handle });
          if (permission.deferred) { await transition(run, 'return', 'Saved for future following; continuing collection…'); return; }
          if (permission.allowed) { await click(button); elapsed = 0; }
        } else if (elapsed > 20000) {
          await record(run, { followStatus: 'unavailable', note: 'Profile follow button is unavailable.' });
          await transition(run, 'return', 'No follow control found; returning…');
        }
      } else if (run.phase === 'return') {
        const panel = aboutPanel(handle);
        if (panel) { await leaveAbout(panel, handle); return; }
        if (timeline()) {
          if (elapsed < 1500) return;
          if (await permit()) scrollFeed(run.current.scrollY);
          await transition(run, 'scan', 'Scanning timeline…'); return;
        }
        if (!profilePath(handle) && !aboutPath(handle)) { await send('pause', { reason: 'Navigation changed. Open Home to resume scanning.' }); return; }
        if (Date.now() - lastAction > 3000 && await permit()) {
          // Native Back preserves the selected Home feed and its scroll position.
          if (elapsed < 10000 && history.length > 1) history.back();
          else location.assign(run.timelineUrl);
          lastAction = Date.now();
        }
      }
    } catch (error) {
      if (stopped || /Extension context invalidated|Scout controller replaced/.test(error.message)) {
        stop();
      } else {
        console.error('[US Profile Scout]', error);
        try { await send('pause', { reason: 'Scanner error: ' + error.message }); } catch { /* Extension reloaded. */ }
      }
    } finally { busy = false; }
  }
  async function leaveAbout(panel, handle) {
    if (Date.now() - lastAction < 2500) return;
    if (panel.getAttribute('role') === 'dialog') {
      const close = $('[data-testid="app-bar-close"], [aria-label="Close"]', panel);
      if (close) { await click(close); return; }
    }
    if (await permit()) {
      if (aboutPath(handle) && history.length > 1) history.back();
      else location.assign('/' + handle);
      lastAction = Date.now();
    }
  }
  timer = setInterval(tick, 1000);
  void tick();
})();
