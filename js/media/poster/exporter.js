/* ============================================================
   MARGO — js/media/poster/exporter.js  v2.1
   FIXES v2.1:
   • opts.drawFn(ctx, W, H) override — caller supplies its own
     renderer (e.g. share-sheet single-post renderer, poster-studio).
     Fixes blank feed poster exports which had p2=null causing
     _dsDrawCardFrame to bail immediately.
   • All v2.0 fixes preserved (width/height from PlatformPicker).
   ============================================================ */

(function () {
'use strict';

const CONVO_W = 1080;
const CONVO_H = 1350;
const CARD_W  = 1080;
const CARD_H  = 1080;
const QUALITY = 0.96;

function _download(blob, filename) {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}

/* ── Draw poster ──
   Priority:
   1. opts.drawFn(ctx, W, H)     — caller-supplied renderer
   2. window._dsDrawConvoStatic  — duet convo layout (duet-sheet.js)
   3. window._dsDrawCardFrame    — duet card layout  (duet-sheet.js)
── */
function _drawPoster(ctx, W, H, view, p1, p2, opts) {
  if (typeof opts.drawFn === 'function') {
    opts.drawFn(ctx, W, H);
    return;
  }
  if (view === 'convo') {
    if (typeof window._dsDrawConvoStatic === 'function')
      window._dsDrawConvoStatic(ctx, W, H, p1, p2, opts);
  } else {
    if (typeof window._dsDrawCardFrame === 'function')
      window._dsDrawCardFrame(ctx, W, H, 1.0, (opts && opts.motion) || 'fade-up', p1, p2, opts);
  }
}

const PosterExporter = {
  export: async function (view, p1, p2, opts) {
    opts = opts || {};
    const W = opts.width  || (view === 'convo' ? CONVO_W : CARD_W);
    const H = opts.height || (view === 'convo' ? CONVO_H : CARD_H);
    const quality = opts.quality || QUALITY;

    const onStart = typeof opts.onStart === 'function' ? opts.onStart : () => {};
    const onDone  = typeof opts.onDone  === 'function' ? opts.onDone  : () => {};
    const onError = typeof opts.onError === 'function' ? opts.onError : (e) => console.error('[PosterExporter]', e);

    onStart();
    try {
      await document.fonts.ready;

      const off = document.createElement('canvas');
      off.width = W; off.height = H;
      const ctx = off.getContext('2d');

      _drawPoster(ctx, W, H, view, p1, p2, opts);

      await new Promise((resolve, reject) => {
        off.toBlob(blob => {
          if (!blob) { const err = new Error('toBlob returned null'); onError(err); reject(err); return; }

          onDone(blob); resolve();
        }, 'image/png', quality);
      });
    } catch (err) { onError(err); }
  },
};

window.PosterExporter = PosterExporter;
})();
