#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'site');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};
const DEFAULT_PORT = 4173;
const MAX_PORT_TRIES = 20;

export function resolveRequest(urlPath, root = SITE) {
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  const target = path.resolve(root, `.${clean}`);
  if (target !== root && !target.startsWith(root + path.sep)) return null;
  return target;
}

async function isFile(file) {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

export function createSiteServer(root = SITE) {
  return createServer(async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405).end();
      return;
    }
    const requested = resolveRequest(req.url ?? '/', root);
    if (!requested) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
      return;
    }
    const file = (await isFile(requested)) && requested !== root ? requested : path.join(root, 'index.html');
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }).end('Site files are missing');
    }
  });
}

export function listen(server, port, triesLeft = MAX_PORT_TRIES) {
  return new Promise((resolve, reject) => {
    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE' && triesLeft > 1) resolve(listen(server, port + 1, triesLeft - 1));
      else reject(error);
    });
    server.listen(port, '127.0.0.1', () => resolve(server.address().port));
  });
}

function openBrowser(url) {
  const [command, args] = process.platform === 'win32'
    ? ['cmd', ['/c', 'start', '', url]]
    : [process.platform === 'darwin' ? 'open' : 'xdg-open', [url]];
  spawn(command, args, { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
}

async function main(argv) {
  const portIndex = argv.indexOf('--port');
  const port = portIndex !== -1 ? Number(argv[portIndex + 1]) : DEFAULT_PORT;
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('--port needs a number between 0 and 65535');
  const actual = await listen(createSiteServer(), port);
  const url = `http://localhost:${actual}/`;
  console.log(`Swinburne Equipment Portal (demo data, saved in this browser) is running at ${url}`);
  console.log('Press Ctrl+C to stop.');
  if (!argv.includes('--no-open')) openBrowser(url);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(`Swinburne Equipment Portal: ${error.message}`);
    process.exit(1);
  });
}
