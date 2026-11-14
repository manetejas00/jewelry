import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowLeft, ArrowRight } from 'lucide-react';
import gsap from 'gsap';
import { brandedImageSource } from './brand-media.js';
import BrandedImage from './BrandedImage.jsx';

const asset = name => 'https://cdnstatic.tencentcs.com/edgeone/pages/product-activities/jewelry/' + encodeURIComponent(name) + '.png';
const videoSrc = 'https://cdnstatic.tencentcs.com/edgeone/pages/product-activities/jewelry/hero.mp4';

const slides = [
  // 1. Existing hero video
  {
    type: 'video',
    video: true,
    src: videoSrc,
    poster: asset('Pearls Collection'),
    eyebrow: 'THE PEARL EDIT · CHAPTER 01',
    title: 'Quiet beauty.',
    lead: 'Lasting ',
    emphasis: 'impressions.',
    copy: <>A little light. A quiet statement.<br />Jewellery that feels unmistakably you.</>,
    to: '/collections/pearls',
    cta: 'Shop the collection',
    alt: 'Pearl jewellery campaign'
  },
  // 2. Jewellery image 1
  {
    type: 'image',
    image: 'Pearls Collection',
    src: asset('Pearls Collection'),
    eyebrow: 'THE PEARL EDIT · CHAPTER 02',
    title: 'Luminous light.',
    lead: 'Natural ',
    emphasis: 'elegance.',
    copy: <>Cultured pearls handset in recycled gold.<br />Modern classics crafted to cherish every day.</>,
    to: '/collections/pearls',
    cta: 'Explore pearls',
    alt: 'Pearl jewellery collection'
  },
  // 3. Jewellery image 2
  {
    type: 'image',
    image: 'Fine Jewelry Collection',
    src: asset('Fine Jewelry Collection'),
    eyebrow: 'THE EVERYDAY EDIT · CHAPTER 03',
    title: 'Little details.',
    lead: 'Extraordinary ',
    emphasis: 'days.',
    copy: <>Find a piece that becomes part of your story.<br />Considered jewellery for every chapter.</>,
    to: '/collections/all',
    cta: 'Explore all jewellery',
    alt: 'Fine jewellery collection'
  },
  // 4. Jewellery image 3
  {
    type: 'image',
    image: 'Lune Pearl Drop',
    src: asset('Lune Pearl Drop'),
    eyebrow: 'SOMETHING TO TREASURE · CHAPTER 04',
    title: 'A little light.',
    lead: 'A lasting ',
    emphasis: 'connection.',
    copy: <>For someone you love. Including yourself.<br />Discover your next favourite piece.</>,
    to: '/collections/pearls',
    cta: 'Discover the Pearl Edit',
    alt: 'Pearl drop earring'
  },
  // 5. Kurta image 1
  {
    type: 'image',
    src: '/assets/banners/hero-kurta-1.webp',
    eyebrow: 'CHICKEN CURRY KURTAS · CHAPTER 05',
    title: 'Handcrafted grace.',
    lead: 'Timeless ',
    emphasis: 'heritage.',
    copy: <>Authentic Lucknowi Chikankari on pure mulmul cotton.<br />Delicate shadow-work and tonal floral jaal.</>,
    to: '/kurtas',
    cta: 'Shop Chicken Curry Kurtas',
    alt: 'Lucknowi Ivory Chikankari Cotton Kurta'
  },
  // 6. Kurta image 2
  {
    type: 'image',
    src: '/assets/banners/hero-kurta-2.webp',
    eyebrow: 'FESTIVE ETHNIC EDIT · CHAPTER 06',
    title: 'Fluid elegance.',
    lead: 'Ethereal ',
    emphasis: 'poetry.',
    copy: <>Rose blush sheer georgette with artisan needlecraft.<br />A celebration of feminine drape and craftsmanship.</>,
    to: '/kurtas',
    cta: 'Discover Rose Blush',
    alt: 'Rose Blush Georgette Chikankari Kurta'
  },
  // 7. Kurta image 3
  {
    type: 'image',
    src: '/assets/banners/hero-kurta-3.webp',
    eyebrow: 'ROYAL WEAVES · CHAPTER 07',
    title: 'Royal sheen.',
    lead: 'Chanderi ',
    emphasis: 'grandeur.',
    copy: <>Regal sage green Chanderi with intricate bakhiya embroidery.<br />Handcrafted Awadhi needlecraft for timeless celebrations.</>,
    to: '/kurtas',
    cta: 'Explore All Kurtas',
    alt: 'Sage Green Chanderi Chikankari Kurta'
  }
];

