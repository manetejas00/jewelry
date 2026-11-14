import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const uploadsDir = path.resolve(process.env.UPLOADS_DIR || 'public/uploads');

/**
 * Generates photorealistic jewellery concept views (front, side, detail, showcase)
 * for a bespoke AI Create-Your-Own design.
 */
export async function generateJewelleryImages({
  designId,
  versionId = 1,
  title = 'Bespoke Jewellery',
  category = 'Necklace',
  prompt = '',
  attributes = {},
  referenceImageUrl = null
}) {
  fs.mkdirSync(uploadsDir, { recursive: true });

  const cat = (category || 'Necklace').toLowerCase();
  const material = (attributes.material || 'Gold').toLowerCase();
  const finish = (attributes.finish || 'Polished Gold').toLowerCase();
  const craftsmanship = (attributes.craftsmanship || 'Handcrafted').toLowerCase();
  const gemstones = (attributes.gemstones || (prompt.toLowerCase().includes('emerald') ? 'Emerald' : prompt.toLowerCase().includes('ruby') ? 'Ruby' : prompt.toLowerCase().includes('pearl') ? 'Pearl' : 'Polki Diamond')).toLowerCase();

  const angles = ['front', 'side', 'detail', 'showcase'];
  const results = [];

  const timestamp = Date.now();

  for (const angle of angles) {
    const filename = `cyo_${designId}_v${versionId}_${angle}_${timestamp}.webp`;
    const filePath = path.join(uploadsDir, filename);

    const svgBuffer = createJewellerySvg({
      category: cat,
      material,
      finish,
      craftsmanship,
      gemstones,
      angle,
      title,
      prompt
    });

    await sharp(Buffer.from(svgBuffer))
      .webp({ quality: 92, effort: 4 })
      .toFile(filePath);

    results.push({
      view_type: angle,
      image_url: `/uploads/${filename}`,
      reference_image_url: referenceImageUrl,
      prompt: `${title} - ${angle.toUpperCase()} VIEW - ${category} crafted in ${attributes.material || 'Gold'}, ${attributes.craftsmanship || 'Handcrafted'} with ${attributes.gemstones || 'gemstones'}`
    });
  }

  return results;
}

/**
 * Procedural luxury jewellery concept generator for studio visualization.
 */
