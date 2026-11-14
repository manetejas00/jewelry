import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { coinArtwork } from '../server/coin-artwork.js';

const COIN_ART_DIR = path.resolve('public/assets/coin-art');

// Existing high-res masters
const GOLD_ROUND_MASTER = path.join(COIN_ART_DIR, 'royal-emblem-gold-10g-v1.png');
const GOLD_LAKSHMI_MASTER = path.join(COIN_ART_DIR, 'lakshmi-gold-1g-v1.png');
const GOLD_GANESH_MASTER = path.join(COIN_ART_DIR, 'lakshmi-ganesh-gold-5g-v1.png');

const SILVER_ROUND_MASTER = path.join(COIN_ART_DIR, 'floral-silver-10g-v1.png');
const SILVER_GANESH_MASTER = path.join(COIN_ART_DIR, 'lakshmi-ganesh-silver-50g-v1.png');
const SILVER_BAR_MASTER = path.join(COIN_ART_DIR, 'cast-bar-silver-100g-v1.png');

const coinDesigns = {
  // Gold Coins
  'lakshmi-gold-2g-v1.png': { base: GOLD_LAKSHMI_MASTER, label: '2G LAKSHMI 24K 999 PURE GOLD' },
  'ganesha-gold-4g-v1.png': { base: GOLD_GANESH_MASTER, label: '4G GANESHA 24K 999 PURE GOLD' },
  'banyan-tree-gold-8g-v1.png': { base: GOLD_ROUND_MASTER, label: '8G KALPAVRIKSHA 24K 999 PURE GOLD', motif: 'tree' },
  'royal-emblem-gold-20g-v1.png': { base: GOLD_ROUND_MASTER, label: '20G ROYAL EMBLEM 24K 999 GOLD' },
  'imperial-coronation-gold-50g-v1.png': { base: GOLD_ROUND_MASTER, label: '50G IMPERIAL CORONATION 24K GOLD', motif: 'crown' },
  'om-vedic-gold-5g-v1.png': { base: GOLD_ROUND_MASTER, label: '5G VEDIC OM 24K 999 PURE GOLD', motif: 'om' },
  'kalash-gold-10g-v1.png': { base: GOLD_ROUND_MASTER, label: '10G SHAGUN KALASH 24K 999 GOLD', motif: 'kalash' },

  // Silver Coins
  'shagun-silver-5g-v1.png': { base: SILVER_ROUND_MASTER, label: '5G SHAGUN 999 FINE SILVER' },
  'floral-silver-20g-v1.png': { base: SILVER_ROUND_MASTER, label: '20G FLORAL MEDALLION 999 SILVER' },
  'cast-bar-silver-250g-v1.png': { base: SILVER_BAR_MASTER, label: '250G CAST BAR 999 FINE SILVER' },
  'saraswati-silver-20g-v1.png': { base: SILVER_ROUND_MASTER, label: '20G MAA SARASWATI 999 FINE SILVER', motif: 'saraswati' },
  'kalash-silver-50g-v1.png': { base: SILVER_ROUND_MASTER, label: '50G SHAGUN KALASH 999 FINE SILVER', motif: 'kalash' },
  'peacock-silver-50g-v1.png': { base: SILVER_ROUND_MASTER, label: '50G ROYAL PEACOCK 999 FINE SILVER', motif: 'peacock' },
  'om-silver-25g-v1.png': { base: SILVER_ROUND_MASTER, label: '25G VEDIC OM 999 FINE SILVER', motif: 'om' }
};

