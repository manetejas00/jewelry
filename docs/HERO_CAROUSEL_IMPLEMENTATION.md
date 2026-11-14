# Dynamic Homepage Hero Showcase Implementation

## Overview
This document specifies the implementation of the **Dynamic Homepage Hero Showcase** in `src/HeroBanner.jsx`. The carousel follows an exact multi-stage sequence combining cinematic video, heritage jewellery imagery, and newly generated Chicken Curry Kurta assets with GSAP crossfades, background tab pause logic, and accessibility compliance.

---

## 1. Asset Configuration
The carousel strictly reuses:
1. **Existing Hero Video (1)**: `https://cdnstatic.tencentcs.com/edgeone/pages/product-activities/jewelry/hero.mp4`
2. **Existing Jewellery Campaign Images (3)**:
   - Slide 2: `Pearls Collection`
   - Slide 3: `Fine Jewelry Collection`
   - Slide 4: `Lune Pearl Drop`
3. **Newly Generated Chicken Curry Kurta Images (3)**:
   - Slide 5: `/assets/banners/hero-kurta-1.webp` (Lucknowi Ivory Chikankari Cotton Kurta)
   - Slide 6: `/assets/banners/hero-kurta-2.webp` (Rose Blush Georgette Chikankari Kurta)
   - Slide 7: `/assets/banners/hero-kurta-3.webp` (Sage Green Chanderi Chikankari Kurta)

---

## 2. Exact Sequence & Timing Logic
```
[Video Plays to Completion]
          │
          ▼ (listen to native 'ended' event)
[Wait Exactly 3 Seconds]
          │
          ▼ (GSAP Crossfade)
[Jewellery Image 1] ──(3s)──► [Jewellery Image 2] ──(3s)──► [Jewellery Image 3]
                                                                   │ (3s)
                                                                   ▼
[Video Starts Again] ◄──(3s)── [Kurta Image 3] ◄──(3s)── [Kurta Image 2] ◄──(3s)── [Kurta Image 1]
```

### Video Timing Rules
- **Autoplay & Muted**: Video plays inline and muted (`muted playsInline autoPlay`).
- **No Fixed-Duration Timer**: The video is never prematurely cut off. The component attaches an event listener to the video element's native `ended` event.
- **Completion Delay**: Upon receiving the `ended` event, the component waits exactly 3,000 milliseconds before triggering the transition to Slide 2 (Jewellery Image 1).
- **Autoplay Policy Fallback**: If the browser's autoplay policy intercepts playback or if network latency delays loading, a gentle 3-second fallback timer advances the sequence so the user is never stranded on a blank frame.

### Image Timing Rules
- Each of the 6 subsequent image slides displays for exactly 3,000 milliseconds.
- On completion of Slide 7 (Kurta Image 3), the sequence transitions seamlessly back to Slide 1 (Video), resetting `currentTime = 0` and repeating infinitely.

---

## 3. GSAP Animations & Motion Design
- **Subtle Photo Scaling & Fade**:
  ```javascript
  gsap.fromTo(
    '.hero-photo img.is-active',
    { opacity: 0, scale: 1.04 },
    { opacity: 1, scale: 1, duration: 0.85, ease: 'power2.out' }
  );
  ```
- **Typography Stagger**:
  Headlines, eyebrows, subtitles, and CTA buttons softly rise by 14px with gentle staggering (`stagger: 0.08`, `ease: 'power2.out'`).
- **Reduced Motion Support**:
  When `window.matchMedia('(prefers-reduced-motion: reduce)')` matches:
  - GSAP transforms and scaling are disabled.
  - Video does not autoplay.
  - Transitions switch to instantaneous or subtle opacity swaps.

---

## 4. Tab Visibility & Memory Management
- **Visibility Detection (`visibilitychange`)**:
  - When the browser tab is hidden (`document.hidden = true`), the video is paused and all transition timers are cleared to avoid consuming CPU/GPU in background tabs.
  - When the user switches back to the tab (`document.hidden = false`), playback resumes or the 3-second slide timer is safely restarted.
- **Lifecycle Cleanup**:
  - The `useEffect` cleanup hook removes all `ended`, `error`, and `visibilitychange` listeners, cancels active `setTimeout` timers, and calls `ctx.revert()` on all GSAP contexts to guarantee zero memory leaks.

---

## 5. Verification & Tests
The implementation is covered by automated unit tests in `tests/hero-showcase.test.js`:
- Verifies exact 7-slide configuration.
- Verifies listening to the native `'ended'` event.
- Verifies 3,000ms delay constants.
- Verifies infinite modulo indexing (`% slides.length`).
- Verifies visibilitychange and reduced-motion checks.
- Verifies all 3 kurta banner files exist on disk with valid file sizes.
