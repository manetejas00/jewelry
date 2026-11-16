import useScrollLock from './useScrollLock.js';
import React, {useEffect, useState, useRef} from 'react';
import {createPortal} from 'react-dom';
import {Smartphone} from 'lucide-react';

function iosDevice() {
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export default function InstallApp() {
  const [installed, setInstalled] = useState(true);
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

  async function install() {
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
    {offline && createPortal(<p className="pwa-offline" role="status">You are offline. Prices, stock, sign-in, and checkout need a connection.</p>, document.body)}
    {!installed && <button type="button" className="icon install-nav" aria-label="Get app" onClick={install}>
      <Smartphone size={20} />
    </button>}
    {help && createPortal(<div ref={helpRef} className="install-help" role="dialog" aria-modal="true" aria-labelledby="install-help-title">
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
      </div>, document.body)}
    </>
  );
}
