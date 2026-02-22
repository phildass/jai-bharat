'use client';

/**
 * InstallButton – handles both PWA "Add to Home Screen" and APK download.
 *
 * Behaviour:
 *  - If `beforeinstallprompt` fires (PWA eligible), shows a "Install App" button
 *    that triggers the browser install prompt.  Hides itself after install.
 *  - If a real APK URL is configured (NEXT_PUBLIC_APP_DOWNLOAD_URL), shows a
 *    "Download App" link pointing to that URL.
 *  - If the app is already running in standalone mode the button is hidden.
 */

import { useState, useEffect } from 'react';

export default function InstallButton({ apkUrl }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [isPwa, setIsPwa] = useState(false);

  useEffect(() => {
    // Hide button when already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsPwa(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const installedHandler = () => setInstalled(true);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const btnStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: '#fff', color: '#1a237e',
    padding: '6px 14px', borderRadius: 6,
    textDecoration: 'none', fontWeight: 600, fontSize: 13,
    border: 'none', cursor: 'pointer',
  };

  if (installed) return null;

  // PWA install prompt available
  if (isPwa) {
    return (
      <button
        style={btnStyle}
        onClick={async () => {
          if (!deferredPrompt) return;
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          if (outcome === 'accepted') setInstalled(true);
          setDeferredPrompt(null);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/jaibharat.logo.png" alt="" aria-hidden="true" width={18} height={18} style={{ borderRadius: 2 }} />
        Install App
      </button>
    );
  }

  // A URL is considered a "real" APK link if it starts with http(s) or is an
  // absolute path that is NOT the default placeholder.
  const hasRealApk = apkUrl &&
    (apkUrl.startsWith('http://') || apkUrl.startsWith('https://') ||
     (apkUrl.startsWith('/') && apkUrl !== '/downloads/jai-bharat.apk'));
  if (!hasRealApk && !apkUrl) return null;

  return (
    <a
      href={apkUrl}
      download
      style={btnStyle}
      onClick={(e) => {
        if (!hasRealApk) {
          e.preventDefault();
          // Show a simple alert; a modal would need more scaffolding
          alert(
            'APK coming soon!\n\nCheck back later or use the web app from your browser.'
          );
        }
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/jaibharat.logo.png" alt="" aria-hidden="true" width={18} height={18} style={{ borderRadius: 2 }} />
      {hasRealApk ? 'Download App' : 'App Coming Soon'}
    </a>
  );
}
