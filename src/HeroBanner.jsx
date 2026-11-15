import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowLeft, ArrowRight, Play } from 'lucide-react';
import gsap from 'gsap';
import { brandedImageSource } from './brand-media.js';

const asset = name => 'https://cdnstatic.tencentcs.com/edgeone/pages/product-activities/jewelry/' + encodeURIComponent(name) + '.png';
const videoSrc = 'https://cdnstatic.tencentcs.com/edgeone/pages/product-activities/jewelry/hero.mp4';

export const slides = [
  // 1. Existing hero video — Always first, preserved
  {
    type: 'video',
    video: true,
    src: videoSrc,
    poster: asset('Pearls Collection'),
    eyebrow: 'OBJECTS OF QUIET BEAUTY · CHAPTER 01',
    title: 'Quiet beauty.',
    lead: 'Lasting ',
    emphasis: 'impressions.',
    copy: <>A little light. A quiet statement.<br />Jewellery that feels unmistakably you.</>,
    to: '/collections/all',
    cta: 'Shop the collection',
    alt: 'Pearl jewellery campaign',
    mobilePosition: '65% 20%'
  },
  // 2. Kurta Collection — Slide 2
  {
    type: 'picture',
    desktopSrc: '/assets/banners/hero-kurta-desktop.webp',
    mobileSrc: '/assets/banners/hero-kurta-mobile.webp',
    eyebrow: 'MODERN INDIAN HERITAGE · CHAPTER 02',
    title: 'Tradition, Tailored for Today.',
    lead: 'Tradition, ',
    emphasis: 'Tailored for Today.',
    copy: <>Exquisite hand-embroidered Lucknowi Chikankari needlecraft in pure mulmul cotton, fluid georgette, and shimmering Chanderi silk.</>,
    to: '/kurtas',
    cta: 'Explore Kurtas',
    alt: 'Modern Indian Heritage Kurta Collection',
    mobilePosition: 'center top'
  },
  // 3. Jewelry Collection — Slide 3
  {
    type: 'picture',
    desktopSrc: '/assets/banners/hero-jewelry-desktop.webp',
    mobileSrc: '/assets/banners/hero-jewelry-mobile.webp',
    eyebrow: 'TIMELESS ELEGANCE · CHAPTER 03',
    title: 'Elegance That Lasts Forever.',
    lead: 'Elegance ',
    emphasis: 'That Lasts Forever.',
    copy: <>Hallmarked 18K and 22K yellow gold fine jewellery crafted with timeless heritage and contemporary precision.</>,
    to: '/jewelry',
    cta: 'Explore Jewelry',
    alt: 'Luxury Fine Jewelry Collection',
    mobilePosition: '65% 20%'
  },
  // 4. Coins Collection — Slide 4
  {
    type: 'picture',
    desktopSrc: '/assets/banners/hero-coins-desktop.webp',
    mobileSrc: '/assets/banners/hero-coins-mobile.webp',
    eyebrow: 'PRECIOUS HERITAGE · CHAPTER 04',
    title: 'Precious by Nature. Timeless by Choice.',
    lead: 'Precious by Nature. ',
    emphasis: 'Timeless by Choice.',
    copy: <>Certified 24K 999 pure gold and 999 fine silver bullion coins minted with tamper-evident assay packaging.</>,
    to: '/coins',
    cta: 'Explore Coins',
    alt: 'Pure Gold and Silver Bullion Coins',
    mobilePosition: 'center top'
  }
];

