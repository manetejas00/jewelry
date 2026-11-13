import React, {useEffect, useRef, useState} from 'react';
import {createZoomImageClick, createZoomImageHover} from '@zoom-image/core';
import {listingThumbnail} from './listing-media.js';

const NARROW = '(max-width: 800px)';

export default function ProductMagicZoom({images, title, children}) {
  const photos = images.filter(image => image?.url);
  const signature = photos.map(image => image.url).join('|');
  const [index, setIndex] = useState(0);
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW).matches);
  const stageRef = useRef(null);
  const targetRef = useRef(null);
  const photo = photos[index] || photos[0];

  useEffect(() => {
    setIndex(0);
  }, [signature]);

  useEffect(() => {
    const media = window.matchMedia(NARROW);
    const onChange = () => setNarrow(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !photo) return undefined;
    const rect = stage.getBoundingClientRect();
    const zoom = narrow
      ? createZoomImageClick(stage, {
        zoomImageSource: photo.url,
        zoomFactor: 2.4,
        disableScrollLock: true,
        zoomImageProps: {alt: title}
      })
      : createZoomImageHover(stage, {
        zoomImageSource: photo.url,
        zoomTarget: targetRef.current,
        customZoom: {
          width: Math.max(240, Math.round(rect.width)),
          height: Math.max(300, Math.round(rect.height))
        },
        scale: 2,
        zoomLensClass: 'gallery-zoom-lens',
        zoomTargetClass: 'is-open',
        disableScrollLock: true,
        zoomImageProps: {alt: title}
      });
    return () => zoom.cleanup();
  }, [photo?.url, narrow, title]);

  if (!photo) return null;

  function show(event, next) {
    event.preventDefault();
    event.stopPropagation();
    setIndex((next + photos.length) % photos.length);
  }

  return <div className="detail-gallery">
    <div className="gallery-frame">
      <div className="gallery-stage" ref={stageRef}>
        <img src={photo.url} alt={title}/>
        <span className="gallery-hint">{narrow ? 'Tap to zoom' : 'Hover to zoom'}</span>
        {photos.length > 1 && <>
          <button type="button" className="gallery-arrow gallery-arrow-prev" aria-label="Previous photo" onPointerDown={event => event.stopPropagation()} onClick={event => show(event, index - 1)}><span/></button>
          <button type="button" className="gallery-arrow gallery-arrow-next" aria-label="Next photo" onPointerDown={event => event.stopPropagation()} onClick={event => show(event, index + 1)}><span/></button>
        </>}
      </div>
      <div className="gallery-zoom-target" ref={targetRef} aria-hidden="true"/>
    </div>
    {photos.length > 1 && <div className="product-angle-gallery" role="group" aria-label="Product angle views">
      {photos.map((image, imageIndex) => <button type="button" key={image.id || imageIndex} className="gallery-thumb" aria-label={image.alt_text || `${title} view ${imageIndex + 1}`} aria-current={imageIndex === index ? 'true' : undefined} onClick={() => setIndex(imageIndex)}>
        <img src={listingThumbnail({image: image.url})} alt=""/>
      </button>)}
    </div>}
    {children}
  </div>;
}
