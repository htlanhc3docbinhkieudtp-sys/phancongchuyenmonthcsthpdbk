/**
 * Utility to reliably set and synchronize the browser tab favicon
 * across Chrome, Cốc Cốc, Microsoft Edge, Firefox, and Safari.
 */
export function setBrowserFavicon(logoUrl: string | undefined): void {
  if (typeof document === 'undefined') return;

  const resolvedUrl = (logoUrl && logoUrl.trim().length > 0) ? logoUrl : '/logo.png';

  const applyFaviconTags = (url: string) => {
    // Remove all existing icon links to force Chromium / Cốc Cốc to flush their tab icon cache
    const existingIcons = document.querySelectorAll(
      "link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon'], #app-favicon"
    );
    existingIcons.forEach((el) => el.remove());

    // 1. Primary PNG / icon link
    const linkIcon = document.createElement('link');
    linkIcon.id = 'app-favicon';
    linkIcon.rel = 'icon';
    linkIcon.type = url.startsWith('data:image/svg') ? 'image/svg+xml' : 'image/png';
    linkIcon.href = url;
    document.head.appendChild(linkIcon);

    // 2. Shortcut icon link for Cốc Cốc & Chromium browser compatibility
    const linkShortcut = document.createElement('link');
    linkShortcut.rel = 'shortcut icon';
    linkShortcut.type = linkIcon.type;
    linkShortcut.href = url;
    document.head.appendChild(linkShortcut);

    // 3. Apple touch icon for mobile / PWA
    const linkApple = document.createElement('link');
    linkApple.rel = 'apple-touch-icon';
    linkApple.href = url;
    document.head.appendChild(linkApple);
  };

  // If the URL is a base64 Data URL (e.g. uploaded custom logo from local device)
  if (resolvedUrl.startsWith('data:image/')) {
    // Large data URLs can be dropped or fail in Chrome/Cốc Cốc tab bar.
    // Resize down cleanly via canvas to create a lightweight, high-DPI 64x64 icon.
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.clearRect(0, 0, 64, 64);
          ctx.drawImage(img, 0, 0, 64, 64);
          const compactDataUrl = canvas.toDataURL('image/png');
          applyFaviconTags(compactDataUrl);
          return;
        }
      } catch (err) {
        console.warn('Error compressing favicon:', err);
      }
      applyFaviconTags(resolvedUrl);
    };
    img.onerror = () => {
      applyFaviconTags('/logo.png');
    };
    img.src = resolvedUrl;
  } else {
    applyFaviconTags(resolvedUrl);
  }
}
