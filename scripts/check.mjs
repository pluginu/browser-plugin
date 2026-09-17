import { readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
for (const root of ['src', 'scripts', 'tests']) {
  for (const file of await readdir(root, { recursive: true })) if (/\.(m?js)$/.test(file)) execFileSync(process.execPath, ['--check', `${root}/${file}`], { stdio: 'inherit' });
}
console.log('JavaScript syntax checks passed.');
