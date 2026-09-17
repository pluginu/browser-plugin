import { createRepository } from '../storage/repository.js';
import { createProfile } from '../profiles/model.js';
const repository = createRepository(chrome.storage.local);
chrome.runtime.onInstalled.addListener(() => repository.initialize().catch(console.error));
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || sender.tab || !sender.url?.startsWith(chrome.runtime.getURL(''))) return;
  const action = message?.action;
  const task = action === 'read' ? repository.read() : repository.update(state => {
    const profile = state.profiles.find(p => p.id === message.profileId);
    switch (action) {
      case 'toggleGlobal': state.enabled = !state.enabled; break;
      case 'addProfile': state.profiles.push(createProfile(message.name)); break;
      case 'toggleProfile': if (!profile) throw new Error('Profile no longer exists.'); profile.enabled = !profile.enabled; break;
      case 'deleteProfile': state.profiles = state.profiles.filter(p => p.id !== message.profileId); break;
      case 'addRule': if (!profile) throw new Error('Profile no longer exists.'); profile.rules.push({ ...message.rule, id: crypto.randomUUID() }); break;
      case 'deleteRule': if (profile) profile.rules = profile.rules.filter(r => r.id !== message.ruleId); break;
      case 'preferences': state.preferences = { ...state.preferences, ...message.preferences }; break;
      default: throw new Error('Unknown action.');
    }
  });
  task.then(state => respond({ state }), error => respond({ error: error.message }));
  return true;
});
