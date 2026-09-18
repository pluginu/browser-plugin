import { integratedScout, scoutPlugin } from './scout-build.mjs';
import { zipFiles } from './zip.mjs';
import { bundledSkills } from '../src/domains/bundled.js';
import { readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { rm, mkdir, copyFile, readFile, writeFile, cp } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true }); await mkdir('dist');
await build({ entryPoints: { background: 'src/background/index.js', content: 'src/content/index.js', ui: 'src/shared/ui.js', skills: 'src/domains/page.js' }, plugins: [scoutPlugin], bundle: true, outdir: 'dist', target: 'chrome120', format: 'iife', sourcemap: true });
await copyFile('manifest.json', 'dist/manifest.json');
await copyFile('src/shared/ui.css', 'dist/ui.css');
await cp('public', 'dist/public', { recursive: true });
for (const page of ['popup', 'sidepanel', 'options', 'skills']) await copyFile(`src/${page}/index.html`, `dist/${page}.html`);
// Install domain runtime assets and an independently downloadable skill package.
await mkdir('dist/domain-runtime/x-com', { recursive: true });
await mkdir('dist/domain-packages', { recursive: true });
await copyFile('src/domains/x-bridge.js', 'dist/domain-runtime/x-com/bridge.js');
const files = [];
for (const path of await readdir('skills/x-com', { recursive: true, withFileTypes: true })) {
  if (!path.isFile()) continue;
  const full = `${path.parentPath}/${path.name}`;
  const relative = full.slice('skills/x-com/'.length);
  const content = await readFile(full);
  files.push([`x-com/${relative}`, content]);
  if (relative.startsWith('scripts/') && !['manifest.json', 'background.js', 'package.json'].includes(path.name)) {
    let adapted = content;
    if (path.name.endsWith('.js')) adapted = integratedScout(content.toString(), path.name);
    if (path.name.endsWith('.html')) {
      adapted = content.toString().replace('<script src="core.js">', '<script src="bridge.js"></script><script src="core.js">');
      if (path.name === 'popup.html') adapted = adapted.replace('<form id="settings">', '<form id="settings"><label for="targetTab">X tab to scan</label><select id="targetTab" required></select>').replace('Start on this tab', 'Start on selected X tab');
    }
    await writeFile(`dist/domain-runtime/x-com/${path.name}`, adapted);
  }
}
const definition = JSON.stringify(bundledSkills[0], null, 2) + '\n';
const contractIndex = files.findIndex(([path]) => path === 'x-com/domain.json');
files[contractIndex] = ['x-com/domain.json', definition];
await writeFile('dist/domain-packages/x-com.json', definition);
const archive = zipFiles(files);
await writeFile('dist/domain-packages/x-com.zip', archive);
await writeFile('dist/domain-packages/index.json', JSON.stringify({ version: 1, packages: [{ domain: 'x.com', version: '1.3.0', path: 'x-com.zip', definition: 'x-com.json', definitionSha256: createHash('sha256').update(definition).digest('hex'), sha256: createHash('sha256').update(archive).digest('hex'), actions: bundledSkills[0].actions.map(({ id, execution }) => ({ id, modes: execution?.modes ?? ['llm'] })) }] }, null, 2));
const manifest = JSON.parse(await readFile('dist/manifest.json', 'utf8'));
for (const path of ['skills.html', 'skills.js', manifest.background.service_worker, manifest.action.default_popup, manifest.side_panel.default_path, manifest.options_ui.page, ...manifest.content_scripts.flatMap(s => s.js)]) await readFile(`dist/${path}`);
console.log('Built and validated unpacked extension in dist/');
