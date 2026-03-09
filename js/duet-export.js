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

  /*
   * Per-frame inline style computer.
   * html2canvas cannot see CSS @keyframes — it always captures the element
   * at its static/initial state. So for export we skip CSS animations entirely
   * and instead compute opacity + transform inline for each frame index.
   *
   * t01  = frame progress 0..1 over the full animation cycle
   * delay = normalised delay offset (0..1) so elements stagger correctly
   */
  function _frameStyle(mot, t01, delayN) {
    // shift t01 by delay, wrap around 0..1
    let p = (t01 - delayN + 1) % 1;

    // ease in-out curve
    const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;

    // fade window: visible 20%–80% of cycle
    const inWindow  = p > 0.08 && p < 0.88;
    const fadeIn    = p < 0.25 ? p / 0.25 : 1;
    const fadeOut   = p > 0.75 ? 1 - (p - 0.75) / 0.13 : 1;
    const opacity   = inWindow ? Math.min(fadeIn, fadeOut) : Math.max(0, p < 0.08 ? p / 0.08 : 1 - (p - 0.88) / 0.12);

    if (mot === 'fade-up') {
      const oy = (1 - ease) * 20;
      return `opacity:${opacity.toFixed(3)};transform:translateY(${oy.toFixed(1)}px)`;
    }
    if (mot === 'slide-in') {
      const ox = (1 - ease) * -30;
      return `opacity:${opacity.toFixed(3)};transform:translateX(${ox.toFixed(1)}px)`;
    }
    if (mot === 'pulse') {
      const sc = 0.93 + 0.07 * Math.sin(p * Math.PI * 2);
      return `opacity:${(0.4 + 0.6 * Math.abs(Math.sin(p * Math.PI))).toFixed(3)};transform:scale(${sc.toFixed(3)})`;
    }
    if (mot === 'bounce') {
      const oy = (1 - ease) * -18;
      return `opacity:${opacity.toFixed(3)};transform:translateY(${oy.toFixed(1)}px)`;
    }
    if (mot === 'wave') {
      const oy = Math.sin(p * Math.PI * 2) * 10;
      return `opacity:${opacity.toFixed(3)};transform:translateY(${oy.toFixed(1)}px)`;
    }
    if (mot === 'glitch') {
      const isG = Math.floor(p * 9) % 3 === 0 && p < 0.85;
      const ox  = isG ? (Math.random() - 0.5) * 10 : 0;
      const fil = isG ? 'hue-rotate(90deg) brightness(1.4)' : 'none';
      return `opacity:1;transform:translateX(${ox.toFixed(1)}px);filter:${fil}`;
    }
    if (mot === 'shimmer') {
      // shimmer: background-position moves — express as translateX on a gradient overlay
      return `opacity:1`;
    }
    if (mot === 'typewriter') {
      const chars = Math.floor(p * 100);
      return `opacity:1;clip-path:inset(0 ${Math.max(0,100-chars)}% 0 0)`;
    }
    // default: fade-up
    const oy = (1 - ease) * 20;
    return `opacity:${opacity.toFixed(3)};transform:translateY(${oy.toFixed(1)}px)`;
  }

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
    const mot    = DS.motion;

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

      for (let i = 0; i < FRAMES; i++) {
        _setProgress(btn, Math.round((i / FRAMES) * 72), 'Frame ' + (i + 1) + '/' + FRAMES, color);

        // Build a still frame first, then patch in per-element inline styles
        const html = buildFn(W, H, t, true);

        // Parse into a temp element so we can surgically apply per-frame styles
        const el = _getOff();
        el.style.width  = W + 'px';
        el.style.height = H + 'px';
        el.innerHTML    = html;

        const t01 = i / FRAMES;

        // Target the animated elements by their data attributes or structure.
        // duet-sheet builds: left bubble, divider, right bubble each with
        // animation strings at delays 0.10, 0.30, 0.50 of the full cycle.
        // We replicate those same delays here.
        const delayMap = [0.10, 0.30, 0.50];
        const animated = el.querySelectorAll('[style*="align-self"]');
        animated.forEach((node, idx) => {
          const d = (delayMap[idx] || 0) / DS.dur; // normalise delay to 0..1
          const fs = _frameStyle(mot, t01, d);
          node.style.cssText += ';' + fs;
        });

        // Also animate lyric text nodes (first div inside each bubble card)
        el.querySelectorAll('[style*="line-height:1.42"], [style*="line-height:1.38"]').forEach((node, idx) => {
          const d = (idx === 0 ? 0.10 : 0.50) / DS.dur;
          const fs = _frameStyle(mot, t01, d);
          node.style.cssText += ';' + fs;
        });

        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

        const snap = await window.html2canvas(el, {
          width: W, height: H, scale: 1,
          backgroundColor: null, logging: false,
          useCORS: true, allowTaint: true, foreignObjectRendering: false,
        });
        gif.addFrame(snap, { copy: true, delay: DELAY });
        el.innerHTML = '';
        await new Promise(r => setTimeout(r, 4));
      }

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
