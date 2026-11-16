import React, { forwardRef, useState } from 'react';
import { brandLogo, brandedImageSource, isBrandFallbackSource } from './brand-media.js';

const BrandedImage = forwardRef(function BrandedImage({ src, onError, className = '', alt = '', ...props }, ref) {
  const [failed, setFailed] = useState(false);
  const isInvalid = !src || typeof src !== 'string' || !src.trim() || src === 'null' || src === 'undefined';
  const showFallback = isInvalid || failed || isBrandFallbackSource(src);
  const resolved = showFallback ? brandLogo : brandedImageSource(src);

  return (
    <img
      {...props}
      ref={ref}
      alt={alt}
      className={`${className}${showFallback || isBrandFallbackSource(resolved) ? ' is-brand-fallback' : ''}`}
      src={resolved}
      onError={event => {
        if (!failed) {
          setFailed(true);
        }
        onError?.(event);
      }}
    />
  );
});

export default BrandedImage;