export default function HeroBanner({ heroRef }) {
  const [index, setIndex] = useState(0);
  const [previous, setPrevious] = useState(0);
  const [incoming, setIncoming] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [reduce] = useState(() => (typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false));

  const indexRef = useRef(0);
  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const heroContainerRef = useRef(null);
  const copyRef = useRef(null);
  const isTabVisibleRef = useRef(true);

  const currentSlide = slides[index] || slides[0];
  const isVideoSlide = index === 0 && !reduce;
  const total = String(slides.length).padStart(2, '0');

  // Clear pending slide timers
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Transition to specific slide
  const goToSlide = useCallback((nextIndex) => {
    clearTimer();
    const current = indexRef.current;
    if (nextIndex === current) return;

    indexRef.current = nextIndex;
    setPrevious(current);
    setIncoming(true);
    setIndex(nextIndex);
  }, [clearTimer]);

  // Next / Prev controls
  const go = useCallback((step) => {
    const current = indexRef.current;
    const next = (current + step + slides.length) % slides.length;
    goToSlide(next);
  }, [goToSlide]);

  const isFirstMountRef = useRef(true);

  // GSAP animation on slide change (only on subsequent slide transitions)
  useEffect(() => {
    if (reduce) return;
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    const ctx = gsap.context(() => {
      // Subtle photo scale & crossfade
      const activeEl = heroContainerRef.current?.querySelector('.hero-photo picture.is-active, .hero-photo video.is-active, .hero-photo .is-active');
      if (activeEl) {
        gsap.fromTo(
          activeEl,
          { opacity: 0, scale: 1.03 },
          { opacity: 1, scale: 1, duration: 0.85, ease: 'power2.out' }
        );
      }
      // Soft text stagger
      if (copyRef.current && copyRef.current.children && copyRef.current.children.length > 0) {
        gsap.fromTo(
          copyRef.current.children,
          { y: 14, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.7,
            stagger: 0.08,
            ease: 'power2.out',
            clearProps: 'opacity,transform'
          }
        );
      }
    }, heroContainerRef);

    return () => ctx.revert();
  }, [index, reduce]);

  // Sequence scheduling logic & robust mobile video playback
  useEffect(() => {
    clearTimer();
    const vid = videoRef.current;

    // Visibility handler
    const handleVisibilityChange = () => {
      isTabVisibleRef.current = !document.hidden;
      if (document.hidden) {
        if (vid && isVideoSlide) {
          vid.pause();
          setIsPlaying(false);
        }
        clearTimer();
      } else {
        // Resumed
        if (indexRef.current === 0 && isVideoSlide && vid) {
          vid.muted = true;
          vid.defaultMuted = true;
          vid.play()
            .then(() => setIsPlaying(true))
            .catch(() => setIsPlaying(false));
        } else if (indexRef.current > 0) {
          // Restart 3s timer for current image
          timerRef.current = setTimeout(() => {
            if (isTabVisibleRef.current) {
              const next = (indexRef.current + 1) % slides.length;
              goToSlide(next);
            }
          }, 3000);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Slide 0: Video logic
    if (isVideoSlide && vid) {
      // Explicit DOM attributes for mobile WebKit / Safari policy
      vid.muted = true;
      vid.defaultMuted = true;
      vid.setAttribute('muted', '');
      vid.setAttribute('playsinline', '');
      vid.setAttribute('webkit-playsinline', 'true');
      vid.setAttribute('x5-playsinline', 'true');
      vid.playsInline = true;

      if (vid.currentTime > 0) {
        try { vid.currentTime = 0; } catch {}
      }

      const handleVideoEnded = () => {
        setIsPlaying(false);
        // Wait exactly 3 seconds after video completes, then transition to slide 1
        clearTimer();
        timerRef.current = setTimeout(() => {
          if (isTabVisibleRef.current) {
            goToSlide(1);
          }
        }, 3000);
      };

      const handlePlaying = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);

      vid.addEventListener('ended', handleVideoEnded);
      vid.addEventListener('playing', handlePlaying);
      vid.addEventListener('pause', handlePause);

      const attemptPlay = () => {
        if (!vid || indexRef.current !== 0 || !isTabVisibleRef.current) return;
        vid.muted = true;
        vid.defaultMuted = true;
        const playPromise = vid.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
            })
            .catch(err => {
              // Policy restricted autoplay until first touch/scroll
              console.warn('Hero video autoplay waiting for user interaction:', err);
              setIsPlaying(false);
            });
        }
      };

      vid.addEventListener('canplay', attemptPlay);
      vid.addEventListener('loadeddata', attemptPlay);

      // Force mobile buffer start
      if (vid.readyState === 0) {
        try { vid.load(); } catch {}
      }

      if (isTabVisibleRef.current) {
        attemptPlay();
      }

      // One-time user gesture unlocker for mobile browsers with low-power or strict autoplay
      const onUserGesture = () => {
        if (indexRef.current === 0 && vid && vid.paused) {
          vid.muted = true;
          vid.defaultMuted = true;
          vid.play()
            .then(() => setIsPlaying(true))
            .catch(() => {});
        }
      };

      window.addEventListener('touchstart', onUserGesture, { passive: true, once: true });
      window.addEventListener('touchend', onUserGesture, { passive: true, once: true });
      window.addEventListener('pointerdown', onUserGesture, { passive: true, once: true });
      window.addEventListener('click', onUserGesture, { passive: true, once: true });
      window.addEventListener('scroll', onUserGesture, { passive: true, once: true });

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        vid.removeEventListener('ended', handleVideoEnded);
        vid.removeEventListener('playing', handlePlaying);
        vid.removeEventListener('pause', handlePause);
        vid.removeEventListener('canplay', attemptPlay);
        vid.removeEventListener('loadeddata', attemptPlay);
        window.removeEventListener('touchstart', onUserGesture);
        window.removeEventListener('touchend', onUserGesture);
        window.removeEventListener('pointerdown', onUserGesture);
        window.removeEventListener('click', onUserGesture);
        window.removeEventListener('scroll', onUserGesture);
        clearTimer();
      };
    }

    // Slides 1-3: Image slides (exactly 3 seconds each)
    if (isTabVisibleRef.current) {
      timerRef.current = setTimeout(() => {
        if (isTabVisibleRef.current) {
          const next = (indexRef.current + 1) % slides.length;
          goToSlide(next);
        }
      }, 3000);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimer();
    };
  }, [index, isVideoSlide, clearTimer, goToSlide]);

  const handleHeroClick = () => {
    if (isVideoSlide && videoRef.current) {
      const vid = videoRef.current;
      vid.muted = true;
      vid.defaultMuted = true;
      if (vid.paused) {
        vid.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
  };

  return (
    <section
      className="hero"
      ref={el => {
        heroContainerRef.current = el;
        if (typeof heroRef === 'function') heroRef(el);
        else if (heroRef) heroRef.current = el;
      }}
      onClick={handleHeroClick}
      aria-roledescription="carousel"
      aria-label="Homepage banners"
    >
      <div className="hero-photo">
        {slides.map((slide, i) => {
          if (slide.video) return null; // Video rendered below

          const active = i === index;
          const classes = [
            'hero-slide-picture',
            active ? 'is-active' : '',
            active && incoming ? 'is-incoming' : '',
            !active && i === previous ? 'is-prev' : ''
          ].filter(Boolean).join(' ');

          return (
            <picture key={slide.desktopSrc} className={classes}>
              <source media="(max-width: 768px)" srcSet={slide.mobileSrc} />
              <img
                src={slide.desktopSrc}
                alt={active ? slide.alt : ''}
                aria-hidden={active ? undefined : true}
                fetchPriority={i <= 1 ? 'high' : 'low'}
                loading={i <= 1 ? 'eager' : 'lazy'}
                decoding="async"
              />
            </picture>
          );
        })}

        {!reduce && (
          <video
            ref={videoRef}
            className={`${isVideoSlide ? 'is-active' : ''} slide-pos-jewelry`}
            style={{ '--slide-mobile-pos': slides[0].mobilePosition || '65% 20%' }}
            poster={brandedImageSource(slides[0].poster)}
            autoPlay
            muted
            defaultMuted
            playsInline
            webkit-playsinline="true"
            x5-playsinline="true"
            preload="auto"
            aria-label={slides[0].alt}
            aria-hidden={isVideoSlide ? undefined : true}
          >
            <source src={videoSrc} type="video/mp4" />
          </video>
        )}
        <div className="image-grain" />
      </div>

      {isVideoSlide && !isPlaying && (
        <button
          type="button"
          className="hero-play-indicator"
          onClick={(e) => {
            e.stopPropagation();
            handleHeroClick();
          }}
          aria-label="Play hero video"
        >
          <Play size={14} fill="currentColor" />
          <span>Play Video</span>
        </button>
      )}

      <div className="hero-copy" ref={copyRef}>
        <div className="eyebrow">
          <span className="tiny-line" />
          {currentSlide.eyebrow}
        </div>
        <h1>
          {currentSlide.title}
          <br />
          {currentSlide.lead}
          <em>{currentSlide.emphasis}</em>
        </h1>
        <p>{currentSlide.copy}</p>
        <Link
          className="button light hero-cta-button"
          to={currentSlide.to}
          aria-label={`${currentSlide.cta} - ${currentSlide.title}`}
          data-testid="hero-cta-button"
        >
          {currentSlide.cta} <ArrowUpRight size={18} />
        </Link>
        <span className="hero-bottom">THE EXTRAORDINARY, IN THE EVERYDAY</span>
      </div>

      <div className="hero-controls">
        <a className="hero-scroll" href="#collections" aria-label="Explore collections">
          EXPLORE <span>↓</span>
        </a>

        <div className="hero-index">
          <div aria-live="polite" aria-atomic="true">
            {String(index + 1).padStart(2, '0')} <span>/ {total}</span>
          </div>
          <div className="hero-arrows">
            <button type="button" aria-label="Previous banner" onClick={(e) => { e.stopPropagation(); go(-1); }}>
              <ArrowLeft size={18} />
            </button>
            <button type="button" aria-label="Next banner" onClick={(e) => { e.stopPropagation(); go(1); }}>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