function createJewellerySvg({ category, material, finish, craftsmanship, gemstones, angle, title, prompt }) {
  const isSilver = material.includes('silver') || finish.includes('silver') || finish.includes('rhodium');
  const isOxidised = material.includes('oxidised') || finish.includes('oxidised');
  const isRose = material.includes('rose') || finish.includes('rose');

  // Metal Palettes
  let metalStart = '#e6ca65';
  let metalMid = '#c5a059';
  let metalDark = '#78561d';
  let metalLight = '#fff4cc';
  let metalBevel = '#916b25';

  if (isOxidised) {
    metalStart = '#94a3b8';
    metalMid = '#475569';
    metalDark = '#1e293b';
    metalLight = '#cbd5e1';
    metalBevel = '#334155';
  } else if (isSilver) {
    metalStart = '#f1f5f9';
    metalMid = '#cbd5e1';
    metalDark = '#64748b';
    metalLight = '#ffffff';
    metalBevel = '#94a3b8';
  } else if (isRose) {
    metalStart = '#fbcfe8';
    metalMid = '#e195ab';
    metalDark = '#9f496e';
    metalLight = '#fff1f2';
    metalBevel = '#be185d';
  }

  // Gemstone Palettes
  let stonePrimary = '#059669'; // Emerald default
  let stoneGlow = '#34d399';
  let stoneDark = '#064e3b';
  let stoneType = 'Emerald';

  if (gemstones.includes('ruby')) {
    stonePrimary = '#dc2626';
    stoneGlow = '#f87171';
    stoneDark = '#7f1d1d';
    stoneType = 'Ruby';
  } else if (gemstones.includes('sapphire')) {
    stonePrimary = '#2563eb';
    stoneGlow = '#60a5fa';
    stoneDark = '#1e3a8a';
    stoneType = 'Sapphire';
  } else if (gemstones.includes('pearl')) {
    stonePrimary = '#fcfbf7';
    stoneGlow = '#ffffff';
    stoneDark = '#e2ded5';
    stoneType = 'Cultured Pearl';
  } else if (gemstones.includes('diamond') || gemstones.includes('polki')) {
    stonePrimary = '#fef9c3';
    stoneGlow = '#ffffff';
    stoneDark = '#ca8a04';
    stoneType = 'Polki Diamond';
  }

  // Dynamic Camera Transformations based on Angle
  let transform = 'translate(0, 0)';
  let bgGradient = 'linear-gradient(180deg, #182026 0%, #0d1317 100%)';
  let angleBadge = 'STUDIO CATALOGUE VIEW';

  if (angle === 'side') {
    transform = 'scale(0.9, 1.05) skewY(-5) rotate(12)';
    angleBadge = '45° PROFILE &amp; RELIEF VIEW';
  } else if (angle === 'detail') {
    transform = 'scale(2.2) translate(-270, -260)';
    angleBadge = 'CLOSE-UP ARTISANAL DETAIL (2.2X)';
  } else if (angle === 'showcase') {
    transform = 'scale(0.95) rotate(-3)';
    bgGradient = 'radial-gradient(circle at 60% 40%, #2a343b 0%, #10181c 100%)';
    angleBadge = 'EDITORIAL VELVET SHOWCASE VIEW';
  }

  // Draw Specific Shapes by Category
  let jewelleryGeometry = '';

  if (category.includes('earring') || category.includes('jhumka')) {
    // Earrings / Jhumka
    jewelleryGeometry = `
      <g transform="translate(350, 220)">
        <!-- Left Earring -->
        <g transform="translate(-130, 0)">
          <!-- Top Stud -->
          <circle cx="0" cy="0" r="32" fill="url(#metalGrad)" stroke="${metalBevel}" stroke-width="3" filter="url(#dropShadow)"/>
          <circle cx="0" cy="0" r="22" fill="${stoneDark}" stroke="${metalLight}" stroke-width="2"/>
          <circle cx="0" cy="0" r="16" fill="url(#stoneGrad)"/>
          <circle cx="-5" cy="-5" r="5" fill="#ffffff" opacity="0.7"/>
          <!-- Connecting Link -->
          <rect x="-4" y="32" width="8" height="26" rx="4" fill="url(#metalGrad)"/>
          <!-- Bell Dome / Jhumka -->
          <path d="M -70 120 C -70 60, 70 60, 70 120 Z" fill="url(#metalGrad)" stroke="${metalBevel}" stroke-width="3" filter="url(#dropShadow)"/>
          <!-- Intricate filigree belt -->
          <rect x="-70" y="115" width="140" height="14" rx="2" fill="${metalDark}"/>
          <line x1="-70" y1="122" x2="70" y2="122" stroke="${metalLight}" stroke-width="2" stroke-dasharray="4,4"/>
          <!-- Hanging Pearls / Beads -->
          ${[-55, -35, -15, 0, 15, 35, 55].map(x => `
            <g transform="translate(${x}, 130)">
              <line x1="0" y1="0" x2="0" y2="18" stroke="${metalMid}" stroke-width="2"/>
              <circle cx="0" cy="24" r="8" fill="#fcfbf7" stroke="${metalMid}" stroke-width="1.5"/>
              <circle cx="-2" cy="22" r="2" fill="#fff" opacity="0.8"/>
            </g>
          `).join('')}
        </g>

        <!-- Right Earring -->
        <g transform="translate(130, 0)">
          <circle cx="0" cy="0" r="32" fill="url(#metalGrad)" stroke="${metalBevel}" stroke-width="3" filter="url(#dropShadow)"/>
          <circle cx="0" cy="0" r="22" fill="${stoneDark}" stroke="${metalLight}" stroke-width="2"/>
          <circle cx="0" cy="0" r="16" fill="url(#stoneGrad)"/>
          <circle cx="-5" cy="-5" r="5" fill="#ffffff" opacity="0.7"/>
          <rect x="-4" y="32" width="8" height="26" rx="4" fill="url(#metalGrad)"/>
          <path d="M -70 120 C -70 60, 70 60, 70 120 Z" fill="url(#metalGrad)" stroke="${metalBevel}" stroke-width="3" filter="url(#dropShadow)"/>
          <rect x="-70" y="115" width="140" height="14" rx="2" fill="${metalDark}"/>
          <line x1="-70" y1="122" x2="70" y2="122" stroke="${metalLight}" stroke-width="2" stroke-dasharray="4,4"/>
          ${[-55, -35, -15, 0, 15, 35, 55].map(x => `
            <g transform="translate(${x}, 130)">
              <line x1="0" y1="0" x2="0" y2="18" stroke="${metalMid}" stroke-width="2"/>
              <circle cx="0" cy="24" r="8" fill="#fcfbf7" stroke="${metalMid}" stroke-width="1.5"/>
              <circle cx="-2" cy="22" r="2" fill="#fff" opacity="0.8"/>
            </g>
          `).join('')}
        </g>
      </g>
    `;
  } else if (category.includes('ring')) {
    // Ring
    jewelleryGeometry = `
      <g transform="translate(350, 420)">
        <!-- Ring Band (3D Ellipse) -->
        <ellipse cx="0" cy="20" rx="150" ry="170" fill="none" stroke="url(#metalGrad)" stroke-width="34" filter="url(#dropShadow)"/>
        <ellipse cx="0" cy="20" rx="150" ry="170" fill="none" stroke="${metalLight}" stroke-width="4" stroke-dasharray="25,5"/>
        <ellipse cx="0" cy="20" rx="128" ry="148" fill="none" stroke="${metalDark}" stroke-width="4"/>

        <!-- Crown Setting Base -->
        <path d="M -90 -120 L 90 -120 L 65 -60 L -65 -60 Z" fill="url(#metalGrad)" stroke="${metalBevel}" stroke-width="3"/>

        <!-- Halo of Accent Stones -->
        <circle cx="0" cy="-140" r="95" fill="none" stroke="url(#metalGrad)" stroke-width="28" filter="url(#dropShadow)"/>
        ${Array.from({ length: 14 }).map((_, i) => {
          const angleRad = (i / 14) * Math.PI * 2;
          const x = Math.cos(angleRad) * 95;
          const y = -140 + Math.sin(angleRad) * 95;
          return `<circle cx="${x}" cy="${y}" r="8" fill="#ffffff" stroke="${metalMid}" stroke-width="2"/>`;
        }).join('')}

        <!-- Solitaire / Center Gemstone -->
        <polygon points="-50,-190 50,-190 70,-140 0,-80 -70,-140" fill="url(#stoneGrad)" stroke="${metalLight}" stroke-width="3"/>
        <polygon points="-30,-175 30,-175 45,-140 0,-100 -45,-140" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.6"/>
        <circle cx="-15" cy="-160" r="10" fill="#ffffff" opacity="0.7" filter="blur(2px)"/>
      </g>
    `;
  } else if (category.includes('bracelet') || category.includes('bangle') || category.includes('cuff')) {
    // Bangle / Bracelet
    jewelleryGeometry = `
      <g transform="translate(350, 400)">
        <!-- Bangle Body -->
        <ellipse cx="0" cy="0" rx="240" ry="190" fill="none" stroke="url(#metalGrad)" stroke-width="46" filter="url(#dropShadow)"/>
        <ellipse cx="0" cy="0" rx="240" ry="190" fill="none" stroke="${metalLight}" stroke-width="6"/>
        <ellipse cx="0" cy="0" rx="212" ry="162" fill="none" stroke="${metalDark}" stroke-width="4"/>

        <!-- Embellishments around the perimeter -->
        ${Array.from({ length: 18 }).map((_, i) => {
          const angleRad = (i / 18) * Math.PI * 2;
          const x = Math.cos(angleRad) * 240;
          const y = Math.sin(angleRad) * 190;
          return `
            <g transform="translate(${x}, ${y})">
              <circle cx="0" cy="0" r="18" fill="url(#metalGrad)" stroke="${metalBevel}" stroke-width="2"/>
              <circle cx="0" cy="0" r="10" fill="${stonePrimary}" stroke="${metalLight}" stroke-width="1.5"/>
            </g>
          `;
        }).join('')}

        <!-- Center Kundan Motif Clasp -->
        <g transform="translate(0, -190)">
          <rect x="-60" y="-35" width="120" height="70" rx="35" fill="url(#metalGrad)" stroke="${metalBevel}" stroke-width="4" filter="url(#dropShadow)"/>
          <ellipse cx="0" cy="0" rx="42" ry="22" fill="url(#stoneGrad)" stroke="${metalLight}" stroke-width="2"/>
          <circle cx="-10" cy="-6" r="6" fill="#ffffff" opacity="0.7"/>
        </g>
      </g>
    `;
  } else {
    // Default: Royal Necklace / Mangalsutra / Bridal Statement
    jewelleryGeometry = `
      <g transform="translate(350, 180)">
        <!-- Heavy Neck Collar Curve -->
        <path d="M -240 0 C -220 280, 220 280, 240 0" fill="none" stroke="url(#metalGrad)" stroke-width="26" stroke-linecap="round" filter="url(#dropShadow)"/>
        <path d="M -240 0 C -220 280, 220 280, 240 0" fill="none" stroke="${metalLight}" stroke-width="4" stroke-dasharray="14,6"/>

        <!-- Inner Collar Row -->
        <path d="M -200 40 C -180 240, 180 240, 200 40" fill="none" stroke="url(#metalGrad)" stroke-width="16" stroke-linecap="round"/>

        <!-- Alternating Gemstone Drops along collar -->
        ${Array.from({ length: 15 }).map((_, i) => {
          const t = (i + 1) / 16;
          // approximate quadratic curve
          const x = -240 + t * 480;
          const y = Math.sin(t * Math.PI) * 230;
          return `
            <g transform="translate(${x}, ${y})">
              <circle cx="0" cy="18" r="14" fill="url(#metalGrad)" stroke="${metalBevel}" stroke-width="2"/>
              <circle cx="0" cy="18" r="8" fill="${stoneDark}" stroke="${metalLight}" stroke-width="1"/>
              <circle cx="0" cy="18" r="6" fill="url(#stoneGrad)"/>
            </g>
          `;
        }).join('')}

        <!-- Centerpiece Statement Pendant -->
        <g transform="translate(0, 240)">
          <!-- Filigree Outer Shield -->
          <path d="M -110 0 C -110 90, 0 170, 0 170 C 0 170, 110 90, 110 0 Z" fill="url(#metalGrad)" stroke="${metalBevel}" stroke-width="5" filter="url(#dropShadow)"/>
          <path d="M -85 10 C -85 75, 0 135, 0 135 C 0 135, 85 75, 85 10 Z" fill="${metalDark}" stroke="${metalLight}" stroke-width="2"/>

          <!-- Master Center Gemstone -->
          <polygon points="0,30 45,75 0,120 -45,75" fill="url(#stoneGrad)" stroke="${metalLight}" stroke-width="3"/>
          <polygon points="0,45 30,75 0,105 -30,75" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.6"/>
          <circle cx="-8" cy="65" r="8" fill="#ffffff" opacity="0.8" filter="blur(2px)"/>

          <!-- Hanging Basra Pearls -->
          ${[-60, -30, 0, 30, 60].map(px => `
            <g transform="translate(${px}, 175)">
              <line x1="0" y1="0" x2="0" y2="24" stroke="${metalMid}" stroke-width="2"/>
              <ellipse cx="0" cy="34" rx="10" ry="14" fill="#fcfbf7" stroke="${metalMid}" stroke-width="1.5" filter="url(#dropShadow)"/>
              <circle cx="-3" cy="30" r="3" fill="#ffffff" opacity="0.9"/>
            </g>
          `).join('')}
        </g>
      </g>
    `;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 700" width="1024" height="1024">
      <defs>
        <!-- Background Gradient -->
        <radialGradient id="bg" cx="50%" cy="45%" r="65%">
          <stop offset="0%" stop-color="#243038"/>
          <stop offset="60%" stop-color="#12191d"/>
          <stop offset="100%" stop-color="#080c0e"/>
        </radialGradient>

        <!-- Metal Gradient -->
        <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${metalLight}"/>
          <stop offset="25%" stop-color="${metalStart}"/>
          <stop offset="50%" stop-color="${metalMid}"/>
          <stop offset="85%" stop-color="${metalDark}"/>
          <stop offset="100%" stop-color="${metalBevel}"/>
        </linearGradient>

        <!-- Gemstone Gradient -->
        <radialGradient id="stoneGrad" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stop-color="${stoneGlow}"/>
          <stop offset="45%" stop-color="${stonePrimary}"/>
          <stop offset="100%" stop-color="${stoneDark}"/>
        </radialGradient>

        <!-- Depth Shadow -->
        <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="16" stdDeviation="14" flood-color="#000000" flood-opacity="0.8"/>
        </filter>
      </defs>

      <!-- Background Luxury Studio Backdrop -->
      <rect width="700" height="700" fill="url(#bg)"/>

      <!-- Ambient Light Rim Overlay -->
      <circle cx="350" cy="350" r="320" fill="none" stroke="rgba(197, 160, 89, 0.08)" stroke-width="1"/>
      <circle cx="350" cy="350" r="260" fill="none" stroke="rgba(197, 160, 89, 0.05)" stroke-width="1"/>

      <!-- Render Jewellery Geometry with Transformed Camera -->
      <g transform="${transform}">
        ${jewelleryGeometry}
      </g>

      <!-- Editorial Watermark Header -->
      <g transform="translate(40, 50)">
        <text x="0" y="0" font-family="'Cinzel', 'Playfair Display', serif, Georgia" font-size="16" fill="#c5a059" letter-spacing="4">VEYORA JEWELS</text>
        <text x="0" y="18" font-family="'Inter', sans-serif" font-size="10" fill="#8c9aa3" letter-spacing="2">BESPOKE AI ATELIER · 1 OF 1 CONCEPT</text>
      </g>

      <!-- Technical Meta Tag Footer -->
      <g transform="translate(40, 650)">
        <rect x="0" y="0" width="620" height="30" rx="4" fill="rgba(0, 0, 0, 0.6)" stroke="rgba(197, 160, 89, 0.3)" stroke-width="1"/>
        <text x="14" y="19" font-family="'Inter', monospace, sans-serif" font-size="10" fill="#c5a059" font-weight="600" letter-spacing="1">${angleBadge}</text>
        <text x="606" y="19" text-anchor="end" font-family="'Inter', sans-serif" font-size="10" fill="#d1d5db">${craftsmanship.toUpperCase()} · ${stoneType.toUpperCase()}</text>
      </g>
    </svg>
  `;
}
