// Adapt the standalone Scout runtime without sharing its keys or message channel.
(() => {
  if (globalThis.XSkillChrome) return;
  const prefix = 'domain:x.com:';
  const runtimeRoot = 'domain-runtime/x-com/';
  const listeners = new WeakMap();
  const events = new WeakMap();
  const local = chrome.storage.local;
  const enabled = data => !data?.disabledDomainSkills?.includes('x.com');
  const unwrap = data => Object.fromEntries(Object.entries(data).filter(([key]) => key.startsWith(prefix)).map(([key, value]) => [key.slice(prefix.length), value]));
  const storage = {
    local: {
      async get(keys) {
        const names = Array.isArray(keys) ? keys : [keys];
        const data = await local.get(keys === null ? null : [...names.map(key => prefix + key), 'plugInu']);
        const scoped = unwrap(data);
        // A worker can be interrupted between persisting deactivation and its
        // stopped run. Also mask stale enabled values on the next page load.
        if (!enabled(data.plugInu)) {
          if (scoped.settings) scoped.settings = { ...scoped.settings, hoverEnabled: false, snippetsEnabled: false };
          if (scoped.run) scoped.run = { ...scoped.run, enabled: false };
        }
        return scoped;
      },
      set(values) { return local.set(Object.fromEntries(Object.entries(values).map(([key, value]) => [prefix + key, value]))); },
      remove(keys) { return local.remove((Array.isArray(keys) ? keys : [keys]).map(key => prefix + key)); },
    },
    onChanged: {
      addListener(fn) {
        const wrapped = (changes, area) => {
          const scoped = unwrap(changes);
          if (area === 'local' && changes.plugInu && !enabled(changes.plugInu.newValue)) {
            globalThis.__scoutController?.stop(); globalThis.__scoutHover?.stop(); globalThis.__scoutSnippets?.stop();
          }
          if (Object.keys(scoped).length) fn(scoped, area);
        };
        events.set(fn, wrapped); chrome.storage.onChanged.addListener(wrapped);
      },
      removeListener(fn) { const wrapped = events.get(fn); if (wrapped) chrome.storage.onChanged.removeListener(wrapped); events.delete(fn); },
    },
  };
  const runtime = {
    id: chrome.runtime.id,
    getManifest: () => chrome.runtime.getManifest(),
    getURL: path => chrome.runtime.getURL(runtimeRoot + path),
    sendMessage: message => chrome.runtime.sendMessage({ ...message, namespace: 'x.com' }),
    onMessage: {
      addListener(fn) {
        const wrapped = (message, sender, respond) => {
          if (message?.namespace !== 'x.com') return;
          fn(message, sender, respond);
          return true;
        };
        listeners.set(fn, wrapped); chrome.runtime.onMessage.addListener(wrapped);
      },
      removeListener(fn) { const wrapped = listeners.get(fn); if (wrapped) chrome.runtime.onMessage.removeListener(wrapped); listeners.delete(fn); },
    },
  };
  globalThis.XSkillChrome = {
    storage, runtime,
    windows: chrome.windows,
    tabs: chrome.tabs && {
      query: options => chrome.tabs.query(options), get: id => chrome.tabs.get(id), create: options => chrome.tabs.create(options),
      update: (id, options) => chrome.tabs.update(id, options), onRemoved: chrome.tabs.onRemoved,
      sendMessage: (id, message, options) => chrome.tabs.sendMessage(id, { ...message, namespace: 'x.com' }, options),
    },
    scripting: chrome.scripting && {
      executeScript: options => chrome.scripting.executeScript({ ...options, files: ['bridge.js', ...options.files].map(path => runtimeRoot + path) }),
    },
  };
})();
