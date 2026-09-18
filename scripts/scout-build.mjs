// The canonical skill scripts also run as a standalone extension. Adapt only the
// integrated copy to Plug Inu's isolated storage, paths, activation and channel.
export function integratedScout(source, filename) {
  let result = source.replaceAll('chrome.', 'XSkillChrome.');
  if (filename === 'background.js') {
    result = result.replace("importScripts('core.js');", '');
    result = result.replace('async function handle(message, sender) {', `async function handle(message, sender) {
  const isUI = sender.id === XSkillChrome.runtime.id && ['popup.html', 'records.html', 'library.html'].some(path => sender.url === XSkillChrome.runtime.getURL(path));
  let isX = false;
  try { const url = new URL(sender.url); isX = sender.id === XSkillChrome.runtime.id && sender.tab && sender.frameId === 0 && url.protocol === 'https:' && url.hostname === 'x.com'; } catch {}
  if (!isUI && !isX) throw new Error('Untrusted X skill sender.');
  const state = (await chrome.storage.local.get('plugInu')).plugInu;
  if (state?.disabledDomainSkills?.includes('x.com') && !['status','stop','all','snippetList'].includes(message.type)) throw new Error('Activate the x.com skill first.');`);
    result = result.replace("if (!['x.com', 'twitter.com'].includes(url.hostname))", "if (url.protocol !== 'https:' || url.hostname !== 'x.com')");
    result = result.replace("if (!['x.com', 'twitter.com'].includes(new URL(tab.url).hostname))", "if (new URL(tab.url).protocol !== 'https:' || new URL(tab.url).hostname !== 'x.com')");
    result = result.replace("const { run } = await load();\n  const { settings } = await load();", "const state = (await chrome.storage.local.get('plugInu')).plugInu;\n  if (state?.disabledDomainSkills?.includes('x.com')) return;\n  const { run } = await load();\n  const { settings } = await load();");
    result += `
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.plugInu?.newValue?.disabledDomainSkills?.includes('x.com')) return;
  queue = queue.then(async () => {
    const { run, settings } = await load();
    await XSkillChrome.storage.local.set({ run: { ...run, enabled: false, message: 'X skill deactivated. Progress saved.' }, settings: { ...settings, hoverEnabled: false, snippetsEnabled: false } });
  }).catch(console.error);
});
`;
  }
  // Exact-host skills don't implicitly grant access to an alias domain.
  result = result.replaceAll("['https://x.com/*', 'https://twitter.com/*']", "['https://x.com/*']");
  if (filename === 'popup.js') {
    result = result.replace("const [tab] = await XSkillChrome.tabs.query({ active: true, currentWindow: true });", "const tab = await XSkillChrome.tabs.get(Number($('targetTab').value));");
    result = result.replace('window.close();', "await XSkillChrome.tabs.update(tab.id, { active: true });\n    await XSkillChrome.windows.update(tab.windowId, { focused: true });");
    result += `
XSkillChrome.tabs.query({ url: ['https://x.com/*'] }).then(tabs => {
  const select = $('targetTab');
  for (const tab of tabs) { const option = document.createElement('option'); option.value = tab.id; option.textContent = tab.title || tab.url; select.append(option); }
  if (!tabs.length) $('error').textContent = 'Open x.com/home in another tab, then reopen these controls.';
}).catch(error => { $('error').textContent = error.message; });
`;
  }
  return result;
}
export const scoutPlugin = {
  name: 'integrated-x-skill',
  setup(build) {
    build.onLoad({ filter: /skills\/x-com\/scripts\/background\.js$/ }, async ({ path }) => {
      const { readFile } = await import('node:fs/promises');
      return { contents: integratedScout(await readFile(path, 'utf8'), 'background.js'), loader: 'js' };
    });
  },
};
