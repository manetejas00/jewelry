import sharp from 'sharp';
import fs from 'node:fs';

const background = '#102124';
const gold = '#ab9162';

function emblem(size) {
  const mark = Math.round(size * 0.34);
  const cx = size / 2;
  const start = cx - mark / 2;
  const end = cx + mark / 2;
  const stroke = Math.max(6, Math.round(size * 0.035));
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${background}"/>
  <g fill="none" stroke="${gold}" stroke-width="${stroke}" stroke-linecap="round">
    <path d="M${cx} ${start} V${end}"/>
    <path d="M${start} ${cx} H${end}"/>
    <path d="M${start + mark * 0.15} ${start + mark * 0.15} L${end - mark * 0.15} ${end - mark * 0.15}"/>
    <path d="M${end - mark * 0.15} ${start + mark * 0.15} L${start + mark * 0.15} ${end - mark * 0.15}"/>
  </g>
</svg>`);
}

const targets = [
  ['public/icon-192.png', 192],
  ['public/icon-512.png', 512],
  ['public/icon-maskable-512.png', 512],
  ['public/apple-touch-icon.png', 180]
];

fs.mkdirSync('public', {recursive: true});
for (const [file, size] of targets) {
  await sharp(emblem(size)).png().toFile(file);
  const meta = await sharp(file).metadata();
  if (meta.width !== size || meta.height !== size) throw new Error(`${file} is ${meta.width}x${meta.height}`);
  console.log(`${file} ${size}x${size}`);
}
