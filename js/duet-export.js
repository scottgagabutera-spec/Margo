/* ============================================================
   MARGO — js/duet-export.js
   Duet export engine — GIF and Poster.

   Depends on duet-sheet.js being loaded first.
   Reads:  window._DS        (the DS state object)
           window._DSThemes  (the DS_THEMES map)
           window._buildConvoHTML(W,H,t,mode)
           window._buildCardHTML(W,H,t,mode)

   Exposes nothing to window itself — duet-sheet.js wires
   the Download / Share buttons to _dsExportGif / _dsExportPoster
   via window._duetExport.gif and window._duetExport.poster.
   ============================================================ */

(function () {

  /* ── wait for duet-sheet.js to be ready ── */
  function _ready(fn) {
    if (window._DS && window._buildConvoHTML) { fn(); return; }
    document.addEventListener('DOMContentLoaded', function check() {
      if (window._DS && window._buildConvoHTML) { fn(); }
      else setTimeout(check, 50);
    });
  }

  /* ════════════════════════════════════════
     DEPENDENCIES — loaded on first export
  ════════════════════════════════════════ */

  async function _loadH2C() {
    if (window.html2canvas) return;
    await new Promise((res, rej) => {
      const sc = document.createElement('script');
      sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      sc.onload = res;
      sc.onerror = rej;
      document.head.appendChild(sc);
    });
  }

  async function _loadGIF() {
    if (typeof GIF !== 'undefined') return;
    await new Promise((res, rej) => {
      const sc = document.createElement('script');
      sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js';
      sc.onload = res;
      sc.onerror = rej;
      document.head.appendChild(sc);
    });
  }

  async function _preloadFonts(DS) {
    await document.fonts.ready;
    await Promise.all([
      document.fonts.load('800 1em Syne'),
      document.fonts.load('700 1em "Space Mono"'),
      document.fonts.load('400 1em "Space Mono"'),
      document.fonts.load('700 1em "DM Sans"'),
      document.fonts.load('400 1em "DM Sans"'),
      document.fonts.load('600 1em "' + DS.fontFamily + '"'),
      document.fonts.load('italic 600 1em "' + DS.fontFamily + '"'),
    ].map(p => p.catch(() => {})));
  }

  /* ════════════════════════════════════════
     OFFSCREEN CAPTURE — html2canvas
  ════════════════════════════════════════ */

  let _offEl = null;

  function _getOff() {
    if (_offEl) return _offEl;
    _offEl = document.createElement('div');
    _offEl.style.cssText = 'position:fixed;left:0;top:0;z-index:9999;pointer-events:none;overflow:hidden;opacity:0';
    document.body.appendChild(_offEl);
    return _offEl;
  }

  async function _captureFrame(html, W, H) {
    const el = _getOff();
    el.style.width  = W + 'px';
    el.style.height = H + 'px';
    el.innerHTML = html;
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const snap = await window.html2canvas(el, {
      width: W, height: H, scale: 1,
      backgroundColor: null, logging: false,
      useCORS: true, allowTaint: true, foreignObjectRendering: false,
    });
    el.innerHTML = '';
    return snap;
  }

  /* ════════════════════════════════════════
     PROGRESS HELPER
  ════════════════════════════════════════ */

  function _setProgress(btn, pct, label, color) {
    if (!btn) return;
    const icon = btn.querySelector('.ds-export-icon');
    const lbl  = btn.querySelector('span:last-child');
    if (icon) icon.textContent = pct >= 100 ? '✓' : '◎';
    if (lbl)  lbl.textContent  = label;
    let bar = btn.querySelector('.ds-progress-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'ds-progress-bar';
      btn.appendChild(bar);
    }
    bar.style.width      = pct + '%';
    bar.style.background = color || '#00E5FF';
  }

  /* ════════════════════════════════════════
     DOWNLOAD TRIGGER
  ════════════════════════════════════════ */

  function _dl(blob, fname) {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url; a.download = fname; a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);
  }

  /* ════════════════════════════════════════
     VIEW HELPER — which layout is showing
  ════════════════════════════════════════ */

  function _isConvoView() {
    const cardEl = document.getElementById('dsViewCard');
    return !cardEl || cardEl.style.display === 'none';
  }

  /* ════════════════════════════════════════
     GIF EXPORT
  ════════════════════════════════════════ */

  async function exportGif(plat, action) {
    const DS       = window._DS;
    const themes   = window._DSThemes;
    const buildFn  = _isConvoView() ? window._buildConvoHTML : window._buildCardHTML;

    const dlBtn  = document.getElementById('dsBtnDownload');
    const shBtn  = document.getElementById('dsBtnShare');
    const btn    = action === 'download' ? dlBtn : shBtn;
    const origDl = dlBtn ? dlBtn.innerHTML : '';
    const origSh = shBtn ? shBtn.innerHTML : '';

    const W      = plat.w;
    const H      = plat.h;
    const FRAMES = 24;
    const DELAY  = Math.round((DS.dur * 1000) / FRAMES);
    const color  = '#00E5FF';

    if (dlBtn) dlBtn.disabled = true;
    if (shBtn) shBtn.disabled = true;
    _setProgress(btn, 0, 'Starting…', color);

    try {
      await _preloadFonts(DS);
      await _loadH2C();
      await _loadGIF();

      const t = themes[DS.bgColor] || themes['#07060E'];

      const gif = new GIF({
        workers: 4,
        quality: 2,
        width:  W,
        height: H,
        workerScript: 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js',
        dither: 'FloydSteinberg',
        globalPalette: false,
      });

      // Inject the animated HTML once into the offscreen div and let it run.
      // Capture a frame every DELAY ms so CSS animations actually progress between frames.
      const el = _getOff();
      el.style.width  = W + 'px';
      el.style.height = H + 'px';
      el.innerHTML = buildFn(W, H, t, false);  // false = animated (not still)
      // Wait one frame for the browser to paint before starting captures
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

      for (let i = 0; i < FRAMES; i++) {
        _setProgress(btn, Math.round((i / FRAMES) * 72), 'Frame ' + (i + 1) + '/' + FRAMES, color);
        const snap = await window.html2canvas(el, {
          width: W, height: H, scale: 1,
          backgroundColor: null, logging: false,
          useCORS: true, allowTaint: true, foreignObjectRendering: false,
        });
        gif.addFrame(snap, { copy: true, delay: DELAY });
        // Wait DELAY ms so the CSS animation moves forward before next capture
        await new Promise(r => setTimeout(r, DELAY));
      }
      el.innerHTML = '';

      gif.on('progress', p =>
        _setProgress(btn, Math.round(72 + p * 26), 'Encoding ' + Math.round(72 + p * 26) + '%', color)
      );

      gif.on('finished', async blob => {
        _setProgress(btn, 100, '✓ Done!', color);

        const song  = ((DS.parentPost && (DS.parentPost.knowledge && DS.parentPost.knowledge.song || DS.parentPost.song)) || 'duet')
          .replace(/\s+/g, '-').toLowerCase();
        const fname = 'margo-duet-' + song + '-' + plat.id + '.gif';

        if (action === 'share' && navigator.share) {
          try {
            await navigator.share({
              files: [new File([blob], fname, { type: 'image/gif' })],
              title: 'Margo Duet',
              text:  'trymargo.com',
            });
          } catch (_) { _dl(blob, fname); }
        } else {
          _dl(blob, fname);
        }

        if (dlBtn) { dlBtn.disabled = false; dlBtn.innerHTML = origDl; }
        if (shBtn) { shBtn.disabled = false; shBtn.innerHTML = origSh; }
        /* let duet-sheet restore button styles */
        if (window._dsSwitchFormat) window._dsSwitchFormat(DS.format);
      });

      gif.render();

    } catch (err) {
      console.error('[duet-export] GIF error:', err);
      if (dlBtn) { dlBtn.disabled = false; dlBtn.innerHTML = origDl; }
      if (shBtn) { shBtn.disabled = false; shBtn.innerHTML = origSh; }
      if (window._dsSwitchFormat) window._dsSwitchFormat(DS.format);
    }
  }

  /* ════════════════════════════════════════
     POSTER EXPORT
  ════════════════════════════════════════ */

  async function exportPoster(plat, action) {
    const DS      = window._DS;
    const themes  = window._DSThemes;
    const buildFn = _isConvoView() ? window._buildConvoHTML : window._buildCardHTML;

    const dlBtn  = document.getElementById('dsBtnDownload');
    const shBtn  = document.getElementById('dsBtnShare');
    const btn    = action === 'download' ? dlBtn : shBtn;
    const origDl = dlBtn ? dlBtn.innerHTML : '';
    const origSh = shBtn ? shBtn.innerHTML : '';

    const W     = plat.w;
    const H     = plat.h;
    const color = '#E8C547';

    if (dlBtn) dlBtn.disabled = true;
    if (shBtn) shBtn.disabled = true;
    _setProgress(btn, 0, 'Preparing…', color);

    try {
      await _preloadFonts(DS);
      await _loadH2C();

      _setProgress(btn, 30, 'Rendering…', color);

      const t    = themes[DS.bgColor] || themes['#07060E'];
      const html = buildFn(W, H, t, true);
      const snap = await _captureFrame(html, W, H);

      _setProgress(btn, 85, 'Saving…', color);

      const song  = ((DS.parentPost && (DS.parentPost.knowledge && DS.parentPost.knowledge.song || DS.parentPost.song)) || 'duet')
        .replace(/\s+/g, '-').toLowerCase();
      const fname = 'margo-poster-' + song + '-' + plat.id + '.png';

      snap.toBlob(async blob => {
        if (!blob) return;
        _setProgress(btn, 100, '✓ Done!', color);

        if (action === 'share' && navigator.share) {
          try {
            await navigator.share({
              files: [new File([blob], fname, { type: 'image/png' })],
              title: 'Margo Poster',
              text:  'trymargo.com',
            });
          } catch (_) { _dl(blob, fname); }
        } else {
          _dl(blob, fname);
        }

        if (dlBtn) { dlBtn.disabled = false; dlBtn.innerHTML = origDl; }
        if (shBtn) { shBtn.disabled = false; shBtn.innerHTML = origSh; }
        if (window._dsSwitchFormat) window._dsSwitchFormat(DS.format);

      }, 'image/png', 0.95);

    } catch (err) {
      console.error('[duet-export] Poster error:', err);
      if (dlBtn) { dlBtn.disabled = false; dlBtn.innerHTML = origDl; }
      if (shBtn) { shBtn.disabled = false; shBtn.innerHTML = origSh; }
      if (window._dsSwitchFormat) window._dsSwitchFormat(DS.format);
    }
  }

  /* ════════════════════════════════════════
     PUBLIC API
  ════════════════════════════════════════ */

  _ready(function () {
    window._duetExport = {
      gif:    exportGif,
      poster: exportPoster,
    };
  });

})();
