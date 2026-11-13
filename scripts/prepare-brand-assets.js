import sharp from 'sharp';
import fs from 'node:fs/promises';
const source='public/assets/brand/veyora-vj-approved.png';
await sharp(source).resize({width:720}).webp({quality:90}).toFile('public/assets/brand/logo.webp');
await sharp(source).resize(600,800,{fit:'contain',background:'#f8f6f0'}).webp({quality:90}).toFile('public/assets/brand/fallback.webp');
for(const [file,size] of [['icon-192.png',192],['icon-512.png',512],['icon-maskable-512.png',512],['apple-touch-icon.png',180],['favicon.png',64]])await sharp(source).resize(size,size,{fit:'contain',background:'#f8f6f0'}).png().toFile('public/'+file);
const data=(await fs.readFile('public/assets/brand/logo.webp')).toString('base64');
await fs.writeFile('public/assets/product-placeholder.svg',`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800"><rect width="600" height="800" fill="#f8f6f0"/><image href="data:image/webp;base64,${data}" x="0" y="200" width="600" height="400"/></svg>`);
