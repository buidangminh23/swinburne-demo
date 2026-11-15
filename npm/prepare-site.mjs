import { execSync } from 'node:child_process';
import { cpSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..');
const dist = path.join(repo, 'client', 'dist');
const site = path.join(here, 'site');

const env = { ...process.env, VITE_USE_REAL_API: 'false' };
execSync('npm ci --workspace client --include-workspace-root=false', { cwd: repo, stdio: 'inherit', env });
execSync('npm --workspace client run build', { cwd: repo, stdio: 'inherit', env });
if (!existsSync(path.join(dist, 'index.html'))) throw new Error('client build did not produce index.html');
rmSync(site, { recursive: true, force: true });
cpSync(dist, site, { recursive: true });
console.log(`Copied ${dist} to ${site}`);
