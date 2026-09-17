/** Provider adapters own authentication; configuration must never contain credentials. */
export function createConnectionRegistry() {
  const adapters = new Map();
  return {
    register(adapter) {
      if (!adapter || typeof adapter.id !== 'string' || !adapter.id || typeof adapter.connect !== 'function' || typeof adapter.disconnect !== 'function' || adapters.has(adapter.id)) throw new Error('Invalid or duplicate connection adapter.');
      adapters.set(adapter.id, adapter);
    },
    get: id => adapters.get(id),
    list: () => [...adapters.keys()],
  };
}
/** Suggestions are returned only. Callers must show approval UI before saving any rule. */
export async function suggestKeywords(provider, subject, signal) {
  if (!subject.trim()) throw new Error('A subject is required.');
  const suggestions = await provider.suggest({ subject, signal });
  if (!Array.isArray(suggestions) || suggestions.some(s => typeof s !== 'string')) throw new Error('Invalid suggestions.');
  return [...new Set(suggestions.map(s => s.trim()).filter(Boolean))];
}
