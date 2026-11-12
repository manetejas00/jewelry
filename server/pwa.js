import fs from 'node:fs';
import path from 'node:path';

const types = {
  '/sw.js': 'application/javascript; charset=utf-8',
  '/pwa-boot.js': 'application/javascript; charset=utf-8',
  '/manifest.webmanifest': 'application/manifest+json; charset=utf-8',
  '/offline.html': 'text/html; charset=utf-8',
  '/icon-192.png': 'image/png',
  '/icon-512.png': 'image/png',
  '/icon-maskable-512.png': 'image/png',
  '/apple-touch-icon.png': 'image/png'
};

export function registerPwa(app, {production}) {
  app.get(Object.keys(types), (req, res) => {
    const name = req.path.slice(1);
    const built = path.resolve('dist', name);
    const file = production && fs.existsSync(built) ? built : path.resolve('public', name);
    if (!fs.existsSync(file)) return res.status(404).type('text/plain').send('Not found');
    res.set('Cache-Control', 'no-cache');
    res.type(types[req.path]);
    res.sendFile(file);
  });
}
