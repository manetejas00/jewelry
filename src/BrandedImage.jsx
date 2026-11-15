import React, { forwardRef, useState } from 'react';
import { brandLogo, brandedImageSource, placeholderSvg } from './brand-media.js';

const BrandedImage = forwardRef(function BrandedImage({ src, onError, className = '', alt = '', ...props }, ref) {
  const [failed, setFailed] = useState(false);
  const isInvalid = !src || typeof src !== 'string' || !src.trim() || src === 'null' || src === 'undefined';
  const showFallback = isInvalid || failed;

  return (
    <img
      {...props}
      ref={ref}
      alt={alt}
      className={`${className}${showFallback ? ' is-brand-fallback' : ''}`}
      src={showFallback ? placeholderSvg : brandedImageSource(src)}
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
