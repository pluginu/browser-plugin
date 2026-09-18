#!/usr/bin/env node
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { validateSkill, planAction } from '../src/domains/model.js';

const digest = value => createHash('sha256').update(value).digest('hex');
async function readResource(registry, asset, maxSize = 10_000_000) {
  if (asset && !/^[a-z0-9][a-z0-9.-]*$/.test(asset)) throw new Error('Registry asset must be a relative filename.');
  if (/^https:\/\//.test(registry)) {
    const base = new URL(registry);
    if (base.username || base.password) throw new Error('Registry URL must not contain credentials.');
    const url = asset ? new URL(asset, base) : base;
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Registry download failed (${response.status}).`);
    const chunks = []; let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > maxSize) throw new Error('Registry asset exceeds size limit.');
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
  if (/^[a-z]+:\/\//i.test(registry)) throw new Error('Use an HTTPS registry URL or a local index.json path.');
  const data = await readFile(asset ? join(dirname(resolve(registry)), asset) : resolve(registry));
  if (data.length > maxSize) throw new Error('Registry asset exceeds size limit.');
  return data;
}
export async function getDomainSkill({ url, action, mode = 'auto', out, registry = fileURLToPath(new URL('../dist/domain-packages/index.json', import.meta.url)) }) {
  const page = new URL(url);
  if (!['https:', 'http:'].includes(page.protocol) || page.username || page.password) throw new Error('Use an HTTP/HTTPS page URL without credentials.');
  const index = JSON.parse(await readResource(registry, null, 1_000_000));
  if (index.version !== 1 || !Array.isArray(index.packages)) throw new Error('Unsupported skill registry.');
  const matches = index.packages.filter(item => item.domain === page.hostname);
  if (matches.length !== 1) throw new Error(`Expected one exact-domain skill for ${page.hostname}.`);
  const entry = matches[0];
  if (!/^[a-f0-9]{64}$/.test(entry.sha256) || !/^[a-f0-9]{64}$/.test(entry.definitionSha256)) throw new Error('Missing package integrity metadata.');
  const contract = await readResource(registry, entry.definition, 1_000_000);
  if (digest(contract) !== entry.definitionSha256) throw new Error('Skill definition checksum mismatch.');
  const skill = validateSkill(JSON.parse(contract));
  if (skill.domain !== page.hostname) throw new Error('Skill definition domain mismatch.');
  const plan = action ? planAction(skill, action, mode) : undefined;
  let archive;
  if (out) {
    const bytes = await readResource(registry, entry.path);
    if (digest(bytes) !== entry.sha256) throw new Error('Skill archive checksum mismatch.');
    await mkdir(out, { recursive: true });
    archive = resolve(out, `${page.hostname}-skill.zip`);
    // Never silently overwrite a user's existing download.
    try { await writeFile(archive, bytes, { flag: 'wx' }); }
    catch (error) { if (error.code !== 'EEXIST' || digest(await readFile(archive)) !== entry.sha256) throw error; }
  }
  return { domain: page.hostname, version: entry.version, ...(plan ? { plan } : { actions: skill.actions.filter(item => !item.disabled).map(({ id, description, execution }) => ({ id, description, modes: execution?.modes ?? ['llm'] })) }), ...(archive ? { archive } : {}), executed: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), options = {};
  try {
    if (args.includes('--help')) {
      console.log('node scripts/get-domain-skill.mjs --url https://x.com/home [--action scan-profiles] [--mode auto|llm|script] [--out DIRECTORY] [--registry HTTPS_URL_OR_LOCAL_INDEX_JSON]\nResolves one domain and task. --out downloads a verified ZIP; never executes it.');
    } else {
      for (let i = 0; i < args.length; i += 2) {
        if (!['--url', '--action', '--mode', '--out', '--registry'].includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Invalid arguments. Use --help.');
        options[args[i].slice(2)] = args[i + 1];
      }
      if (!options.url) throw new Error('--url is required.');
      if (options.mode && !['auto', 'llm', 'script'].includes(options.mode)) throw new Error('Mode must be auto, llm or script.');
      console.log(JSON.stringify(await getDomainSkill(options), null, 2));
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
