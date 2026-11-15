import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createSiteServer, listen, resolveRequest } from './serve.mjs';

const root = mkdtempSync(path.join(tmpdir(), 'portal-site-'));
mkdirSync(path.join(root, 'assets'));
writeFileSync(path.join(root, 'index.html'), '<!doctype html><title>Portal</title>');
writeFileSync(path.join(root, 'assets', 'app.js'), 'console.log(1)');

test('refuses paths outside the site folder', () => {
  assert.equal(resolveRequest('/../package.json', root), null);
  assert.equal(resolveRequest('/%2e%2e/%2e%2e/etc/passwd', root), null);
  assert.equal(resolveRequest('/assets/app.js?v=1', root), path.join(root, 'assets', 'app.js'));
});

test('serves assets and falls back to index.html for app routes', async () => {
  const server = createSiteServer(root);
  const port = await listen(server, 0);
  try {
    const asset = await fetch(`http://127.0.0.1:${port}/assets/app.js`);
    assert.equal(asset.status, 200);
    assert.match(asset.headers.get('content-type'), /javascript/);
    const route = await fetch(`http://127.0.0.1:${port}/equipment/42`);
    assert.equal(route.status, 200);
    assert.match(await route.text(), /<title>Portal<\/title>/);
    assert.equal((await fetch(`http://127.0.0.1:${port}/`, { method: 'POST' })).status, 405);
  } finally {
    server.close();
    rmSync(root, { recursive: true, force: true });
  }
});
