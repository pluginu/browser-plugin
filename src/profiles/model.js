export const MODES = ['word', 'phrase', 'startsWith', 'endsWith', 'contains', 'length', 'regex'];
export function createProfile(name) {
  const clean = name.trim();
  if (!clean || clean.length > 80) throw new Error('Use a profile name of 1–80 characters.');
  return { id: crypto.randomUUID(), name: clean, enabled: true, rules: [] };
}
export function activeRules(state) {
  return state.enabled ? state.profiles.filter(p => p.enabled).flatMap(p => p.rules.map(r => ({ ...r, profileId: p.id }))) : [];
}
