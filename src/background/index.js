import { domainPackages } from '../domains/packages.js';
import '../domains/x-runtime.js';
import { listSkills, loadSkill, loadAction, skillMarkdown } from '../domains/model.js';
import { createRepository } from '../storage/repository.js';
import { createProfile } from '../profiles/model.js';
const repository = createRepository(chrome.storage.local);
chrome.runtime.onInstalled.addListener(() => repository.initialize().catch(console.error));
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (!message?.action) return;
  if (sender.id !== chrome.runtime.id || !['popup.html', 'sidepanel.html', 'options.html', 'skills.html'].some(path => sender.url === chrome.runtime.getURL(path))) return;
  const action = message?.action;
  if (action === 'listDomainSkills' || action === 'loadDomainSkill' || action === 'loadDomainAction') {
    repository.read().then(state => {
      if (action === 'listDomainSkills') return { skills: listSkills(state.domainSkills, state.disabledDomainSkills) };
      if (action === 'loadDomainAction') return { plan: loadAction(message.url, message.actionId, message.mode, state.domainSkills, state.disabledDomainSkills) };
      const skill = loadSkill(message.url, state.domainSkills, state.disabledDomainSkills);
      return { skill, markdown: skillMarkdown(skill), package: domainPackages[skill.domain] ?? null };
    }).then(respond, error => respond({ error: error.message }));
    return true;
  }
  const task = action === 'read' ? repository.read() : repository.update(state => {
    const profile = state.profiles.find(p => p.id === message.profileId);
    switch (action) {
      case 'saveDomainSkill': {
        const skill = message.skill;
        if (!skill || typeof skill.domain !== 'string') throw new Error('Invalid domain skill.');
        state.domainSkills = state.domainSkills.filter(item => item.domain !== skill.domain);
        state.domainSkills.push(skill);
        break;
      }
      case 'setDomainSkillActive':
        if (typeof message.active !== 'boolean' || !listSkills(state.domainSkills).some(skill => skill.domain === message.domain)) throw new Error('Unknown domain or invalid activation state.');
        state.disabledDomainSkills = state.disabledDomainSkills.filter(domain => domain !== message.domain);
        if (!message.active) state.disabledDomainSkills.push(message.domain);
        break;
      case 'deleteDomainSkill':
        state.domainSkills = state.domainSkills.filter(item => item.domain !== message.domain);
        if (!listSkills(state.domainSkills).some(skill => skill.domain === message.domain)) state.disabledDomainSkills = state.disabledDomainSkills.filter(domain => domain !== message.domain);
        break;
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