export default function HeroBanner({ heroRef }) {
  const [index, setIndex] = useState(0);
  const [previous, setPrevious] = useState(0);
  const [incoming, setIncoming] = useState(false);
  const [reduce] = useState(() => (typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false));

  const indexRef = useRef(0);
  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const heroContainerRef = useRef(null);
  const copyRef = useRef(null);
  const isTabVisibleRef = useRef(true);

  const currentSlide = slides[index];
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

  // GSAP animation on slide change
  useEffect(() => {
    if (reduce) return;
    const ctx = gsap.context(() => {
      // Subtle photo scale & crossfade
      gsap.fromTo(
        '.hero-photo img.is-active',
        { opacity: 0, scale: 1.04 },
        { opacity: 1, scale: 1, duration: 0.85, ease: 'power2.out' }
      );
      // Soft text stagger
      if (copyRef.current) {
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

  // Sequence scheduling logic
  useEffect(() => {
    clearTimer();
    const vid = videoRef.current;

    // Visibility handler
    const handleVisibilityChange = () => {
      isTabVisibleRef.current = !document.hidden;
      if (document.hidden) {
        if (vid && isVideoSlide) {
          vid.pause();
        }
        clearTimer();
      } else {
        // Resumed
        if (indexRef.current === 0 && isVideoSlide && vid) {
          vid.play().catch(() => {});
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
      vid.muted = true;
      vid.currentTime = 0;

      const handleVideoEnded = () => {
        // Wait exactly 3 seconds after video completes, then transition to slide 1
        clearTimer();
        timerRef.current = setTimeout(() => {
          if (isTabVisibleRef.current) {
            goToSlide(1);
          }
        }, 3000);
      };

      const handleVideoError = () => {
        // Fallback if video fails: wait 3 seconds and go to slide 1
        clearTimer();
        timerRef.current = setTimeout(() => {
          if (isTabVisibleRef.current) {
            goToSlide(1);
          }
        }, 3000);
      };

      vid.addEventListener('ended', handleVideoEnded);
      vid.addEventListener('error', handleVideoError);

      if (isTabVisibleRef.current) {
        const playPromise = vid.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // If autoplay policy blocks, proceed after 3s
            handleVideoError();
          });
        }
      }

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        vid.removeEventListener('ended', handleVideoEnded);
        vid.removeEventListener('error', handleVideoError);
        clearTimer();
      };
    }

    // Slides 1-6: Image slides (exactly 3 seconds each)
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

  return (
    <section
      className="hero"
      ref={el => {
        heroContainerRef.current = el;
        if (typeof heroRef === 'function') heroRef(el);
        else if (heroRef) heroRef.current = el;
      }}
      aria-roledescription="carousel"
      aria-label="Homepage banners"
    >
      <div className="hero-photo">
        {slides.map((slide, i) => {
          const active = i === index;
          const classes = [
            active ? 'is-active' : '',
            active && incoming ? 'is-incoming' : '',
            !active && i === previous ? 'is-prev' : ''
          ].filter(Boolean).join(' ');

          if (slide.video) {
            return null; // Video rendered below
          }

          return (
            <BrandedImage
              key={slide.src}
              className={classes}
              src={slide.src}
              alt={active ? slide.alt : ''}
              aria-hidden={active ? undefined : true}
              fetchPriority={i <= 1 ? 'high' : 'low'}
              decoding="async"
            />
          );
        })}

        {!reduce && (
          <video
            ref={videoRef}
            className={isVideoSlide ? 'is-active' : ''}
            src={videoSrc}
            poster={brandedImageSource(slides[0].poster)}
            autoPlay
            muted
            playsInline
            preload="auto"
            aria-label={slides[0].alt}
            aria-hidden={isVideoSlide ? undefined : true}
          />
        )}
        <div className="image-grain" />
      </div>

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

      <div className="hero-index">
        <div aria-live="polite" aria-atomic="true">
          {String(index + 1).padStart(2, '0')} <span>/ {total}</span>
        </div>
        <div className="hero-arrows">
          <button type="button" aria-label="Previous banner" onClick={() => go(-1)}>
            <ArrowLeft size={18} />
          </button>
          <button type="button" aria-label="Next banner" onClick={() => go(1)}>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      <a className="hero-scroll" href="#collections">
        EXPLORE <span>↓</span>
      </a>
    </section>
  );
}
