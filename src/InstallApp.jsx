import useScrollLock from './useScrollLock.js';
import React, {useEffect, useState, useRef} from 'react';

const SEEN_KEY = 'veyora-install-banner-seen';

function iosDevice() {
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export default function InstallApp() {
  const [installed, setInstalled] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [help, setHelp] = useState(false);
  const [ios, setIos] = useState(false);
  const [offline, setOffline] = useState(false);
  const helpRef=useRef(null);
  useScrollLock(help&&!installed,helpRef,{onEscape:()=>setHelp(false),trapFocus:true});

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    setInstalled(standalone);
    setIos(iosDevice());
    navigator.getInstalledRelatedApps?.()
      .then((apps) => { if (apps.some((app) => app.platform === 'webapp')) setInstalled(true); })
      .catch(() => {});
    const onInstalled = () => setInstalled(true);
    window.addEventListener('appinstalled', onInstalled);
    const onOffline = () => setOffline(true);
    const onOnline = () => setOffline(false);
    setOffline(navigator.onLine === false);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  useEffect(() => {
    if (installed) return;
    let seen = false;
    try {
      seen = localStorage.getItem(SEEN_KEY) === '1';
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      seen = true;
    }
    if (seen) return;
    setExpanded(true);
    const timer = setTimeout(() => setExpanded(false), 6000);
    return () => clearTimeout(timer);
  }, [installed]);

  async function install() {
    setExpanded(false);
    const event = window.deferredPrompt;
    if (event) {
      window.deferredPrompt = null;
      try {
        await event.prompt();
        if ((await event.userChoice).outcome === 'accepted') setInstalled(true);
      } catch {
        setHelp(true);
      }
      return;
    }
    setHelp(true);
  }

  return (
    <>
    {offline && <p className="pwa-offline" role="status">You are offline. Prices, stock, sign-in, and checkout need a connection.</p>}
    {!installed && <div className={expanded ? 'install-app install-app-banner' : 'install-app install-app-chip'}>
      <button type="button" className="install-app-action" aria-label="Install app" onClick={install}>
        {expanded ? 'Install the app for faster access' : 'Get app'}
      </button>
      {expanded && <button type="button" className="install-app-dismiss" aria-label="Dismiss" onClick={() => setExpanded(false)}>Close</button>}
      {expanded && ios && <p className="install-app-note">On iPhone or iPad, use Safari’s Share menu, then Add to Home Screen.</p>}
      {help && <div ref={helpRef} className="install-help" role="dialog" aria-modal="true" aria-labelledby="install-help-title">
        <h2 id="install-help-title">Add Veyora to your home screen</h2>
        {ios ? <>
          <ol>
            <li>Open this website in Safari.</li>
            <li>Tap the Share button.</li>
            <li>Tap Add to Home Screen, then Add.</li>
          </ol>
          <p>The icon then opens Veyora without the Safari address bar. Sign-in, prices, stock, and checkout still need a connection.</p>
        </> : <>
          <p>Open the browser menu and choose Install app or Add to Home Screen. On Android, Chrome can also show that choice from this button when the browser allows it.</p>
          <p>You can keep using the website in the browser. Sign-in, prices, stock, and checkout need a connection either way.</p>
        </>}
        <button type="button" onClick={() => setHelp(false)}>Close instructions</button>
      </div>}
    </div>}
    </>
  );
}
