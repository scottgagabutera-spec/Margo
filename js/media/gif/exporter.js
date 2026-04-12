/* ============================================================
   MARGO — js/media/gif/exporter.js  v2.1
   FIXES v2.1:
   • opts.drawFn(ctx, W, H, t) override — caller supplies its own
     renderer (e.g. share-sheet single-post renderer, gif-studio).
     Fixes blank feed GIF exports which had p2=null causing
     _dsDrawCardFrame to bail immediately.
   • All v2.0 fixes preserved (width/height from PlatformPicker).
   ============================================================ */

(function () {
'use strict';

const DEFAULT_SIZE = 600;
const DEFAULT_FPS  = 18;
const DEFAULT_DUR  = 2.4;
const GIF_LIB_CDN  = 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js';

function _loadGifLib() {
  if (typeof GIF !== 'undefined') return Promise.resolve();
  return new Promise((res, rej) => {
    const s   = document.createElement('script');
    s.src     = GIF_LIB_CDN;
    s.onload  = res;
    s.onerror = () => rej(new Error('Failed to load gif.js'));
    document.head.appendChild(s);
  });
}

function _resolveWorker() {
  const scripts = Array.from(document.querySelectorAll('script[src]'));
  for (const sc of scripts) {
    if (sc.src && sc.src.includes('gif.worker')) return sc.src;
  }
  const mine = document.currentScript && document.currentScript.src;
  if (mine) return mine.substring(0, mine.lastIndexOf('/') + 1) + 'gif.worker.js';
  return '/js/media/gif/gif.worker.js';
}

function _download(blob, filename) {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}

/* ── Draw one frame ──
   Priority:
   1. opts.drawFn(ctx,W,H,t)    — caller supplied (share-sheet / gif-studio)
   2. window._dsDrawConvoFrame  — duet convo layout (duet-sheet.js)
   3. window._dsDrawCardFrame   — duet card layout  (duet-sheet.js)
── */
function _drawFrame(ctx, W, H, t, view, motion, p1, p2, opts) {
  if (typeof opts.drawFn === 'function') {
    opts.drawFn(ctx, W, H, t);
    return;
  }
  if (view === 'convo') {
    if (typeof window._dsDrawConvoFrame === 'function')
      window._dsDrawConvoFrame(ctx, W, H, t, motion, p1, p2, opts);
  } else {
    if (typeof window._dsDrawCardFrame === 'function')
      window._dsDrawCardFrame(ctx, W, H, t, motion, p1, p2, opts);
  }
}

const GifExporter = {
  export: async function (view, p1, p2, opts) {
    opts = opts || {};
    const motion = opts.motion || 'fade-up';
    const dur    = opts.dur    || DEFAULT_DUR;
    const fps    = opts.fps    || DEFAULT_FPS;
    const W      = opts.width  || opts.size || DEFAULT_SIZE;
    const H      = opts.height || opts.size || DEFAULT_SIZE;
    const frames = Math.round(fps * Math.min(Math.max(dur, 1), 6));
    const delay  = Math.round(1000 / fps);

    const onStart    = typeof opts.onStart    === 'function' ? opts.onStart    : () => {};
    const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : () => {};
    const onDone     = typeof opts.onDone     === 'function' ? opts.onDone     : () => {};
    const onError    = typeof opts.onError    === 'function' ? opts.onError    : (e) => console.error('[GifExporter]', e);

    onStart();
    try {
      await document.fonts.ready;
      await _loadGifLib();

      const off = document.createElement('canvas');
      off.width = W; off.height = H;
      const oc  = off.getContext('2d');

      const gif = new GIF({
        workers: 2, quality: 6,
        width: W, height: H,
        workerScript: _resolveWorker(),
        dither: false,
      });

      for (let i = 0; i < frames; i++) {
        oc.clearRect(0, 0, W, H);
        _drawFrame(oc, W, H, i / frames, view, motion, p1, p2, opts);
        gif.addFrame(off, { copy: true, delay });
        onProgress((i / frames) * 0.75);
        await new Promise(r => setTimeout(r, 0));
      }

      await new Promise((resolve, reject) => {
        gif.on('progress', p => onProgress(0.75 + p * 0.25));
        gif.on('finished', blob => { onDone(blob); resolve(); });
        gif.on('error', err => { onError(err); reject(err); });
        gif.render();
      });
    } catch (err) { onError(err); }
  },
};

window.GifExporter = GifExporter;
})();