function getSvgOverlay(width, height, label, motif, isGold) {
  const primaryColor = isGold ? '#ffe082' : '#ffffff';
  const shadowColor = isGold ? '#5d4037' : '#263238';
  const glowColor = isGold ? '#ffd54f' : '#cfd8dc';

  let motifSvg = '';
  if (motif === 'om') {
    motifSvg = `
      <g transform="translate(600, 560) scale(1.6)">
        <text x="0" y="0" text-anchor="middle" dominant-baseline="central" font-family="'Cormorant Garamond', serif" font-weight="bold" font-size="140" fill="${primaryColor}" opacity="0.92" filter="drop-shadow(2px 3px 4px ${shadowColor})">ॐ</text>
      </g>
    `;
  } else if (motif === 'kalash') {
    motifSvg = `
      <g transform="translate(600, 560) scale(1.3)" stroke="${primaryColor}" stroke-width="4" fill="none" opacity="0.88">
        <path d="M-40,40 C-60,10 -30,-20 0,-20 C30,-20 60,10 40,40 Z" fill="${primaryColor}" fill-opacity="0.15"/>
        <path d="M-50,40 L50,40 C55,60 30,80 0,80 C-30,80 -55,60 -50,40 Z" fill="${primaryColor}" fill-opacity="0.25"/>
        <circle cx="0" cy="-35" r="22" fill="${glowColor}" fill-opacity="0.3"/>
        <line x1="-30" y1="-20" x2="-55" y2="-50" stroke-width="3"/>
        <line x1="30" y1="-20" x2="55" y2="-50" stroke-width="3"/>
        <line x1="0" y1="-20" x2="0" y2="-65" stroke-width="3"/>
      </g>
    `;
  } else if (motif === 'tree') {
    motifSvg = `
      <g transform="translate(600, 560) scale(1.2)" stroke="${primaryColor}" stroke-width="4" fill="none" opacity="0.88">
        <path d="M-15,80 L-10,20 C-20,0 -40,-20 -50,-50 C-10,-40 0,-10 0,20 C0,-10 10,-40 50,-50 C40,-20 20,0 10,20 L15,80 Z" fill="${primaryColor}" fill-opacity="0.2"/>
        <circle cx="0" cy="-40" r="35" fill="${glowColor}" fill-opacity="0.15" stroke-dasharray="4,4"/>
      </g>
    `;
  } else if (motif === 'peacock') {
    motifSvg = `
      <g transform="translate(600, 560) scale(1.3)" stroke="${primaryColor}" stroke-width="3.5" fill="none" opacity="0.88">
        <path d="M-20,40 C-35,10 -20,-20 0,-20 C20,-20 35,10 20,40 C10,60 -10,60 -20,40 Z" fill="${primaryColor}" fill-opacity="0.2"/>
        <circle cx="0" cy="-35" r="14" fill="${glowColor}" fill-opacity="0.3"/>
        <path d="M-45,20 C-60,-20 -30,-60 0,-70 C30,-60 60,-20 45,20" stroke-dasharray="6,4"/>
      </g>
    `;
  } else if (motif === 'saraswati') {
    motifSvg = `
      <g transform="translate(600, 560) scale(1.2)" stroke="${primaryColor}" stroke-width="3.5" fill="none" opacity="0.9">
        <path d="M-60,-40 L60,40 M-45,-25 C-30,-50 -10,-40 0,-20 M20,0 C40,10 50,30 35,50" stroke-linecap="round"/>
        <circle cx="-50" cy="-35" r="16" fill="${glowColor}" fill-opacity="0.25"/>
        <circle cx="45" cy="35" r="16" fill="${glowColor}" fill-opacity="0.25"/>
      </g>
    `;
  }

  return Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="ringGlow" cx="50%" cy="50%" r="50%">
          <stop offset="60%" stop-color="${glowColor}" stop-opacity="0"/>
          <stop offset="85%" stop-color="${glowColor}" stop-opacity="0.18"/>
          <stop offset="98%" stop-color="${primaryColor}" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="${shadowColor}" stop-opacity="0.5"/>
        </radialGradient>
      </defs>
      <circle cx="${width/2}" cy="${height/2}" r="${width*0.42}" fill="url(#ringGlow)" stroke="${primaryColor}" stroke-width="3" stroke-opacity="0.4" stroke-dasharray="8,6"/>
      ${motifSvg}
      <path id="curveTop" fill="none" d="M 220,600 A 380,380 0 0,1 980,600" />
      <path id="curveBottom" fill="none" d="M 980,600 A 380,380 0 0,1 220,600" />
      <text font-family="'Manrope', sans-serif" font-weight="700" font-size="28" letter-spacing="6" fill="${primaryColor}" opacity="0.85" filter="drop-shadow(1px 2px 2px ${shadowColor})">
        <textPath href="#curveBottom" startOffset="50%" text-anchor="middle">
          ★ ${label} ★
        </textPath>
      </text>
    </svg>
  `);
}

async function run() {
  console.log('Generating artwork for all 20 coins in public/assets/coin-art/...');

  for (const coin of coinArtwork) {
    const filename = path.basename(coin.image);
    const pngPath = path.join(COIN_ART_DIR, filename);
    const webpPath = pngPath.replace('.png', '.webp');
    const thumbPath = pngPath.replace('.png', '-thumb.webp');

    const config = coinDesigns[filename];
    if (config) {
      const isGold = coin.metal === 'Gold';
      const baseBuffer = await fs.readFile(config.base);
      const metadata = await sharp(baseBuffer).metadata();
      const width = metadata.width || 1200;
      const height = metadata.height || 1200;

      const overlaySvg = getSvgOverlay(width, height, config.label, config.motif, isGold);

      // Generate composite PNG
      const pngBuffer = await sharp(baseBuffer)
        .composite([{ input: overlaySvg, blend: 'over' }])
        .png({ compressionLevel: 8 })
        .toBuffer();

      await fs.writeFile(pngPath, pngBuffer);

      // Generate WebP
      const webpBuffer = await sharp(pngBuffer)
        .webp({ quality: 88, effort: 5 })
        .toBuffer();
      await fs.writeFile(webpPath, webpBuffer);

      // Generate Thumb WebP
      const thumbBuffer = await sharp(pngBuffer)
        .resize(400, 400, { fit: 'inside' })
        .webp({ quality: 82, effort: 4 })
        .toBuffer();
      await fs.writeFile(thumbPath, thumbBuffer);

      console.log(`Generated: ${filename} (PNG: ${(pngBuffer.length/1024).toFixed(1)} KB, WebP: ${(webpBuffer.length/1024).toFixed(1)} KB, Thumb: ${(thumbBuffer.length/1024).toFixed(1)} KB)`);
    } else {
      // Ensure WebP and Thumb exist for the master files
      try {
        await fs.access(webpPath);
      } catch {
        const pngBuf = await fs.readFile(pngPath);
        const webpBuf = await sharp(pngBuf).webp({ quality: 88, effort: 5 }).toBuffer();
        await fs.writeFile(webpPath, webpBuf);
      }
      try {
        await fs.access(thumbPath);
      } catch {
        const pngBuf = await fs.readFile(pngPath);
        const thumbBuf = await sharp(pngBuf).resize(400, 400, { fit: 'inside' }).webp({ quality: 82, effort: 4 }).toBuffer();
        await fs.writeFile(thumbPath, thumbBuf);
      }
      console.log(`Verified master: ${filename}`);
    }
  }

  console.log('All 20 coins successfully verified and generated.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
