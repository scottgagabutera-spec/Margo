/* ============================================================
   MARGO — js/duet-export.js  v3.0
   Export strategy: render HTML frames via html2canvas.
   This matches EXACTLY what the user sees in the preview.

   Conversation view → _buildConvoHTML frames (animated per-frame via CSS anim offset trick)
   Card view         → _buildCardHTML frames

   Reads from duet-sheet.js via:
     window._DS             — state
     window._DSThemes       — theme map
     window._buildConvoHTML — HTML builder
     window._buildCardHTML  — HTML builder
     window._dsSwitchFormat — UI reset

   Exposes: window._duetExport.gif(plat, action)
            window._duetExport.poster(plat, action)

   Load order: duet-sheet.js THEN this file.
   ============================================================ */

(function () {

  /* ── wait for duet-sheet.js globals ── */
  function _ready(fn) {
    if (window._DS && window._DSThemes && window._buildConvoHTML) { fn(); return; }
    const iv = setInterval(() => {
      if (window._DS && window._DSThemes && window._buildConvoHTML) { clearInterval(iv); fn(); }
    }, 50);
  }

  /* ════════════════════════════════════════
     DEPENDENCIES
  ════════════════════════════════════════ */

  async function _loadH2C() {
    if (window.html2canvas) return;
    await new Promise((res, rej) => {
      const sc = document.createElement('script');
      sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      sc.onload = res; sc.onerror = rej;
      document.head.appendChild(sc);
    });
  }

  async function _loadGIF() {
    if (typeof GIF !== 'undefined') return;
    await new Promise((res, rej) => {
      const sc = document.createElement('script');
      sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js';
      sc.onload = res; sc.onerror = rej;
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
     OFFSCREEN DIV — reuse one element
  ════════════════════════════════════════ */

  let _offEl = null;
  function _getOff() {
    if (_offEl) return _offEl;
    _offEl = document.createElement('div');
    _offEl.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:9999;pointer-events:none;overflow:hidden;opacity:1';
    document.body.appendChild(_offEl);
    return _offEl;
  }

  /* ════════════════════════════════════════
     CAPTURE ONE HTML FRAME
  ════════════════════════════════════════ */

  async function _captureFrame(html, W, H) {
    const el = _getOff();
    el.style.width  = W + 'px';
    el.style.height = H + 'px';
    el.innerHTML = html;
    /* two rAF ticks so browser paints CSS animations */
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const snap = await window.html2canvas(el, {
      width: W, height: H, scale: 1,
      backgroundColor: null,
      logging: false,
      useCORS: true,
      allowTaint: true,
      foreignObjectRendering: false,
    });
    return snap;
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
     WHICH VIEW IS ACTIVE
  ════════════════════════════════════════ */

  function _isCardView() {
    const cardEl = document.getElementById('dsViewCard');
    return cardEl && cardEl.style.display !== 'none';
  }

  /* ════════════════════════════════════════
     GIF EXPORT
     Strategy: render FRAMES html snapshots at staggered animation-delay offsets.
     We inject a negative animation-delay into the HTML so each frame appears
     at a different point in the CSS animation cycle — giving us real motion.
  ════════════════════════════════════════ */

  async function exportGif(plat, action) {
    const DS     = window._DS;
    const themes = window._DSThemes;

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
    const isCard = _isCardView();
    const buildFn = isCard ? window._buildCardHTML : window._buildConvoHTML;

    if (dlBtn) dlBtn.disabled = true;
    if (shBtn) shBtn.disabled = true;
    _setProgress(btn, 0, 'Starting…', color);

    try {
      await _preloadFonts(DS);
      await _loadH2C();
      await _loadGIF();

      const theme = themes[DS.bgColor] || themes['#07060E'];

      const gif = new GIF({
        workers:      4,
        quality:      1,
        width:        W,
        height:       H,
        workerScript: '/js/gif.worker.js',
        dither:       false,
      });

      for (let i = 0; i < FRAMES; i++) {
        _setProgress(btn, Math.round((i / FRAMES) * 72), 'Frame ' + (i + 1) + '/' + FRAMES, color);

        /* Offset the CSS animation to this frame's time position.
           We do this by injecting a negative animation-delay override
           so the browser renders the animation at exactly frame i/FRAMES
           through the cycle. still=false keeps animations active. */
        const frameFrac = i / FRAMES;
        const negDelay  = -(frameFrac * DS.dur);

        let html = buildFn(W, H, theme, false);

        /* Inject per-frame animation-delay override into the HTML's style block.
           This freezes CSS animations at the exact frame position we want. */
        html = html.replace(
          '</style>',
          `
          /* frame ${i} override */
          [style*="animation"] {
            animation-play-state: paused !important;
            animation-delay: ${negDelay}s !important;
          }
          * { animation-play-state: paused !important; }
          </style>`
        );

        const snap = await _captureFrame(html, W, H);
        gif.addFrame(snap, { copy: true, delay: DELAY });
        await new Promise(r => setTimeout(r, 0));
      }

      /* clean up offscreen div */
      if (_offEl) _offEl.innerHTML = '';

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
            await navigator.share({ files: [new File([blob], fname, { type: 'image/gif' })], title: 'Margo Duet', text: 'trymargo.com' });
          } catch (_) { _dl(blob, fname); }
        } else {
          _dl(blob, fname);
        }
        if (dlBtn) { dlBtn.disabled = false; dlBtn.innerHTML = origDl; }
        if (shBtn) { shBtn.disabled = false; shBtn.innerHTML = origSh; }
        if (window._dsSwitchFormat) window._dsSwitchFormat(DS.format);
      });

      gif.render();

    } catch (err) {
      console.error('[duet-export] GIF error:', err);
      if (_offEl) _offEl.innerHTML = '';
      if (dlBtn) { dlBtn.disabled = false; dlBtn.innerHTML = origDl; }
      if (shBtn) { shBtn.disabled = false; shBtn.innerHTML = origSh; }
      if (window._dsSwitchFormat) window._dsSwitchFormat(DS.format);
    }
  }

  /* ════════════════════════════════════════
     POSTER EXPORT
     Single frame at t=0.5 (mid-animation = fully visible).
     still=true disables all CSS animations so nothing is mid-fade.
  ════════════════════════════════════════ */

  async function exportPoster(plat, action) {
    const DS     = window._DS;
    const themes = window._DSThemes;

    const dlBtn  = document.getElementById('dsBtnDownload');
    const shBtn  = document.getElementById('dsBtnShare');
    const btn    = action === 'download' ? dlBtn : shBtn;
    const origDl = dlBtn ? dlBtn.innerHTML : '';
    const origSh = shBtn ? shBtn.innerHTML : '';

    const W     = plat.w;
    const H     = plat.h;
    const color = '#E8C547';
    const isCard = _isCardView();
    const buildFn = isCard ? window._buildCardHTML : window._buildConvoHTML;

    if (dlBtn) dlBtn.disabled = true;
    if (shBtn) shBtn.disabled = true;
    _setProgress(btn, 0, 'Preparing…', color);

    try {
      await _preloadFonts(DS);
      await _loadH2C();
      _setProgress(btn, 30, 'Rendering…', color);

      const theme = themes[DS.bgColor] || themes['#07060E'];

      /* still=true — no animations, everything fully visible */
      const html = buildFn(W, H, theme, true);
      const snap = await _captureFrame(html, W, H);

      if (_offEl) _offEl.innerHTML = '';
      _setProgress(btn, 85, 'Saving…', color);

      const song  = ((DS.parentPost && (DS.parentPost.knowledge && DS.parentPost.knowledge.song || DS.parentPost.song)) || 'duet')
        .replace(/\s+/g, '-').toLowerCase();
      const fname = 'margo-poster-' + song + '-' + plat.id + '.png';

      snap.toBlob(async blob => {
        if (!blob) return;
        _setProgress(btn, 100, '✓ Done!', color);
        if (action === 'share' && navigator.share) {
          try {
            await navigator.share({ files: [new File([blob], fname, { type: 'image/png' })], title: 'Margo Poster', text: 'trymargo.com' });
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
      if (_offEl) _offEl.innerHTML = '';
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
