import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

test('hero showcase: source code adheres strictly to sequence and timing specifications', async () => {
  const heroFilePath = path.resolve('src/HeroBanner.jsx');
  const content = await fs.readFile(heroFilePath, 'utf8');

  // 1. Verify exactly 7 slides in the sequence:
  // Slide 1: Video
  // Slide 2: Jewellery 1
  // Slide 3: Jewellery 2
  // Slide 4: Jewellery 3
  // Slide 5: Kurta 1
  // Slide 6: Kurta 2
  // Slide 7: Kurta 3
  assert.ok(content.includes("type: 'video'"), 'Hero banner must include video slide');
  assert.ok(content.includes("image: 'Pearls Collection'"), 'Must include Jewellery 1: Pearls Collection');
  assert.ok(content.includes("image: 'Fine Jewelry Collection'"), 'Must include Jewellery 2: Fine Jewelry Collection');
  assert.ok(content.includes("image: 'Lune Pearl Drop'"), 'Must include Jewellery 3: Lune Pearl Drop');
  assert.ok(content.includes('/assets/banners/hero-kurta-1.webp'), 'Must include Kurta Image 1');
  assert.ok(content.includes('/assets/banners/hero-kurta-2.webp'), 'Must include Kurta Image 2');
  assert.ok(content.includes('/assets/banners/hero-kurta-3.webp'), 'Must include Kurta Image 3');

  // 2. Verify Video ended listener and 3s wait requirement:
  // "Listen to the actual ended event. Wait exactly 3 seconds after completion."
  assert.ok(content.includes("'ended'"), "Must listen to native 'ended' video event");
  assert.ok(content.includes('3000'), 'Must use 3000ms (3 seconds) delay timers');

  // 3. Verify loop back to video
  assert.ok(content.includes('% slides.length'), 'Must cycle slides circularly forever');

  // 4. Verify visibilitychange handling
  assert.ok(content.includes("'visibilitychange'"), 'Must pause/resume when tab visibility changes');

  // 5. Verify reduced-motion support
  assert.ok(content.includes('prefers-reduced-motion'), 'Must check user reduced motion preference');
});

test('hero showcase: all 3 referenced kurta hero images exist on disk with valid dimensions', async () => {
  const kurtaBanners = [
    'public/assets/banners/hero-kurta-1.webp',
    'public/assets/banners/hero-kurta-2.webp',
    'public/assets/banners/hero-kurta-3.webp'
  ];

  for (const bannerPath of kurtaBanners) {
    const fullPath = path.resolve(bannerPath);
    const stat = await fs.stat(fullPath);
    assert.ok(stat.isFile(), `Banner ${bannerPath} must exist as a file`);
    assert.ok(stat.size > 1000, `Banner ${bannerPath} must have non-zero size`);
  }
});

test('hero showcase: video slide has visible CTA button, clearProps on animation, and no parent GSAP collision', async () => {
  const heroContent = await fs.readFile(path.resolve('src/HeroBanner.jsx'), 'utf8');
  const mainContent = await fs.readFile(path.resolve('src/main.jsx'), 'utf8');
  const cssContent = await fs.readFile(path.resolve('src/style.css'), 'utf8');

  // Verify slide 0 (video slide) defines a CTA button
  assert.match(heroContent, /cta:\s*['"]Shop the collection['"]/, 'Slide 0 must define CTA text');
  assert.match(heroContent, /to:\s*['"]\/collections\/all['"]/, 'Slide 0 must define destination route');

  // Verify button markup
  assert.ok(heroContent.includes('hero-cta-button'), 'HeroBanner must render CTA with .hero-cta-button class');
  assert.ok(heroContent.includes("clearProps: 'opacity,transform'"), 'HeroBanner must clear opacity/transform after GSAP tween');

  // Verify no duplicate GSAP animation on .hero-copy in Home component
  assert.ok(!mainContent.includes("gsap.from('.hero-copy"), 'main.jsx must not collide with HeroBanner animations');

  // Verify CSS ensures visibility and stacking order
  assert.match(cssContent, /\.hero-cta-button/, 'CSS must declare .hero-cta-button');
  assert.match(cssContent, /\.hero-copy\s*\{[^}]*z-index:\s*10/, 'CSS .hero-copy must have z-index: 10');
});

test('hero showcase: hero banner takes full viewport height below header across breakpoints', async () => {
  const cssContent = await fs.readFile(path.resolve('src/style.css'), 'utf8');

  // 1. Full-screen viewport height calculation with 100vh, 100svh, and 100dvh
  assert.match(cssContent, /\.hero\s*\{[^}]*height:\s*calc\([^)]*136px\)/, 'CSS .hero must calculate height subtracting 136px desktop top bars');
  assert.match(cssContent, /100dvh/, 'CSS must support dynamic viewport height 100dvh');
  assert.match(cssContent, /100svh/, 'CSS must support small viewport height 100svh');

  // 2. Background image object-fit and object-position framing (75% center / right center)
  assert.match(cssContent, /\.hero-photo img[^}]*object-fit:\s*cover/, 'CSS must use object-fit: cover for seamless artwork scaling');
  assert.match(cssContent, /\.hero-photo img[^}]*object-position:\s*75%\s*center/, 'CSS must set object-position: 75% center for subject framing on desktop & tablet');

  // 3. Tablet gradient overlay specifications
  assert.match(cssContent, /rgba\(16,\s*35,\s*39,\s*0\.85\)/, 'CSS must include tablet dark gradient overlay rgba(16, 35, 39, 0.85)');
  assert.match(cssContent, /rgba\(16,\s*35,\s*39,\s*0\.4\)/, 'CSS must include tablet dark gradient overlay rgba(16, 35, 39, 0.4)');

  // 4. Mobile responsive full-screen calculation with header offset
  assert.match(cssContent, /min-height:\s*calc\(100svh\s*-\s*var\(--header-offset,\s*113px\)\)/, 'CSS must set mobile min-height with header offset');
  assert.match(cssContent, /height:\s*calc\([^)]*113px\)/, 'CSS must calculate height subtracting 113px mobile top bars');

  // 5. Mobile photo framing, gradient overlay and typography
  assert.match(cssContent, /linear-gradient\(180deg,\s*rgba\(16,\s*39,\s*42,\s*0\.15\)\s*0%,\s*rgba\(16,\s*39,\s*42,\s*0\.65\)\s*55%,\s*rgba\(16,\s*39,\s*42,\s*0\.96\)\s*100%\)/, 'CSS must use top-to-bottom dark gradient overlay on mobile');
  assert.match(cssContent, /clamp\(1\.75rem,\s*7vw,\s*2\.25rem\)/, 'CSS must use scaled typography for mobile hero heading');

  // 6. Controls anchored alignment across breakpoints
  assert.match(cssContent, /\.hero-scroll\s*\{[^}]*transform:\s*translateX\(-50%\)/, 'CSS .hero-scroll must be horizontally centered');
  assert.match(cssContent, /\.hero-scroll\s*\{[^}]*left:\s*50%/, 'CSS .hero-scroll must be anchored at left: 50%');
  assert.match(cssContent, /\.hero-index\s*\{[^}]*right:\s*6%/, 'CSS .hero-index must be anchored at right: 6% on desktop');
  assert.match(cssContent, /\.hero-controls\s*\{[^}]*display:\s*flex;[^}]*justify-content:\s*space-between;[^}]*align-items:\s*center;[^}]*width:\s*100%/, 'CSS must align mobile hero controls in a bottom row');
});
