import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import express from 'express';
import sharp from 'sharp';
import {renderMetadata} from '../server/seo.js';
import {registerPwa} from '../server/pwa.js';
import {webPush, pushSupported, subscribeToPush} from '../src/web-push.js';

const html = fs.readFileSync('index.html', 'utf8');
const manifest = JSON.parse(fs.readFileSync('public/manifest.webmanifest', 'utf8'));
const worker = fs.readFileSync('public/sw.js', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

test('manifest is installable and does not prefer a store listing', () => {
  assert.equal(manifest.name, 'Veyora Jewels');
  assert.equal(manifest.short_name, 'Veyora');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.theme_color, '#102124');
  assert.equal(manifest.prefer_related_applications, undefined);
  const sizes = manifest.icons.map((icon) => icon.sizes);
  assert.ok(sizes.includes('192x192') && sizes.includes('512x512'));
  assert.ok(manifest.icons.some((icon) => icon.purpose?.includes('maskable')));
  assert.ok(manifest.icons.every((icon) => icon.src.startsWith('/')));
  assert.ok(manifest.related_applications.some((app) => app.platform === 'webapp' && app.url === '/manifest.webmanifest'));
});

test('icons are opaque branded pngs at the required sizes', async () => {
  const files = {'public/icon-192.png': 192, 'public/icon-512.png': 512, 'public/icon-maskable-512.png': 512, 'public/apple-touch-icon.png': 180};
  for (const [file, size] of Object.entries(files)) {
    const image = sharp(file);
    const meta = await image.metadata();
    assert.equal(meta.format, 'png');
    assert.equal(meta.width, size);
    assert.equal(meta.height, size);
    const {data, info} = await image.raw().toBuffer({resolveWithObject: true});
    const corner = [data[0], data[1], data[2]];
    assert.deepEqual(corner, [248, 246, 240]);
    let gold = false;
    for (let i = 0; i < data.length; i += info.channels) {
      if (Math.abs(data[i] - 171) < 30 && Math.abs(data[i + 1] - 145) < 30 && Math.abs(data[i + 2] - 98) < 30) gold = true;
    }
    assert.equal(gold, true);
  }
});

test('service worker has a fetch handler and does not cache private routes', () => {
  assert.match(worker, /addEventListener\(\s*["']fetch["']/);
  assert.match(worker, /\/api\//);
  assert.match(worker, /offline\.html/);
  assert.doesNotMatch(worker, /caches\.(open|put|match)\([^)]*\/api\//);
  assert.match(worker, /isPublicThumb|\/uploads\/thumbs\//);
  assert.match(worker, /request\.method !== ['"]GET['"]/);
});

test('document metadata registers one manifest and iOS web app tags', () => {
  assert.equal(html.match(/rel="manifest"/g).length, 1);
  assert.equal(html.match(/name="mobile-web-app-capable"/g).length, 1);
  assert.match(html, /name="apple-mobile-web-app-capable" content="yes"/);
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /src="\/pwa-boot\.js"/);
  assert.match(html, /href="\/apple-touch-icon\.png"/);
  const rendered = renderMetadata(html, {title: 'Ring | Veyora Jewels', description: 'A ring', status: 200, indexable: false, url: 'https://store.example.com/products/ring'});
  assert.equal(rendered.match(/rel="manifest"/g).length, 1);
  assert.equal(rendered.match(/name="apple-mobile-web-app-capable"/g).length, 1);
});

test('pwa files are served anonymously with revalidation headers', async () => {
  const index = fs.readFileSync('server/index.js', 'utf8');
  assert.match(index, /registerPwa\(app,\{production\}\)/);
  assert.match(index, /Cache-Control','no-store'/);
  const app = express();
  registerPwa(app, {production: false});
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const manifestRes = await fetch(base + '/manifest.webmanifest');
    assert.equal(manifestRes.status, 200);
    assert.match(manifestRes.headers.get('content-type'), /application\/manifest\+json/);
    assert.match(manifestRes.headers.get('cache-control'), /no-cache/);
    assert.equal((await manifestRes.json()).scope, '/');
    for (const file of ['/sw.js', '/pwa-boot.js', '/offline.html', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/apple-touch-icon.png']) {
      const res = await fetch(base + file);
      assert.equal(res.status, 200, file);
      assert.match(res.headers.get('cache-control') || '', /no-cache/, file);
      await res.arrayBuffer();
    }
    assert.equal((await fetch(base + '/api/products')).status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('web push stays disabled and does not request permission', async () => {
  assert.equal(webPush.enabled, false);
  assert.equal(pushSupported(), false);
  await assert.rejects(subscribeToPush(), /not enabled/);
});
