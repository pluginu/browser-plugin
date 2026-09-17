import { MODES } from '../profiles/model.js';
const wordChar = /[\p{L}\p{N}_]/u;
export function validateRule(rule) {
  if (!rule || !MODES.includes(rule.mode) || !['positive', 'negative'].includes(rule.kind)) throw new Error('Invalid rule type.');
  if (typeof rule.value !== 'string' || !rule.value.trim() || rule.value.length > 200) throw new Error('Rules need 1–200 characters.');
  if (rule.mode === 'length' && !/^(?:[1-9]\d{0,2}|1000)$/.test(rule.value)) throw new Error('Word length must be 1–1000.');
  if (rule.mode === 'regex') {
    // Conservative advanced subset: no unbounded repetition, groups or backreferences.
    if (/[()*+{}]/.test(rule.value) || /\\[1-9k]/.test(rule.value)) throw new Error('Regex supports classes, anchors, alternatives and ?, but not groups, repetition (* + {}), or backreferences.');
    if ((rule.value.match(/\?/g) || []).length > 1) throw new Error('Use at most one optional (?) marker per regex.');
    try { new RegExp(rule.value, 'gu'); } catch { throw new Error('Invalid regular expression.'); }
  }
  return rule;
}
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function compileRules(rules) {
  return rules.map(rule => {
    validateRule(rule);
    let source = escape(rule.value);
    if (rule.mode === 'length') source = `[\\p{L}\\p{N}_]{${Number(rule.value)}}`;
    if (rule.mode === 'regex') source = rule.value;
    return { ...rule, expression: new RegExp(source, rule.caseSensitive ? 'gu' : 'giu') };
  });
}
export function matchText(text, compiled, limit = 2000) {
  const matches = [];
  if (limit <= 0) return matches;
  for (const rule of compiled) {
    rule.expression.lastIndex = 0;
    for (const match of text.matchAll(rule.expression)) {
      if (!match[0]) continue;
      const start = match.index, end = start + match[0].length;
      const before = Array.from(text.slice(Math.max(0, start - 2), start)).at(-1) || '';
      const after = String.fromCodePoint(text.codePointAt(end) || 32);
      if (['word', 'length', 'startsWith'].includes(rule.mode) && wordChar.test(before)) continue;
      if (['word', 'length', 'endsWith'].includes(rule.mode) && wordChar.test(after)) continue;
      matches.push({ start, end, kind: rule.kind, ruleId: rule.id });
      if (matches.length >= limit) return matches;
    }
  }
  return matches;
}
