import { bundledSkills } from './bundled.js';
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const object = value => value && typeof value === 'object' && !Array.isArray(value);
function text(value, max = 10000) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error('Skill text is missing or too long.');
}
export function normalizeDomain(value) {
  text(value, 253);
  const domain = value.toLowerCase();
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(domain)) throw new Error('Use an exact domain such as x.com (without a URL or wildcard).');
  return domain;
}
function url(value, domain) {
  text(value, 2000);
  const parsed = new URL(value);
  if (!['https:', 'http:'].includes(parsed.protocol) || parsed.hostname !== domain || parsed.username || parsed.password) throw new Error('Skill URLs must use HTTP/HTTPS on the exact skill domain without credentials.');
}
function fields(value) {
  if (!Array.isArray(value) || value.length > 50) throw new Error('Inputs and outputs must be arrays with at most 50 fields.');
  const names = new Set();
  for (const field of value) {
    if (!object(field)) throw new Error('Invalid input/output field.');
    text(field.name, 80); text(field.description);
    if (names.has(field.name) || !['string', 'number', 'boolean', 'object', 'array'].includes(field.type)) throw new Error('Invalid or duplicate input/output field.');
    names.add(field.name);
  }
}
export function validateSkill(skill, partial = false) {
  if (!object(skill)) throw new Error('Invalid domain skill.');
  const allowed = ['domain', 'name', 'description', 'instructions', 'urls', 'inputs', 'outputs', 'actions'];
  if (Object.keys(skill).some(key => !allowed.includes(key))) throw new Error('Unknown domain skill field.');
  const domain = normalizeDomain(skill.domain);
  if (domain !== skill.domain) throw new Error('Save skill domains in lowercase.');
  for (const key of ['name', 'description', 'instructions']) if (!partial || own(skill, key)) text(skill[key]);
  if (!partial || own(skill, 'urls')) {
    if (!Array.isArray(skill.urls) || !skill.urls.length || skill.urls.length > 50) throw new Error('Provide 1–50 skill URLs.');
    skill.urls.forEach(value => url(value, domain));
  }
  for (const key of ['inputs', 'outputs']) if (!partial || own(skill, key)) fields(skill[key]);
  if (!partial || own(skill, 'actions')) {
    if (!Array.isArray(skill.actions) || skill.actions.length > 50) throw new Error('Provide at most 50 actions.');
    const ids = new Set();
    for (const action of skill.actions) {
      if (!object(action) || Object.keys(action).some(key => !['id', 'description', 'url', 'inputs', 'outputs', 'instructions', 'disabled', 'execution'].includes(key))) throw new Error('Invalid action.');
      if (own(action, 'execution')) {
        const execution = action.execution;
        if (!object(execution) || Object.keys(execution).some(key => !['modes', 'script'].includes(key)) || !Array.isArray(execution.modes) || !execution.modes.length || new Set(execution.modes).size !== execution.modes.length || execution.modes.some(mode => !['llm', 'script'].includes(mode))) throw new Error('Invalid execution modes.');
        if (execution.modes.includes('script')) {
          const script = execution.script;
          if (!object(script) || Object.keys(script).some(key => !['entry', 'operation'].includes(key))) throw new Error('Invalid script descriptor.');
          text(script.entry, 200); text(script.operation, 200);
          if (!/^scripts\/[a-z0-9][a-z0-9/.-]*$/.test(script.entry) || script.entry.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Script entry must be a relative packaged scripts path.');
        } else if (own(execution, 'script')) throw new Error('Script descriptor requires script mode.');
      }
      text(action.id, 80);
      if (ids.has(action.id)) throw new Error('Duplicate action ID.');
      ids.add(action.id);
      if (own(action, 'disabled') && typeof action.disabled !== 'boolean') throw new Error('Invalid action disabled flag.');
      for (const key of ['description', 'instructions']) if (!partial || own(action, key)) text(action[key]);
      if (!partial || own(action, 'url')) url(action.url, domain);
      for (const key of ['inputs', 'outputs']) if (!partial || own(action, key)) fields(action[key]);
    }
  }
  return skill;
}
export function mergeSkill(base, local) {
  if (base) validateSkill(base);
  if (local) validateSkill(local, true);
  if (base && local && base.domain !== local.domain) throw new Error('Cannot merge different domains.');
  const merged = { ...base, ...local };
  const actions = new Map((base?.actions ?? []).map(action => [action.id, action]));
  for (const action of local?.actions ?? []) actions.set(action.id, { ...actions.get(action.id), ...action });
  merged.actions = [...actions.values()].filter(action => !action.disabled);
  validateSkill(merged);
  return structuredClone(merged);
}
export function listSkills(local = [], disabled = []) {
  return [...new Set([...bundledSkills, ...local].map(skill => skill.domain))].sort().map(domain => {
    const base = bundledSkills.find(skill => skill.domain === domain);
    const override = local.find(skill => skill.domain === domain);
    return { domain, active: !disabled.includes(domain), name: override?.name ?? base?.name, source: base ? (override ? 'bundled + local' : 'bundled') : 'local' };
  });
}
export function loadSkill(value, local = [], disabled = []) {
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('Enter an HTTP/HTTPS page URL without credentials.');
  const domain = parsed.hostname;
  const base = bundledSkills.find(skill => skill.domain === domain);
  const override = local.find(skill => skill.domain === domain);
  if (!base && !override) throw new Error(`No skill for ${domain}.`);
  if (disabled.includes(domain)) throw new Error(`Activate the skill for ${domain} before loading it.`);
  return mergeSkill(base, override);
}
export function skillMarkdown(skill) {
  validateSkill(skill);
  return `---\nname: ${skill.domain.replaceAll('.', '-')}\ndescription: ${JSON.stringify(skill.description)}\n---\n\n# ${skill.name}\n\nDomain: ${skill.domain}\n\n${skill.description}\n\n${skill.instructions}\n\n## Definition\n\n\`\`\`json\n${JSON.stringify(skill, null, 2)}\n\`\`\`\n`;
}
export function validateLocalSkills(skills) {
  if (!Array.isArray(skills) || skills.length > 100 || JSON.stringify(skills).length > 1000000) throw new Error('Local skills exceed the allowed size.');
  const domains = new Set();
  for (const skill of skills) {
    validateSkill(skill, true);
    if (domains.has(skill.domain)) throw new Error('Duplicate local domain.');
    domains.add(skill.domain);
    mergeSkill(bundledSkills.find(base => base.domain === skill.domain), skill);
  }
}

export function parseSkillFile(content) {
  if (typeof content !== 'string' || content.length > 1000000) throw new Error('Skill files must be smaller than 1 MB.');
  const json = content.trim().startsWith('{') ? content : content.match(/```json\s*\n([\s\S]*?)\n```/)?.[1];
  if (!json) throw new Error('Choose a JSON definition or a Plug Inu SKILL.md export.');
  const skill = JSON.parse(json);
  validateLocalSkills([skill]);
  return skill;
}

// This resolves an execution plan, never runs page code or starts an agent.
export function loadAction(value, actionId, mode = 'auto', local = [], disabled = []) {
  const skill = loadSkill(value, local, disabled);
  return planAction(skill, actionId, mode);
}
export function planAction(skill, actionId, mode = 'auto') {
  validateSkill(skill);
  const action = skill.actions.find(item => item.id === actionId && !item.disabled);
  if (!action) throw new Error('Unknown or disabled domain action.');
  const modes = action.execution?.modes ?? ['llm'];
  const selected = mode === 'auto' ? (modes.includes('script') ? 'script' : 'llm') : mode;
  if (!modes.includes(selected)) throw new Error('This action does not support the selected execution mode.');
  return { domain: skill.domain, action, mode: selected, instructions: skill.instructions,
    ...(selected === 'script' ? { script: action.execution.script } : {}) };
}
