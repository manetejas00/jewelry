import {useEffect} from 'react';
import {listingThumbnail} from './listing-media.js';

const STYLE = '/magiczoom/magiczoom.css';
const SCRIPT = '/magiczoom/magiczoom.js';

function loadMagicZoom() {
  if (!document.querySelector('link[data-magiczoom]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = STYLE;
    link.dataset.magiczoom = '1';
    document.head.appendChild(link);
  }
  if (window.MagicZoom) return Promise.resolve(window.MagicZoom);
  if (!window.__magicZoomReady) {
    window.__magicZoomReady = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT;
      script.async = true;
      script.onload = () => resolve(window.MagicZoom);
      script.onerror = () => reject(new Error('MagicZoom failed to load'));
      document.body.appendChild(script);
    });
  }
  return window.__magicZoomReady;
}

export default function ProductMagicZoom({id, images, title, children}) {
  const zoomId = `mz-${String(id || 'piece').replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const photos = images.filter(image => image?.url);
  const signature = photos.map(image => image.url).join('|');

  useEffect(() => {
    let cancel = false;
    loadMagicZoom().then(zoom => {
      if (cancel || !zoom) return;
      if (typeof zoom.stop === 'function') zoom.stop(zoomId);
      if (typeof zoom.refresh === 'function') zoom.refresh(zoomId);
      else if (typeof zoom.start === 'function') zoom.start(zoomId);
    }).catch(() => {});
    return () => {
      cancel = true;
      window.MagicZoom?.stop?.(zoomId);
    };
  }, [zoomId, signature]);

  if (!photos.length) return null;
  const main = photos[0];
  return <div className="detail-gallery">
    <a href={main.url} className="MagicZoom" id={zoomId} data-options="cssClass: mz-show-arrows;">
      <img src={main.url} alt={title}/>
    </a>
    {photos.length > 1 && <div className="product-angle-gallery" role="group" aria-label="Product angle views">
      {photos.map((image, index) => <a key={image.id || index} data-zoom-id={zoomId} href={image.url} data-image={image.url}>
        <img src={listingThumbnail({image: image.url})} alt={image.alt_text || title}/>
      </a>)}
    </div>}
    {children}
  </div>;
}
