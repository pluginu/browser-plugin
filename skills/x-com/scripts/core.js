/* Shared, deterministic helpers. No network access. */
(function (root) {
  'use strict';
  const reserved = new Set(['home','explore','notifications','messages','i','settings','search','compose','login','logout','signup','tos','privacy','intent']);
  function handleFromUrl(value) {
    try {
      const url = new URL(value, 'https://x.com');
      if (!['x.com', 'twitter.com'].includes(url.hostname)) return null;
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length !== 1 || !/^[a-z0-9_]{1,15}$/i.test(parts[0]) || reserved.has(parts[0].toLowerCase())) return null;
      return parts[0].toLowerCase();
    } catch { return null; }
  }
  function isTimeline(value) {
    try {
      const url = new URL(value, 'https://x.com');
      return ['x.com', 'twitter.com'].includes(url.hostname) && ['', '/', '/home'].includes(url.pathname.replace(/\/+$/, ''));
    } catch { return false; }
  }
  const snippetKey = value => String(value || '').normalize('NFC').replace(/\r\n?/g, '\n').trim();
  const normalized = value => String(value || '').trim().replace(/\s+/g, ' ');
  function isUS(value) {
    return /^(?:United States(?: of America)?|USA|US|U\.S\.?|U\.S\.A\.?)$/i.test(normalized(value));
  }
  function usStore(value) {
    return /^(?:United States(?: of America)?|USA|US|U\.S\.?|U\.S\.A\.?)\s+App Store$/i.test(normalized(value));
  }
  function connection(value) {
    const raw = normalized(value);
    const match = raw.match(/^(?:(.+?)\s+)?(App Store|Android App|Google Play(?: Store)?|Web)$/i);
    if (!match) return { source: 'unknown', country: '', raw };
    const label = match[2].toLowerCase();
    return { source: label === 'app store' ? 'appstore' : label === 'web' ? 'web' : 'android', country: match[1] || '', raw };
  }
  function filterSettings(settings = {}) {
    if (settings.rule === 'custom') return { countries: settings.countries || [], sources: settings.sources || [], countryField: settings.countryField };
    return { countries: ['United States'], sources: settings.rule === 'account' || settings.rule === 'either' ? ['any'] : ['appstore'], countryField: settings.rule === 'account' ? 'account' : settings.rule === 'either' ? 'either' : 'connection' };
  }
  function validateFilters(settings) {
    const countries = [...new Set((Array.isArray(settings.countries) ? settings.countries : []).map(normalized).filter(Boolean))];
    const sources = [...new Set(Array.isArray(settings.sources) ? settings.sources : [])];
    if (!countries.length || countries.length > 250 || countries.some(c => c.length > 100)) throw new Error('Enter at least one country label, up to 250 labels of 100 characters each.');
    if (!sources.length || sources.some(s => !['any','appstore','android','web'].includes(s))) throw new Error('Select at least one connection source.');
    if (!['account','connection','either'].includes(settings.countryField)) throw new Error('Choose where to read the country.');
    return { countries, sources: sources.includes('any') ? ['any'] : sources, countryField: settings.countryField };
  }
  function matches(record, rule) {
    if (rule && typeof rule === 'object') {
      if (rule.rule !== 'custom') return matches(record, rule.rule);
      const filters = filterSettings(rule), via = connection(record.connectedVia);
      if (!filters.sources.includes('any') && !filters.sources.includes(via.source)) return false;
      const key = value => isUS(value) ? 'united states' : normalized(value).toLowerCase();
      const countries = new Set(filters.countries.map(key));
      const account = Boolean(normalized(record.accountBasedIn)) && countries.has(key(record.accountBasedIn));
      const origin = Boolean(via.country) && countries.has(key(via.country));
      if (filters.countryField === 'account') return account;
      if (filters.countryField === 'connection') return origin;
      return filters.countryField === 'either' && (account || origin);
    }
    if (rule === 'account') return isUS(record.accountBasedIn);
    if (rule === 'either') return isUS(record.accountBasedIn) || usStore(record.connectedVia);
    return usStore(record.connectedVia);
  }
  function parseAbout(text) {
    const lines = String(text || '').split(/\n/).map(normalized).filter(Boolean);
    const labels = /^(?:About this account|Account based in|Connected via|Date joined|Joined|Username changes|Verified since|Learn more)$/i;
    function field(label) {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase() === label.toLowerCase()) {
          const next = lines[i + 1];
          return next && !labels.test(next) ? next.slice(0, 200) : '';
        }
        const prefix = new RegExp('^' + label + '\\s*:\\s*(.+)$', 'i');
        const match = lines[i].match(prefix);
        if (match) return match[1].slice(0, 200);
      }
      return '';
    }
    return { accountBasedIn: field('Account based in'), connectedVia: field('Connected via'), dateJoined: field('Date joined') };
  }
  const columns = ['handle','profileUrl','checkedAt','accountBasedIn','connectedVia','dateJoined','status','followStatus','note'];
  function csv(records) {
    const cell = value => {
      let text = String(value ?? '');
      // Neutralize spreadsheet formula injection from page-derived strings.
      if (/^[\s]*[=+@\-\t\r]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    };
    return '\uFEFF' + [columns, ...records.map(r => columns.map(key => r[key]))].map(row => row.map(cell).join(',')).join('\r\n');
  }
  function validateRecords(data) {
    if (!data || data.version !== 1 || !Array.isArray(data.records) || data.records.length > 100000) throw new Error('Choose a Scout version 1 JSON backup (up to 100,000 records).');
    return data.records.map(record => {
      if (!record || typeof record.handle !== 'string' || handleFromUrl('/' + record.handle) !== record.handle.toLowerCase()) throw new Error('Backup contains an invalid handle.');
      const result = {};
      for (const key of columns) result[key] = String(record[key] ?? '').slice(0, 1000);
      result.handle = result.handle.toLowerCase();
      result.profileUrl = 'https://x.com/' + result.handle;
      if (!['visiting', 'checked', 'unavailable', 'error'].includes(result.status)) throw new Error('Backup contains an invalid status.');
      return result;
    });
  }
  root.Scout = { snippetKey, connection, filterSettings, validateFilters, isTimeline, handleFromUrl, isUS, usStore, matches, parseAbout, csv, validateRecords };
  if (typeof module !== 'undefined') module.exports = root.Scout;
})(globalThis);
