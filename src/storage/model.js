import { validateRule } from '../matching/engine.js';
export const STORAGE_KEY = 'plugInu';
export const VERSION = 1;
export function defaults() {
  return { version: VERSION, enabled: true, profiles: [], preferences: { positiveColor: '#ffe08a', negativeColor: '#ff9f9f' }, connections: [] };
}
export function validateState(state) {
  if (!state || state.version !== VERSION || typeof state.enabled !== 'boolean' || !Array.isArray(state.profiles) || !Array.isArray(state.connections)) throw new Error('Invalid saved settings.');
  if (state.profiles.length > 50) throw new Error('Maximum 50 profiles.');
  const ids = new Set();
  let count = 0;
  for (const p of state.profiles) {
    if (!p || typeof p.id !== 'string' || ids.has(p.id) || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 80 || typeof p.enabled !== 'boolean' || !Array.isArray(p.rules)) throw new Error('Invalid profile.');
    ids.add(p.id);
    const ruleIds = new Set();
    for (const r of p.rules) {
      validateRule(r);
      if (typeof r.id !== 'string' || ruleIds.has(r.id) || typeof r.caseSensitive !== 'boolean') throw new Error('Invalid rule.');
      ruleIds.add(r.id); count++;
    }
  }
  if (count > 200) throw new Error('Maximum 200 rules across all profiles.');
  for (const key of ['positiveColor', 'negativeColor']) if (!/^#[0-9a-f]{6}$/i.test(state.preferences?.[key])) throw new Error('Invalid highlight color.');
  return state;
}
export function migrate(raw) {
  if (raw == null) return defaults();
  if (raw.version > VERSION) throw new Error('These settings require a newer Plug Inu version.');
  // Version 0 prototype had enabled/profiles but no preferences or connections.
  if (raw.version === 0) return validateState({ ...defaults(), ...raw, version: VERSION, preferences: { ...defaults().preferences, ...raw.preferences }, connections: raw.connections ?? [] });
  return validateState(raw);
}
